import { IsOptional, IsString, MinLength } from 'class-validator'

export class DeceasedStatusEventDto {
  @IsString()
  @MinLength(1)
  nin!: string

  @IsOptional()
  @IsString()
  eventId?: string

  @IsOptional()
  @IsString()
  reason?: string
}

export class DeceasedStatusReversalDto {
  @IsString()
  @MinLength(1)
  nin!: string

  @IsString()
  @MinLength(1)
  reason!: string

  @IsOptional()
  @IsString()
  eventId?: string
}
