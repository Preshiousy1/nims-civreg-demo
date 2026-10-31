import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user'
import type { DevJwtUser } from '../auth/jwt'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { DeceasedService } from './deceased.service'
import { ReverseDeceasedDto } from './dto'

@Controller('deceased-status-requests')
@UseGuards(JwtAuthGuard)
export class DeceasedController {
  constructor(private readonly deceased: DeceasedService) {}

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: DevJwtUser) {
    return this.deceased.approve(id, user)
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: DevJwtUser) {
    return this.deceased.reject(id, user)
  }

  @Post(':id/reverse')
  reverse(
    @Param('id') id: string,
    @Body() body: ReverseDeceasedDto,
    @CurrentUser() user: DevJwtUser
  ) {
    return this.deceased.reverse(id, user, body.reason)
  }

  @Get(':id/audit')
  audit(@Param('id') id: string) {
    return this.deceased.getAudit(id)
  }
}
