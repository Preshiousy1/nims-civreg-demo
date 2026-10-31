import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditService } from '../audit/audit.service'
import { AuditLogEntity } from '../database/entities/audit-log.entity'
import { RequestEntity } from '../database/entities/request.entity'
import { RequestsController } from './requests.controller'
import { RequestsService } from './requests.service'

@Module({
  imports: [TypeOrmModule.forFeature([RequestEntity, AuditLogEntity])],
  controllers: [RequestsController],
  providers: [RequestsService, AuditService],
  exports: [RequestsService]
})
export class RequestsModule {}
