import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCertificateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  country!: string;
}