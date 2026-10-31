import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { CreateNinRequestDto } from './dto'
import { NinRequestsService } from './nin-requests.service'

@Controller('nin-requests')
export class NinRequestsController {
  constructor(private readonly ninRequests: NinRequestsService) {}

  @Post()
  @HttpCode(202)
  create(@Body() dto: CreateNinRequestDto) {
    return this.ninRequests.create(dto)
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.ninRequests.get(id)
  }
}
