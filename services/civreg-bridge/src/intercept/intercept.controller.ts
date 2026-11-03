import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common'
import { InterceptSecretGuard } from '../auth/intercept-secret.guard'
import { CreateRequestDto } from '../requests/dto'
import { InterceptService } from './intercept.service'

@Controller('intercept')
@UseGuards(InterceptSecretGuard)
export class InterceptController {
  constructor(private readonly intercept: InterceptService) {}

  @Post('register')
  @HttpCode(202)
  register(@Body() dto: CreateRequestDto) {
    return this.intercept.intercept(dto)
  }
}
