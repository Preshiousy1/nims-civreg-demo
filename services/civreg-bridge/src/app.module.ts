import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HealthController } from './health.controller'
import { MetricsController } from './metrics.controller'
import { AuditLogEntity } from './database/entities/audit-log.entity'
import { DeceasedStatusRequestEntity } from './database/entities/deceased-status-request.entity'
import { OutboxEntity } from './database/entities/outbox.entity'
import { RequestEntity } from './database/entities/request.entity'
import { InitRequestsAndAuditLog1700000000001 } from './database/migrations/1700000000001-InitRequestsAndAuditLog'
import { AddRequestStatus1700000000002 } from './database/migrations/1700000000002-AddRequestStatus'
import { DeceasedAndOutbox1700000000003 } from './database/migrations/1700000000003-DeceasedAndOutbox'
import { Section2Hardening1700000000004 } from './database/migrations/1700000000004-Section2Hardening'
import { DeceasedModule } from './deceased/deceased.module'
import { InterceptModule } from './intercept/intercept.module'
import { loadEnv } from './env'
import { RequestsModule } from './requests/requests.module'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const env = loadEnv()
        return {
          type: 'postgres' as const,
          url: env.databaseUrl,
          entities: [
            RequestEntity,
            AuditLogEntity,
            DeceasedStatusRequestEntity,
            OutboxEntity
          ],
          migrations: [
            InitRequestsAndAuditLog1700000000001,
            AddRequestStatus1700000000002,
            DeceasedAndOutbox1700000000003,
            Section2Hardening1700000000004
          ],
          synchronize: false,
          migrationsRun: env.runMigrations,
          retryAttempts: 10,
          retryDelay: 2000
        }
      }
    }),
    RequestsModule,
    InterceptModule,
    DeceasedModule
  ],
  controllers: [HealthController, MetricsController]
})
export class AppModule {}
