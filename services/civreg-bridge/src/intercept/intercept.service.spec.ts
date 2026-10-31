import { InterceptService } from './intercept.service'
import { RequestsService } from '../requests/requests.service'
import * as stub from '../stub/stub-client'
import * as token from '../opencrvs/token'
import * as events from '../opencrvs/events-client'
import * as kafka from '../kafka/producer'
import { DeceasedService } from '../deceased/deceased.service'
import { RequestEntity } from '../database/entities/request.entity'

jest.mock('../stub/stub-client', () => ({
  requestNin: jest.fn(),
  getNin: jest.fn(),
  postDeceasedStatus: jest.fn(),
  withRetries: jest.fn(async (_a: number, _d: number, fn: () => Promise<unknown>) =>
    fn()
  )
}))

jest.mock('../opencrvs/token', () => ({
  fetchSystemToken: jest.fn()
}))

jest.mock('../opencrvs/events-client', () => ({
  acceptRegister: jest.fn(),
  rejectRegister: jest.fn()
}))

jest.mock('../kafka/producer', () => ({
  getSharedProducer: jest.fn(),
  publishBirthRegistered: jest.fn()
}))

describe('InterceptService.resolve', () => {
  const row: RequestEntity = {
    id: 'req-1',
    idempotencyKey: 'evt-1:act-1',
    eventId: 'evt-1',
    actionId: 'act-1',
    kind: 'birth_nin',
    payload: { eventType: 'birth', action: { type: 'REGISTER' } },
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const requests = {
    getById: jest.fn(),
    markStatus: jest.fn(),
    persist: jest.fn()
  }

  const deceased = {
    openFromRegister: jest.fn()
  }

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://civreg:civreg@localhost:5433/civreg'
    process.env.OPENCRVS_CLIENT_ID = 'demo-id'
    process.env.OPENCRVS_CLIENT_SECRET = 'demo-secret'
    process.env.STUB_RETRY_ATTEMPTS = '1'
    jest.clearAllMocks()
    requests.getById.mockResolvedValue({ ...row })
    ;(token.fetchSystemToken as jest.Mock).mockResolvedValue('system-token')
    ;(stub.requestNin as jest.Mock).mockResolvedValue({
      requestId: 'nin-1',
      status: 'pending',
      nin: null
    })
    ;(stub.getNin as jest.Mock).mockResolvedValue({
      requestId: 'nin-1',
      status: 'issued',
      nin: '00011111111'
    })
    ;(kafka.getSharedProducer as jest.Mock).mockResolvedValue({
      connect: jest.fn(),
      send: jest.fn(),
      disconnect: jest.fn()
    })
    ;(kafka.publishBirthRegistered as jest.Mock).mockResolvedValue(undefined)
  })

  it('accepts with the system-client token after the stub issues a NIN', async () => {
    const service = new InterceptService(
      requests as unknown as RequestsService,
      deceased as unknown as DeceasedService
    )
    await expect(service.resolve('req-1')).resolves.toBe('accepted')
    expect(token.fetchSystemToken).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'demo-id' })
    )
    expect(events.acceptRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'system-token',
        eventId: 'evt-1',
        actionId: 'act-1'
      })
    )
    expect(events.rejectRegister).not.toHaveBeenCalled()
    expect(kafka.publishBirthRegistered).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'evt-1',
        actionId: 'act-1',
        ninRequestId: 'nin-1',
        nin: '00011111111'
      }),
      expect.anything()
    )
    expect(requests.markStatus).toHaveBeenCalledWith('req-1', 'accepted')
  })

  it('rejects with the system-client token when the stub fails', async () => {
    ;(stub.requestNin as jest.Mock).mockRejectedValue(new Error('503'))
    const service = new InterceptService(
      requests as unknown as RequestsService,
      deceased as unknown as DeceasedService
    )
    await expect(service.resolve('req-1')).resolves.toBe('rejected')
    expect(events.rejectRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'system-token',
        eventId: 'evt-1',
        actionId: 'act-1'
      })
    )
    expect(events.acceptRegister).not.toHaveBeenCalled()
    expect(kafka.publishBirthRegistered).not.toHaveBeenCalled()
    expect(requests.markStatus).toHaveBeenCalledWith('req-1', 'rejected')
  })

  it('opens maker-checker for death and does not auto-accept', async () => {
    requests.persist.mockResolvedValue({
      created: true,
      request: { ...row, kind: 'death_register' }
    })
    deceased.openFromRegister.mockResolvedValue({ id: 'death-1' })
    const service = new InterceptService(
      requests as unknown as RequestsService,
      deceased as unknown as DeceasedService
    )
    await service.intercept({
      eventId: 'evt-1',
      actionId: 'act-1',
      kind: 'death_register',
      actorId: 'maker-1'
    })
    expect(deceased.openFromRegister).toHaveBeenCalled()
    expect(events.acceptRegister).not.toHaveBeenCalled()
  })

  it('does not reuse a user token', async () => {
    const service = new InterceptService(
      requests as unknown as RequestsService,
      deceased as unknown as DeceasedService
    )
    await service.resolve('req-1')
    const tokenArg = (events.acceptRegister as jest.Mock).mock.calls[0][0]
      .token as string
    expect(tokenArg).toBe('system-token')
    expect(tokenArg).not.toBe('must-not-be-used-for-accept')
  })
})
