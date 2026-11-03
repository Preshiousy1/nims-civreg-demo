import { Module } from '@nestjs/common'
import { DeceasedModule } from '../deceased/deceased.module'
import { RequestsModule } from '../requests/requests.module'
import { InterceptController } from './intercept.controller'
import { InterceptService } from './intercept.service'
import { PendingRequestReconciler } from './pending-request.reconciler'

@Module({
  imports: [RequestsModule, DeceasedModule],
  controllers: [InterceptController],
  providers: [InterceptService, PendingRequestReconciler]
})
export class InterceptModule {}
