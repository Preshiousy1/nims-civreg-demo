import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { DeceasedService } from './deceased.service'
import * as stub from '../stub/stub-client'
import * as events from '../opencrvs/events-client'
import * as token from '../opencrvs/token'
import {
  canonicalPayload,
  computeRowHash,
  GENESIS_HASH,
  verifyChain
} from '../audit/audit-chain'

jest.mock('../stub/stub-client', () => ({
  postDeceasedStatus: jest.fn(),
  postDeceasedReversal: jest.fn(),
  withRetries: jest.fn(
    async (_a: number, _d: number, fn: () => Promise<unknown>) => fn()
  )
}))

jest.mock('../opencrvs/events-client', () => ({
  acceptRegister: jest.fn(),
  rejectRegister: jest.fn(),
  generateRegistrationNumber: jest.fn(() => 'DEATHREG00001')
}))

jest.mock('../opencrvs/token', () => ({
  fetchSystemToken: jest.fn()
}))

const pending = {
  id: 'death-1',
  requestId: 'req-1',
  eventId: 'evt-1',
  actionId: 'act-1',
  makerId: 'maker-1',
  makerStaffId: null as string | null,
  status: 'PENDING_APPROVAL' as const,
  nin: '00012345678',
  stubDone: false,
  coreDone: false,
  reason: null,
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('DeceasedService', () => {
  const rows = { findOne: jest.fn(), update: jest.fn() }
  const dataSource = {
    transaction: jest.fn(),
    getRepository: jest.fn()
  }
  const audit = { append: jest.fn() }
  const outbox = { enqueueAudit: jest.fn(), drain: jest.fn() }

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://civreg:civreg@localhost:5433/civreg'
    process.env.OPENCRVS_CLIENT_ID = 'demo-id'
    process.env.OPENCRVS_CLIENT_SECRET = 'demo-secret'
    process.env.STUB_RETRY_ATTEMPTS = '1'
    jest.clearAllMocks()
    ;(token.fetchSystemToken as jest.Mock).mockResolvedValue('system-token')
    dataSource.transaction.mockImplementation(async (fn: (m: unknown) => unknown) =>
      fn({
        findOne: jest.fn(),
        findOneByOrFail: jest.fn().mockResolvedValue({ ...pending }),
        create: jest.fn((_e: unknown, data: object) => data),
        save: jest.fn(async (row: object) => ({ ...pending, ...row }))
      })
    )
    rows.update.mockResolvedValue(undefined)
  })

  function service(): DeceasedService {
    return new DeceasedService(
      rows as never,
      dataSource as never,
      audit as never,
      outbox as never
    )
  }

  it('refuses same-user approval', async () => {
    rows.findOne.mockResolvedValue({ ...pending })
    await expect(
      service().approve('death-1', {
        sub: 'maker-1',
        role: 'nimc_civreg_checker'
      })
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(stub.postDeceasedStatus).not.toHaveBeenCalled()
  })

  it('refuses same staff id even when JWT sub differs', async () => {
    rows.findOne.mockResolvedValue({
      ...pending,
      makerStaffId: 'staff-ada'
    })
    await expect(
      service().approve('death-1', {
        sub: 'keycloak-other',
        role: 'nimc_civreg_checker',
        staffId: 'staff-ada'
      })
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('replays an already-approved request without calling the stub again', async () => {
    rows.findOne.mockResolvedValue({ ...pending, status: 'APPROVED' })
    const result = await service().approve('death-1', {
      sub: 'checker-9',
      role: 'nimc_civreg_checker'
    })
    expect(result.status).toBe('APPROVED')
    expect(stub.postDeceasedStatus).not.toHaveBeenCalled()
    expect(events.acceptRegister).not.toHaveBeenCalled()
  })

  it('skips the stub call when stubDone is already true', async () => {
    rows.findOne.mockResolvedValue({ ...pending, stubDone: true })
    dataSource.transaction.mockImplementation(async (fn: (m: unknown) => unknown) =>
      fn({
        findOneByOrFail: jest.fn().mockResolvedValue({
          ...pending,
          stubDone: true,
          coreDone: true,
          status: 'PENDING_APPROVAL'
        }),
        save: jest.fn(async (row: { status: string }) => ({
          ...pending,
          ...row,
          status: 'APPROVED'
        }))
      })
    )
    audit.append.mockResolvedValue({ sequence: '1', rowHash: 'aa' })
    await service().approve('death-1', {
      sub: 'checker-9',
      role: 'nimc_civreg_checker'
    })
    expect(stub.postDeceasedStatus).not.toHaveBeenCalled()
    expect(events.acceptRegister).toHaveBeenCalled()
  })

  it('compensates with reverse when core accept fails after stub', async () => {
    rows.findOne.mockResolvedValue({ ...pending })
    ;(events.acceptRegister as jest.Mock).mockRejectedValue(new Error('core down'))
    await expect(
      service().approve('death-1', {
        sub: 'checker-9',
        role: 'nimc_civreg_checker'
      })
    ).rejects.toThrow(/core down/)
    expect(stub.postDeceasedStatus).toHaveBeenCalled()
    expect(stub.postDeceasedReversal).toHaveBeenCalled()
    expect(rows.update).toHaveBeenCalledWith(
      { id: 'death-1' },
      { stubDone: false }
    )
  })

  it('refuses openFromRegister without a deceased NIN', async () => {
    rows.findOne.mockResolvedValue(null)
    await expect(
      service().openFromRegister({
        request: {
          id: 'req-1',
          eventId: 'evt-1',
          actionId: 'act-1'
        } as never,
        makerId: 'maker-1',
        payload: { action: { declaration: {} } }
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('refuses reversal without a reason', async () => {
    rows.findOne.mockResolvedValue({ ...pending, status: 'APPROVED' })
    await expect(
      service().reverse(
        'death-1',
        { sub: 'checker-9', role: 'nimc_civreg_checker' },
        ''
      )
    ).rejects.toThrow(/reason/)
    expect(stub.postDeceasedReversal).not.toHaveBeenCalled()
  })

  it('GET audit verifies the full ledger, not only the entity slice', async () => {
    rows.findOne.mockResolvedValue({ ...pending, status: 'REVERSED' })
    const genesisCreatedAt = new Date('2026-10-31T08:00:00.000Z')
    const genesisPayload = {}
    const genesis = {
      prevHash: GENESIS_HASH,
      sequence: 1,
      entityType: 'request',
      entityId: 'r1',
      action: 'persist',
      actorId: 'system',
      payload: genesisPayload,
      createdAt: genesisCreatedAt,
      rowHash: computeRowHash({
        prevHash: GENESIS_HASH,
        sequence: 1,
        entityType: 'request',
        entityId: 'r1',
        action: 'persist',
        actorId: 'system',
        payload: canonicalPayload(genesisPayload),
        createdAt: genesisCreatedAt.toISOString()
      })
    }
    const entityCreatedAt = new Date('2026-10-31T08:01:00.000Z')
    const entityPayload = { eventId: 'evt-1' }
    const entityRow = {
      prevHash: genesis.rowHash,
      sequence: 2,
      entityType: 'deceased_status_request',
      entityId: 'death-1',
      action: 'open',
      actorId: 'maker-1',
      payload: entityPayload,
      createdAt: entityCreatedAt,
      rowHash: computeRowHash({
        prevHash: genesis.rowHash,
        sequence: 2,
        entityType: 'deceased_status_request',
        entityId: 'death-1',
        action: 'open',
        actorId: 'maker-1',
        payload: canonicalPayload(entityPayload),
        createdAt: entityCreatedAt.toISOString()
      })
    }
    dataSource.getRepository.mockReturnValue({
      find: jest
        .fn()
        .mockResolvedValueOnce([entityRow])
        .mockResolvedValueOnce([genesis, entityRow])
    })
    const result = await service().getAudit('death-1')
    expect(result.chain.ok).toBe(true)
    expect(
      verifyChain([
        {
          ...genesis,
          payload: canonicalPayload(genesis.payload),
          createdAt: genesis.createdAt.toISOString()
        },
        {
          ...entityRow,
          payload: canonicalPayload(entityRow.payload),
          createdAt: entityRow.createdAt.toISOString()
        }
      ]).ok
    ).toBe(true)
  })
})
