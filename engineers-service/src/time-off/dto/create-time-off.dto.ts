import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TimeOffDateType } from '../schemas/time-off-request.schema';

export class CreateTimeOffDto {
  @IsMongoId()
  engineerId!: string; // managers will send this; engineers will use /me endpoint

  @IsString()
  country!: string;

  @IsEnum(TimeOffDateType)
  dateType!: TimeOffDateType;

  // RANGE
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // MULTI
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsDateString(undefined, { each: true })
  specificDates?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
