import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JobDateType } from '../schemas/job-dates.schema';

export class UpsertJobDatesDto {
  @IsString()
  @MaxLength(10)
  country!: string;

  @IsEnum(JobDateType)
  dateType!: JobDateType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsDateString(undefined, { each: true })
  specificDates?: string[];
}