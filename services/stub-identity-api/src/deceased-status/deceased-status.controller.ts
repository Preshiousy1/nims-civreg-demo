import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { DeceasedStatusEventDto, DeceasedStatusReversalDto } from './dto'
import { DeceasedStatusService } from './deceased-status.service'

@Controller()
export class DeceasedStatusController {
  constructor(private readonly deceased: DeceasedStatusService) {}

  @Post('deceased-status-events')
  @HttpCode(202)
  event(@Body() dto: DeceasedStatusEventDto) {
    return this.deceased.recordEvent(dto)
  }

  @Post('deceased-status-reversals')
  @HttpCode(202)
  reversal(@Body() dto: DeceasedStatusReversalDto) {
    return this.deceased.recordReversal(dto)
  }
}
