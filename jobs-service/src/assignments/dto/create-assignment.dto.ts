import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsMongoId()
  @IsNotEmpty()
  jobId!: string;

  @IsMongoId()
  @IsNotEmpty()
  engineerId!: string;

  @IsMongoId()
  @IsNotEmpty()
  engineerUserId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  engineerNameSnapshot!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  country!: string;

  @IsOptional()
  @IsDateString()
  acceptanceDeadlineAt?: string;
}