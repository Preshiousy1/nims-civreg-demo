import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { OutboxService } from './outbox.service'

@Injectable()
export class OutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(OutboxPublisher.name)
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(
    private readonly dataSource: DataSource,
    private readonly outbox: OutboxService
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick()
    }, 2000)
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }

  private async tick(): Promise<void> {
    try {
      await this.dataSource.transaction((manager) => this.outbox.drain(manager))
    } catch (err: unknown) {
      this.log.warn(
        `outbox tick failed err=${err instanceof Error ? err.message : 'unknown'}`
      )
    }
  }
}
