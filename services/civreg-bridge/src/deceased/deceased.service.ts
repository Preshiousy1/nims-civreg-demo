import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { AuditService } from '../audit/audit.service'
import {
  canonicalPayload,
  verifyChain,
  type AuditChainRow
} from '../audit/audit-chain'
import type { DevJwtUser } from '../auth/jwt'
import { AuditLogEntity } from '../database/entities/audit-log.entity'
import { DeceasedStatusRequestEntity } from '../database/entities/deceased-status-request.entity'
import { RequestEntity } from '../database/entities/request.entity'
import { loadEnv } from '../env'
import {
  acceptRegister,
  generateRegistrationNumber,
  rejectRegister
} from '../opencrvs/events-client'
import { deterministicTransactionId } from '../opencrvs/ids'
import { fetchSystemToken } from '../opencrvs/token'
import { OutboxService } from '../outbox/outbox.service'
import {
  postDeceasedReversal,
  postDeceasedStatus,
  withRetries
} from '../stub/stub-client'
import { assertCanApprove, assertCanReject, assertCanReverse } from './rules'

const ENTITY = 'deceased_status_request'

function ninFromPayload(payload: Record<string, unknown>): string | null {
  const action = payload.action as
    | { declaration?: Record<string, unknown> }
    | undefined
  const nin = action?.declaration?.['deceased.nin']
  if (typeof nin === 'string' && nin.trim().length > 0) {
    return nin.trim()
  }
  return null
}

function makerStaffIdFromPayload(
  payload: Record<string, unknown>
): string | null {
  if (typeof payload.makerStaffId === 'string' && payload.makerStaffId) {
    return payload.makerStaffId
  }
  return null
}

@Injectable()
export class DeceasedService {
  private readonly log = new Logger(DeceasedService.name)

  constructor(
    @InjectRepository(DeceasedStatusRequestEntity)
    private readonly rows: Repository<DeceasedStatusRequestEntity>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService
  ) {}

  async openFromRegister(input: {
    request: RequestEntity
    makerId: string
    payload: Record<string, unknown>
  }): Promise<DeceasedStatusRequestEntity> {
    const existing = await this.rows.findOne({
      where: { requestId: input.request.id }
    })
    if (existing) {
      return existing
    }
    const nin = ninFromPayload(input.payload)
    if (!nin) {
      throw new BadRequestException(
        'deceased.nin is required before death REGISTER can be held for approval'
      )
    }
    return this.dataSource.transaction(async (manager) => {
      const raced = await manager.findOne(DeceasedStatusRequestEntity, {
        where: { requestId: input.request.id }
      })
      if (raced) {
        return raced
      }
      const row = manager.create(DeceasedStatusRequestEntity, {
        requestId: input.request.id,
        eventId: input.request.eventId,
        actionId: input.request.actionId,
        makerId: input.makerId,
        makerStaffId: makerStaffIdFromPayload(input.payload),
        status: 'PENDING_APPROVAL',
        nin,
        stubDone: false,
        coreDone: false,
        reason: null
      })
      const saved = await manager.save(row)
      const auditRow = await this.audit.append(manager, {
        entityType: ENTITY,
        entityId: saved.id,
        action: 'open',
        actorId: input.makerId,
        payload: { eventId: saved.eventId, actionId: saved.actionId }
      })
      await this.outbox.enqueueAudit(manager, {
        entityType: ENTITY,
        entityId: saved.id,
        action: 'open',
        sequence: auditRow.sequence,
        rowHash: auditRow.rowHash,
        eventId: saved.eventId
      })
      return saved
    })
  }

  async approve(
    id: string,
    user: DevJwtUser
  ): Promise<DeceasedStatusRequestEntity> {
    const row = await this.getById(id)
    if (row.status === 'APPROVED') {
      return row
    }
    assertCanApprove(row, user)
    const env = loadEnv()

    if (!row.stubDone) {
      await withRetries(env.stubRetryAttempts, env.stubRetryDelayMs, () =>
        postDeceasedStatus(env.stubIdentityUrl, row.eventId, row.nin, row.id)
      )
      await this.rows.update({ id: row.id }, { stubDone: true })
      row.stubDone = true
    }

    if (!row.coreDone) {
      try {
        const token = await this.systemToken(env)
        const transactionId = deterministicTransactionId(
          row.eventId,
          row.actionId,
          'accept'
        )
        const registrationNumber = generateRegistrationNumber()
        await acceptRegister({
          eventsUrl: env.openCrvsEventsUrl,
          token,
          eventId: row.eventId,
          actionId: row.actionId,
          transactionId,
          registrationNumber
        })
        await this.rows.update({ id: row.id }, { coreDone: true })
        row.coreDone = true
      } catch (err: unknown) {
        this.log.warn(
          `core accept failed after stub; compensating reverse eventId=${row.eventId}`
        )
        try {
          await withRetries(env.stubRetryAttempts, env.stubRetryDelayMs, () =>
            postDeceasedReversal(
              env.stubIdentityUrl,
              row.eventId,
              row.nin,
              'compensate: core accept failed'
            )
          )
          await this.rows.update({ id: row.id }, { stubDone: false })
        } catch (compensateErr: unknown) {
          this.log.warn(
            `compensate reverse failed eventId=${row.eventId} err=${
              compensateErr instanceof Error ? compensateErr.message : 'unknown'
            }`
          )
        }
        throw err
      }
    }

    return this.transition(row, 'APPROVED', user.sub, 'approve')
  }

