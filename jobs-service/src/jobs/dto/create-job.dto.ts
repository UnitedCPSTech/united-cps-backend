import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class JobLocationDto {
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postcode?: string | null;

  @IsOptional()
  @IsString()
  region?: string;

  @IsString()
  @IsNotEmpty()
  country!: string;
}

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsNotEmpty()
  clientNameSnapshot!: string;

  @IsString()
  @IsNotEmpty()
  jobTitle!: string;

  @IsString()
  @IsNotEmpty()
  locationText!: string;

  @ValidateNested()
  @Type(() => JobLocationDto)
  location!: JobLocationDto;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTimeLocal!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTimeLocal!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredCertificateTypes?: string[];
}