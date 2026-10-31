import { Module } from '@nestjs/common'
import { DeceasedStatusController } from './deceased-status.controller'
import { DeceasedStatusService } from './deceased-status.service'

@Module({
  controllers: [DeceasedStatusController],
  providers: [DeceasedStatusService]
})
export class DeceasedStatusModule {}
