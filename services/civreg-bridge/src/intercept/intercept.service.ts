import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { DeceasedService } from '../deceased/deceased.service'
import { loadEnv } from '../env'
import { generateRegistrationNumber, acceptRegister, rejectRegister } from '../opencrvs/events-client'
import { deterministicTransactionId } from '../opencrvs/ids'
import { fetchSystemToken } from '../opencrvs/token'
import { OutboxService } from '../outbox/outbox.service'
import { CreateRequestDto } from '../requests/dto'
import { RequestsService } from '../requests/requests.service'
import {
  getNin,
  postDeceasedStatus,
  requestNin,
  withRetries
} from '../stub/stub-client'

@Injectable()
export class InterceptService {
  private readonly log = new Logger(InterceptService.name)

  constructor(
    private readonly requests: RequestsService,
    private readonly deceased: DeceasedService,
    private readonly outbox: OutboxService,
    private readonly dataSource: DataSource
  ) {}

  async intercept(dto: CreateRequestDto) {
    const result = await this.requests.persist(dto)
    if (dto.kind === 'death_register') {
      await this.deceased.openFromRegister({
        request: result.request,
        makerId: dto.actorId ?? 'unknown',
        payload: dto.payload ?? {}
      })
      this.log.log(
        `outcome=pending-approval eventId=${dto.eventId} actionId=${dto.actionId}`
      )
      return result
    }
    void this.resolve(result.request.id).catch((err: unknown) => {
      this.log.warn(
        `resolve threw eventId=${dto.eventId} actionId=${dto.actionId} err=${
          err instanceof Error ? err.message : 'unknown'
        }`
      )
    })
    return result
  }

  async resolve(
    requestId: string
  ): Promise<'accepted' | 'rejected' | 'skipped'> {
    const row = await this.requests.getById(requestId)
    if (row.status !== 'pending' || row.kind === 'death_register') {
      this.log.log(
        `outcome=skipped eventId=${row.eventId} actionId=${row.actionId}`
      )
      return 'skipped'
    }

    const env = loadEnv()
    try {
      let ninRequestId = row.ninRequestId ?? undefined
      let nin = row.issuedNin ?? undefined
      await withRetries(
        env.stubRetryAttempts,
        env.stubRetryDelayMs,
        async () => {
          if (row.kind === 'birth_nin') {
            if (ninRequestId && nin) {
              return
            }
            const created = await requestNin(
              env.stubIdentityUrl,
              row.eventId,
              row.actionId
            )
            const issued = await getNin(env.stubIdentityUrl, created.requestId)
            if (issued.status !== 'issued' || !issued.nin) {
              throw new Error('nin not issued yet')
            }
            ninRequestId = issued.requestId
            nin = issued.nin
          } else {
            await postDeceasedStatus(
              env.stubIdentityUrl,
              row.eventId,
              '00000000000',
              row.id
            )
          }
        }
      )

      if (row.kind !== 'birth_nin' || !ninRequestId || !nin) {
        throw new Error('birth resolve missing NIN')
      }

      const registrationNumber =
        row.registrationNumber ?? generateRegistrationNumber()
      const acceptTransactionId =
        row.acceptTransactionId ??
        deterministicTransactionId(row.eventId, row.actionId, 'accept')

      const prepared = await this.requests.saveBirthArtifacts(row.id, {
        ninRequestId,
        issuedNin: nin,
        registrationNumber,
        acceptTransactionId
      })

      const token = await this.systemToken(env)
      await acceptRegister({
        eventsUrl: env.openCrvsEventsUrl,
        token,
        eventId: prepared.eventId,
        actionId: prepared.actionId,
        transactionId: acceptTransactionId,
        registrationNumber
      })

      await this.dataSource.transaction(async (manager) => {
        await this.outbox.enqueueBirthRegistered(manager, {
          eventId: prepared.eventId,
          actionId: prepared.actionId,
          ninRequestId,
          nin
        })
      })
      await this.dataSource.transaction((manager) => this.outbox.drain(manager))

      await this.requests.markStatus(row.id, 'accepted')
      this.log.log(
        `outcome=accepted eventId=${row.eventId} actionId=${row.actionId}`
      )
      return 'accepted'
    } catch (err: unknown) {
      this.log.warn(
        `outcome=rejecting eventId=${row.eventId} actionId=${row.actionId} err=${
          err instanceof Error ? err.message : 'unknown'
        }`
      )
      try {
        const token = await this.systemToken(env)
        await rejectRegister({
          eventsUrl: env.openCrvsEventsUrl,
          token,
          eventId: row.eventId,
          actionId: row.actionId
        })
        await this.requests.markStatus(row.id, 'rejected')
        this.log.log(
          `outcome=rejected eventId=${row.eventId} actionId=${row.actionId}`
        )
      } catch (rejectErr: unknown) {
        this.log.warn(
          `outcome=reject-failed eventId=${row.eventId} actionId=${row.actionId} err=${
            rejectErr instanceof Error ? rejectErr.message : 'unknown'
          }`
        )
      }
      return 'rejected'
    }
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
