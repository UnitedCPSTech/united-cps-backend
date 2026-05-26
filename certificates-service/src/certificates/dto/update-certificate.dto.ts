import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCertificateDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  country?: string;
}