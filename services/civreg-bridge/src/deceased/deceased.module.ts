import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditService } from '../audit/audit.service'
import { AuditLogEntity } from '../database/entities/audit-log.entity'
import { DeceasedStatusRequestEntity } from '../database/entities/deceased-status-request.entity'
import { OutboxEntity } from '../database/entities/outbox.entity'
import { OutboxPublisher } from '../outbox/outbox.publisher'
import { OutboxService } from '../outbox/outbox.service'
import { DeceasedController } from './deceased.controller'
import { DeceasedService } from './deceased.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeceasedStatusRequestEntity,
      AuditLogEntity,
      OutboxEntity
    ])
  ],
  controllers: [DeceasedController],
  providers: [DeceasedService, AuditService, OutboxService, OutboxPublisher],
  exports: [DeceasedService]
})
export class DeceasedModule {}
