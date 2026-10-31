import { Injectable, Logger } from '@nestjs/common'
import { loadEnv } from '../env'
import { acceptRegister, rejectRegister } from '../opencrvs/events-client'
import { fetchSystemToken } from '../opencrvs/token'
import { CreateRequestDto } from '../requests/dto'
import { RequestsService } from '../requests/requests.service'
import {
  getNin,
  postDeceasedStatus,
  requestNin,
  withRetries
} from '../stub/stub-client'
import { DeceasedService } from '../deceased/deceased.service'
import { getSharedProducer, publishBirthRegistered } from '../kafka/producer'

@Injectable()
export class InterceptService {
  private readonly log = new Logger(InterceptService.name)

  constructor(
    private readonly requests: RequestsService,
    private readonly deceased: DeceasedService
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
      let ninRequestId: string | undefined
      let nin: string | undefined
      await withRetries(
        env.stubRetryAttempts,
        env.stubRetryDelayMs,
        async () => {
          if (row.kind === 'birth_nin') {
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
            await postDeceasedStatus(env.stubIdentityUrl, row.eventId)
          }
        }
      )

      if (row.kind === 'birth_nin' && ninRequestId && nin) {
        const producer = await getSharedProducer((message) =>
          this.log.log(message)
        )
        if (producer) {
          await publishBirthRegistered(
            {
              eventId: row.eventId,
              actionId: row.actionId,
              ninRequestId,
              nin
            },
            producer
          )
        }
      }

      const token = await this.systemToken(env)
      await acceptRegister({
        eventsUrl: env.openCrvsEventsUrl,
        token,
        eventId: row.eventId,
        actionId: row.actionId
      })
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
