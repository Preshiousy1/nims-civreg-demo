import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { CreateRequestDto } from '../requests/dto'
import { InterceptService } from './intercept.service'

@Controller('intercept')
export class InterceptController {
  constructor(private readonly intercept: InterceptService) {}

  @Post('register')
  @HttpCode(202)
  register(@Body() dto: CreateRequestDto) {
    return this.intercept.intercept(dto)
  }
}
