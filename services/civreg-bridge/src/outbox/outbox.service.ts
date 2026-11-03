import { Injectable, Logger } from '@nestjs/common'
import { EntityManager, IsNull } from 'typeorm'
import { OutboxEntity } from '../database/entities/outbox.entity'
import {
  AUDIT_TOPIC,
  REGISTRY_TOPIC,
  buildAuditAppendedEnvelope,
  buildBirthRegisteredEnvelope,
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

  async enqueueBirthRegistered(
    manager: EntityManager,
    input: {
      eventId: string
      actionId: string
      ninRequestId: string
      nin: string
    }
  ): Promise<OutboxEntity> {
    const createdAt = new Date()
    const row = manager.create(OutboxEntity, {
      topic: REGISTRY_TOPIC,
      key: input.eventId,
      payload: {},
      createdAt,
      publishedAt: null
    })
    const saved = await manager.save(row)
    saved.payload = buildBirthRegisteredEnvelope({
      ...input,
      id: saved.id,
      time: createdAt.toISOString()
    })
    return manager.save(saved)
  }

  /**
   * Claim unpublished rows with FOR UPDATE SKIP LOCKED so two replicas
   * do not send the same row. Still at-least-once if a crash happens after
   * send and before published_at is saved — consumers dedupe on envelope id.
   */
  async drain(manager: EntityManager): Promise<number> {
    const producer = await getSharedProducer((message) => this.log.log(message))
    if (!producer) {
      return 0
    }
    const pending = await manager
      .getRepository(OutboxEntity)
      .createQueryBuilder('outbox')
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .where('outbox.published_at IS NULL')
      .orderBy('outbox.created_at', 'ASC')
      .take(50)
      .getMany()

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
