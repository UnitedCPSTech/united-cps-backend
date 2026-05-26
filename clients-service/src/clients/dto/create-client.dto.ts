import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

 export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  country!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  addressLine1!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postcode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  region!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeZone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}