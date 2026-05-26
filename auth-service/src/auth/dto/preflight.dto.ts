import { IsEmail } from 'class-validator';

export class PreflightDto {
  @IsEmail()
  email!: string;
}
