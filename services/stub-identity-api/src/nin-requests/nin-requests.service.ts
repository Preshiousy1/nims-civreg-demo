import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { loadEnv } from '../env'
import { fakeNin } from '../fake-nin'
import { sleep } from '../sleep'
import { CreateNinRequestDto } from './dto'

export type NinRequestStatus = 'pending' | 'issued'

export type NinRequestRecord = {
  requestId: string
  eventId: string
  actionId: string
  subjectId?: string
  createdAtMs: number
  status: NinRequestStatus
  nin: string | null
}

export type NinRequestResponse = {
  requestId: string
  status: NinRequestStatus
  nin: string | null
  demo: true
  note: string
}

const DEMO_NOTE =
  'DEMO fake NIN, not a real National Identification Number. Prefix 000 is reserved for this stub.'

@Injectable()
export class NinRequestsService {
  private readonly store = new Map<string, NinRequestRecord>()

  async create(dto: CreateNinRequestDto): Promise<NinRequestResponse> {
    const env = loadEnv()
    if (env.failNinRequests) {
      throw new ServiceUnavailableException('injected NIN request failure')
    }
    await sleep(env.delayMs)

    const requestId = randomUUID()
    const record: NinRequestRecord = {
      requestId,
      eventId: dto.eventId,
      actionId: dto.actionId,
      subjectId: dto.subjectId,
      createdAtMs: Date.now(),
      status: 'pending',
      nin: null
    }
    this.store.set(requestId, record)
    return {
      requestId,
      status: 'pending',
      nin: null,
      demo: true,
      note: DEMO_NOTE
    }
  }

  get(requestId: string): NinRequestResponse {
    const env = loadEnv()
    if (env.failNinRequests) {
      throw new ServiceUnavailableException('injected NIN request failure')
    }
    const record = this.store.get(requestId)
    if (!record) {
      throw new NotFoundException(`nin request ${requestId} not found`)
    }
    return this.toResponse(record, env.delayMs)
  }

  private toResponse(record: NinRequestRecord, delayMs: number): NinRequestResponse {
    const ready = Date.now() >= record.createdAtMs + delayMs
    if (ready) {
      record.status = 'issued'
      record.nin = fakeNin(record.requestId)
    }
    return {
      requestId: record.requestId,
      status: record.status,
      nin: record.nin,
      demo: true,
      note: DEMO_NOTE
    }
  }
}
