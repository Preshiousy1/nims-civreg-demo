import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { CreateRequestDto } from './dto'
import { RequestsService } from './requests.service'

@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  async create(
    @Body() dto: CreateRequestDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const { created, request } = await this.requests.persist(dto)
    res.status(created ? 201 : 200)
    return {
      created,
      id: request.id,
      eventId: request.eventId,
      actionId: request.actionId,
      kind: request.kind,
      idempotencyKey: request.idempotencyKey
    }
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.requests.getById(id)
  }
}
