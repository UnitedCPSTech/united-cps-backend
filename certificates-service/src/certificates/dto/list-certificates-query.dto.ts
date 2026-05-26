import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListCertificatesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: string;
}