  async reject(
    id: string,
    user: DevJwtUser
  ): Promise<DeceasedStatusRequestEntity> {
    const row = await this.getById(id)
    if (row.status === 'REJECTED') {
      return row
    }
    assertCanReject(row, user)
    const env = loadEnv()
    const token = await this.systemToken(env)
    await rejectRegister({
      eventsUrl: env.openCrvsEventsUrl,
      token,
      eventId: row.eventId,
      actionId: row.actionId
    })
    return this.transition(row, 'REJECTED', user.sub, 'reject')
  }

  async reverse(
    id: string,
    user: DevJwtUser,
    reason: string | undefined
  ): Promise<DeceasedStatusRequestEntity> {
    const row = await this.getById(id)
    if (row.status === 'REVERSED') {
      return row
    }
    assertCanReverse(row, user, reason)
    const trimmed = (reason ?? '').trim()
    const env = loadEnv()
    await withRetries(env.stubRetryAttempts, env.stubRetryDelayMs, () =>
      postDeceasedReversal(env.stubIdentityUrl, row.eventId, row.nin, trimmed)
    )
    return this.transition(row, 'REVERSED', user.sub, 'reverse', trimmed)
  }

  async getAudit(id: string): Promise<{
    request: DeceasedStatusRequestEntity
    rows: AuditLogEntity[]
    chain: ReturnType<typeof verifyChain>
  }> {
    const request = await this.getById(id)
    const repo = this.dataSource.getRepository(AuditLogEntity)
    const rows = await repo.find({
      where: { entityType: ENTITY, entityId: id },
      order: { sequence: 'ASC' }
    })
    const ledger = await repo.find({ order: { sequence: 'ASC' } })
    return {
      request,
      rows,
      chain: verifyChain(ledger.map(toChainRow))
    }
  }

  private async getById(id: string): Promise<DeceasedStatusRequestEntity> {
    const row = await this.rows.findOne({ where: { id } })
    if (!row) {
      throw new NotFoundException(`deceased-status-request ${id} not found`)
    }
    return row
  }

  private async transition(
    current: DeceasedStatusRequestEntity,
    status: DeceasedStatusRequestEntity['status'],
    actorId: string,
    action: string,
    reason?: string
  ): Promise<DeceasedStatusRequestEntity> {
    const saved = await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOneByOrFail(DeceasedStatusRequestEntity, {
        id: current.id
      })
      if (locked.status === status) {
        return locked
      }
      locked.status = status
      if (reason) {
        locked.reason = reason
      }
      const updated = await manager.save(locked)
      const auditRow = await this.audit.append(manager, {
        entityType: ENTITY,
        entityId: updated.id,
        action,
        actorId,
        payload: { status, eventId: updated.eventId }
      })
      await this.outbox.enqueueAudit(manager, {
        entityType: ENTITY,
        entityId: updated.id,
        action,
        sequence: auditRow.sequence,
        rowHash: auditRow.rowHash,
        eventId: updated.eventId
      })
      return updated
    })
    await this.dataSource.transaction((manager) => this.outbox.drain(manager))
    return saved
  }

  private systemToken(env: ReturnType<typeof loadEnv>): Promise<string> {
    if (!env.openCrvsClientId || !env.openCrvsClientSecret) {
      throw new Error('OPENCRVS_CLIENT_ID/SECRET are not set')
    }
    return fetchSystemToken({
      tokenUrl: env.openCrvsTokenUrl,
      clientId: env.openCrvsClientId,
      clientSecret: env.openCrvsClientSecret
    })
  }
}

function toChainRow(row: AuditLogEntity): AuditChainRow {
  return {
    prevHash: row.prevHash,
    sequence: Number(row.sequence),
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    actorId: row.actorId,
    payload: canonicalPayload(row.payload),
    createdAt: row.createdAt.toISOString(),
    rowHash: row.rowHash
  }
}
