import { IsObject, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateRequestDto {
  @IsString()
  @MinLength(1)
  eventId!: string

  @IsString()
  @MinLength(1)
  actionId!: string

  @IsString()
  @MinLength(1)
  kind!: string

  @IsOptional()
  @IsString()
  actorId?: string

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>
}

export function idempotencyKey(eventId: string, actionId: string): string {
  return `${eventId}:${actionId}`
}
