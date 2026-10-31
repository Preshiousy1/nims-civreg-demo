import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { loadEnv } from '../env'
import { sleep } from '../sleep'
import { DeceasedStatusEventDto, DeceasedStatusReversalDto } from './dto'

export type DeceasedRecord = {
  id: string
  type: 'deceased-status' | 'deceased-status-reversal'
  nin: string
  reason?: string
  eventId?: string
  createdAtMs: number
  demo: true
}

@Injectable()
export class DeceasedStatusService {
  private readonly store = new Map<string, DeceasedRecord>()

  async recordEvent(dto: DeceasedStatusEventDto): Promise<DeceasedRecord> {
    return this.write('deceased-status', dto.nin, dto.reason, dto.eventId)
  }

  async recordReversal(dto: DeceasedStatusReversalDto): Promise<DeceasedRecord> {
    return this.write(
      'deceased-status-reversal',
      dto.nin,
      dto.reason,
      dto.eventId
    )
  }

  get(id: string): DeceasedRecord | undefined {
    return this.store.get(id)
  }

  private async write(
    type: DeceasedRecord['type'],
    nin: string,
    reason: string | undefined,
    eventId: string | undefined
  ): Promise<DeceasedRecord> {
    const env = loadEnv()
    if (env.failDeceasedStatus) {
      throw new ServiceUnavailableException('injected deceased-status failure')
    }
    await sleep(env.delayMs)
    const record: DeceasedRecord = {
      id: randomUUID(),
      type,
      nin,
      reason,
      eventId,
      createdAtMs: Date.now(),
      demo: true
    }
    this.store.set(record.id, record)
    return record
  }
}
