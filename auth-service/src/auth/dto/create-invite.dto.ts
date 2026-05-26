import { IsEmail, IsIn, IsString } from 'class-validator';

export class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsIn(['OPS_MANAGER', 'ENGINEER'])
  role!: 'OPS_MANAGER' | 'ENGINEER';

  @IsString()
  country!: string;
}
