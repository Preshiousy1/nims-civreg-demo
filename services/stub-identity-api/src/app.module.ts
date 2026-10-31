import { Module } from '@nestjs/common'
import { DeceasedStatusModule } from './deceased-status/deceased-status.module'
import { HealthController } from './health.controller'
import { NinRequestsModule } from './nin-requests/nin-requests.module'

@Module({
  imports: [NinRequestsModule, DeceasedStatusModule],
  controllers: [HealthController]
})
export class AppModule {}
