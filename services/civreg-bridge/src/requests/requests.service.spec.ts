import { AuditService } from '../audit/audit.service'
import { RequestEntity } from '../database/entities/request.entity'
import { RequestsService } from './requests.service'

describe('RequestsService idempotency', () => {
  const existing: RequestEntity = {
    id: '11111111-1111-1111-1111-111111111111',
    idempotencyKey: 'evt-1:act-1',
    eventId: 'evt-1',
    actionId: 'act-1',
    kind: 'birth_nin',
    payload: {},
    status: 'pending',
    createdAt: new Date('2026-10-30T21:00:00.000Z'),
    updatedAt: new Date('2026-10-30T21:00:00.000Z')
  }

  it('returns the stored row and does not write when the key exists', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn(),
      save: jest.fn()
    }
    const dataSource = {
      transaction: jest.fn(async (cb: (m: typeof manager) => unknown) => cb(manager))
    }
    const audit = { append: jest.fn() }
    const service = new RequestsService(
      {} as never,
      dataSource as never,
      audit as unknown as AuditService
    )

    const result = await service.persist({
      eventId: 'evt-1',
      actionId: 'act-1',
      kind: 'birth_nin'
    })

    expect(result.created).toBe(false)
    expect(result.request.id).toBe(existing.id)
    expect(manager.save).not.toHaveBeenCalled()
    expect(audit.append).not.toHaveBeenCalled()
  })

  it('inserts a row and appends audit on the first write', async () => {
    const saved: RequestEntity = {
      ...existing,
      id: '22222222-2222-2222-2222-222222222222'
    }
    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((_cls: unknown, value: RequestEntity) => value),
      save: jest.fn().mockResolvedValue(saved)
    }
    const dataSource = {
      transaction: jest.fn(async (cb: (m: typeof manager) => unknown) => cb(manager))
    }
    const audit = { append: jest.fn().mockResolvedValue({}) }
    const service = new RequestsService(
      {} as never,
      dataSource as never,
      audit as unknown as AuditService
    )

    const result = await service.persist({
      eventId: 'evt-1',
      actionId: 'act-1',
      kind: 'birth_nin',
      actorId: 'k.mweene'
    })

    expect(result.created).toBe(true)
    expect(result.request.id).toBe(saved.id)
    expect(manager.save).toHaveBeenCalledTimes(1)
    expect(audit.append).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        entityType: 'request',
        entityId: saved.id,
        action: 'persist',
        actorId: 'k.mweene'
      })
    )
  })
})
