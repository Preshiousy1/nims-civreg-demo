import { Injectable, Logger } from '@nestjs/common'
import { EntityManager, IsNull } from 'typeorm'
import { OutboxEntity } from '../database/entities/outbox.entity'
import {
  AUDIT_TOPIC,
  buildAuditAppendedEnvelope,
  getSharedProducer
} from '../kafka/producer'

@Injectable()
export class OutboxService {
  private readonly log = new Logger(OutboxService.name)

  async enqueueAudit(
    manager: EntityManager,
    input: {
      entityType: string
      entityId: string
      action: string
      sequence: string
      rowHash: string
      eventId?: string
    }
  ): Promise<OutboxEntity> {
    const createdAt = new Date()
    const row = manager.create(OutboxEntity, {
      topic: AUDIT_TOPIC,
      key: input.entityId,
      payload: {},
      createdAt,
      publishedAt: null
    })
    const saved = await manager.save(row)
    saved.payload = buildAuditAppendedEnvelope({
      outboxId: saved.id,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      sequence: input.sequence,
      rowHash: input.rowHash,
      eventId: input.eventId,
      time: createdAt.toISOString()
    })
    return manager.save(saved)
  }

  async drain(manager: EntityManager): Promise<number> {
    const producer = await getSharedProducer((message) => this.log.log(message))
    if (!producer) {
      return 0
    }
    const pending = await manager.find(OutboxEntity, {
      where: { publishedAt: IsNull() },
      order: { createdAt: 'ASC' },
      take: 50
    })
    let sent = 0
    for (const row of pending) {
      try {
        await producer.send({
          topic: row.topic,
          key: row.key,
          value: row.payload
        })
        row.publishedAt = new Date()
        await manager.save(row)
        sent += 1
      } catch (err: unknown) {
        this.log.warn(
          `outbox publish failed id=${row.id} topic=${row.topic} key=${row.key} err=${
            err instanceof Error ? err.message : 'unknown'
          }`
        )
        break
      }
    }
    return sent
  }
}
