import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { loadEnv } from './env'

@Controller('health')
export class HealthController {
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' }
  }

  @Get('ready')
  ready(): { status: 'ok' } {
    if (!loadEnv().ready) {
      throw new ServiceUnavailableException('stub not ready')
    }
    return { status: 'ok' }
  }
}
