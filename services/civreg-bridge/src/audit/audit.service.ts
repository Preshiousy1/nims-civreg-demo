import { Injectable } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import { AuditLogEntity } from '../database/entities/audit-log.entity'
import {
  canonicalPayload,
  computeRowHash,
  GENESIS_HASH
} from './audit-chain'

const AUDIT_LOCK_KEY = 872364

@Injectable()
export class AuditService {
  async append(
    manager: EntityManager,
    input: {
      entityType: string
      entityId: string
      action: string
      actorId: string
      payload: Record<string, unknown>
    }
  ): Promise<AuditLogEntity> {
    await manager.query('SELECT pg_advisory_xact_lock($1)', [AUDIT_LOCK_KEY])

    const last = await manager
      .createQueryBuilder(AuditLogEntity, 'a')
      .orderBy('a.sequence', 'DESC')
      .getOne()

    const prevHash = last?.rowHash ?? GENESIS_HASH
    const sequence = last ? Number(last.sequence) + 1 : 1
    const createdAt = new Date()
    const payloadJson = canonicalPayload(input.payload)
    const rowHash = computeRowHash({
      prevHash,
      sequence,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorId: input.actorId,
      payload: payloadJson,
      createdAt: createdAt.toISOString()
    })

    const row = manager.create(AuditLogEntity, {
      sequence: String(sequence),
      prevHash,
      rowHash,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorId: input.actorId,
      payload: input.payload,
      createdAt
    })
    return manager.save(row)
  }
}
