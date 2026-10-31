import { ForbiddenException } from '@nestjs/common'
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
  rejectRegister: jest.fn()
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
  status: 'PENDING_APPROVAL' as const,
  nin: '00000000000',
  reason: null,
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('DeceasedService', () => {
  const rows = { findOne: jest.fn() }
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
      fn({})
    )
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
    const genesisInput = {
      prevHash: GENESIS_HASH,
      sequence: 1,
      entityType: 'request',
      entityId: 'r1',
      action: 'persist',
      actorId: 'system',
      payload: canonicalPayload({}),
      createdAt: '2026-10-31T08:00:00.000Z'
    }
    const genesis = {
      ...genesisInput,
      rowHash: computeRowHash(genesisInput),
      payload: {},
      createdAt: new Date(genesisInput.createdAt)
    }
    const openInput = {
      prevHash: genesis.rowHash,
      sequence: 2,
      entityType: 'deceased_status_request',
      entityId: 'death-1',
      action: 'open',
      actorId: 'maker-1',
      payload: canonicalPayload({ eventId: 'evt-1' }),
      createdAt: '2026-10-31T08:00:01.000Z'
    }
    const open = {
      ...openInput,
      rowHash: computeRowHash(openInput),
      payload: { eventId: 'evt-1' },
      createdAt: new Date(openInput.createdAt)
    }
    const find = jest
      .fn()
      .mockResolvedValueOnce([open])
      .mockResolvedValueOnce([genesis, open])
    dataSource.getRepository.mockReturnValue({ find })
    const result = await service().getAudit('death-1')
    expect(result.chain).toEqual({ ok: true })
    expect(result.rows).toEqual([open])
  })
})

describe('audit chain on deceased transitions', () => {
  it('detects a tampered payload in the chain', () => {
    const input = {
      prevHash: GENESIS_HASH,
      sequence: 1,
      entityType: 'deceased_status_request',
      entityId: 'death-1',
      action: 'approve',
      actorId: 'checker-9',
      payload: canonicalPayload({ status: 'APPROVED' }),
      createdAt: '2026-10-31T08:00:00.000Z'
    }
    const honest = { ...input, rowHash: computeRowHash(input) }
    const tampered = {
      ...honest,
      payload: canonicalPayload({ status: 'REJECTED' })
    }
    const check = verifyChain([tampered])
    expect(check.ok).toBe(false)
    if (!check.ok) {
      expect(check.reason).toMatch(/rowHash mismatch/)
    }
  })
})
