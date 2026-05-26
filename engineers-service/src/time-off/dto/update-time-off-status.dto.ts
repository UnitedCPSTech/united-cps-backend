import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TimeOffStatus } from '../schemas/time-off-request.schema';

export class UpdateTimeOffStatusDto {
  @IsEnum(TimeOffStatus)
  status!: TimeOffStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}
