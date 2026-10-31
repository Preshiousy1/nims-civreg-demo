import { Module } from '@nestjs/common'
import { NinRequestsController } from './nin-requests.controller'
import { NinRequestsService } from './nin-requests.service'

@Module({
  controllers: [NinRequestsController],
  providers: [NinRequestsService]
})
export class NinRequestsModule {}
