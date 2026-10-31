import { IsOptional, IsString, MinLength } from 'class-validator'

export class CreateNinRequestDto {
  @IsString()
  @MinLength(1)
  eventId!: string

  @IsString()
  @MinLength(1)
  actionId!: string

  @IsOptional()
  @IsString()
  subjectId?: string
}
