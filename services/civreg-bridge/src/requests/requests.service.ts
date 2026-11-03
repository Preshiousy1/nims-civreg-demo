import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, LessThan, QueryFailedError, Repository } from 'typeorm'
import { AuditService } from '../audit/audit.service'
import { RequestEntity } from '../database/entities/request.entity'
import { CreateRequestDto, idempotencyKey } from './dto'
import { sanitizeRequestPayload } from './sanitize-payload'

export type PersistResult = {
  created: boolean
  request: RequestEntity
}

function isUniqueViolation(err: unknown): boolean {
  if (err instanceof QueryFailedError) {
    const driver = err.driverError as { code?: string }
    return driver.code === '23505'
  }
  return false
}

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly requests: Repository<RequestEntity>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService
  ) {}

  async persist(dto: CreateRequestDto): Promise<PersistResult> {
    const key = idempotencyKey(dto.eventId, dto.actionId)
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(RequestEntity, {
        where: { idempotencyKey: key }
      })
      if (existing) {
        return { created: false, request: existing }
      }
      try {
        const request = manager.create(RequestEntity, {
          idempotencyKey: key,
          eventId: dto.eventId,
          actionId: dto.actionId,
          kind: dto.kind,
          payload: sanitizeRequestPayload(dto.payload),
          status: 'pending',
          registrationNumber: null,
          acceptTransactionId: null,
          ninRequestId: null,
          issuedNin: null
        })
        const saved = await manager.save(request)
        await this.audit.append(manager, {
          entityType: 'request',
          entityId: saved.id,
          action: 'persist',
          actorId: dto.actorId ?? 'system',
          payload: {
            eventId: dto.eventId,
            actionId: dto.actionId,
            kind: dto.kind
          }
        })
        return { created: true, request: saved }
      } catch (err) {
        if (isUniqueViolation(err)) {
          const raced = await manager.findOneByOrFail(RequestEntity, {
            idempotencyKey: key
          })
          return { created: false, request: raced }
        }
        throw err
      }
    })
  }

  async getById(id: string): Promise<RequestEntity> {
    const row = await this.requests.findOne({ where: { id } })
    if (!row) {
      throw new NotFoundException(`request ${id} not found`)
    }
    return row
  }

  async markStatus(
    id: string,
    status: RequestEntity['status']
  ): Promise<void> {
    await this.requests.update({ id }, { status })
  }

  async saveBirthArtifacts(
    id: string,
    input: {
      ninRequestId: string
      issuedNin: string
      registrationNumber: string
      acceptTransactionId: string
    }
  ): Promise<RequestEntity> {
    await this.requests.update(
      { id },
      {
        ninRequestId: input.ninRequestId,
        issuedNin: input.issuedNin,
        registrationNumber: input.registrationNumber,
        acceptTransactionId: input.acceptTransactionId
      }
    )
    return this.getById(id)
  }

  async listPendingBirthOlderThan(olderThanMs: number): Promise<RequestEntity[]> {
    const cutoff = new Date(Date.now() - olderThanMs)
    return this.requests.find({
      where: {
        status: 'pending',
        kind: 'birth_nin',
        createdAt: LessThan(cutoff)
      },
      order: { createdAt: 'ASC' },
      take: 20
    })
  }
}
