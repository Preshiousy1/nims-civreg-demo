import { OutboxService } from './outbox.service'
import * as kafka from '../kafka/producer'

jest.mock('../kafka/producer', () => ({
  AUDIT_TOPIC: 'civreg.audit.v1',
  REGISTRY_TOPIC: 'civreg.registry.events.v1',
  buildAuditAppendedEnvelope: jest.fn((input: { outboxId: string }) => ({
    id: input.outboxId
  })),
  buildBirthRegisteredEnvelope: jest.fn((input: { id?: string }) => ({
    id: input.id
  })),
  getSharedProducer: jest.fn()
}))

describe('OutboxService.drain', () => {
  it('locks rows with skip_locked before sending', async () => {
    const send = jest.fn().mockResolvedValue(undefined)
    ;(kafka.getSharedProducer as jest.Mock).mockResolvedValue({ send })

    const getMany = jest.fn().mockResolvedValue([
      {
        id: 'ob-1',
        topic: 'civreg.audit.v1',
        key: 'k1',
        payload: { id: 'ob-1' },
        publishedAt: null
      }
    ])
    const qb = {
      setLock: jest.fn().mockReturnThis(),
      setOnLocked: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany
    }
    const save = jest.fn(async (row: { publishedAt: Date | null }) => row)
    const manager = {
      getRepository: () => ({ createQueryBuilder: () => qb }),
      save
    }

    const service = new OutboxService()
    await expect(service.drain(manager as never)).resolves.toBe(1)
    expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write')
    expect(qb.setOnLocked).toHaveBeenCalledWith('skip_locked')
    expect(send).toHaveBeenCalled()
    expect(save).toHaveBeenCalled()
  })
})
