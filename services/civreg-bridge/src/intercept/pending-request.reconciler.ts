import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { loadEnv } from '../env'
import { RequestsService } from '../requests/requests.service'
import { InterceptService } from './intercept.service'

/**
 * After countryconfig gets 202, Core stops retrying the trigger.
 * If the bridge dies mid-resolve, the request stays pending.
 * This loop picks old pending birth rows and calls resolve again.
 */
@Injectable()
export class PendingRequestReconciler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PendingRequestReconciler.name)
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(
    private readonly requests: RequestsService,
    private readonly intercept: InterceptService
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick()
    }, 5000)
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }

  async tick(): Promise<number> {
    const env = loadEnv()
    const rows = await this.requests.listPendingBirthOlderThan(
      env.reconcileOlderThanMs
    )
    let handled = 0
    for (const row of rows) {
      try {
        const outcome = await this.intercept.resolve(row.id)
        this.log.log(
          `reconcile outcome=${outcome} eventId=${row.eventId} actionId=${row.actionId}`
        )
        handled += 1
      } catch (err: unknown) {
        this.log.warn(
          `reconcile failed eventId=${row.eventId} actionId=${row.actionId} err=${
            err instanceof Error ? err.message : 'unknown'
          }`
        )
      }
    }
    return handled
  }
}
