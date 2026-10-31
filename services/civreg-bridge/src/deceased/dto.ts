import { IsOptional, IsString } from 'class-validator'

export class ReverseDeceasedDto {
  @IsOptional()
  @IsString()
  reason?: string
}
