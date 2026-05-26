import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeclineAssignmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}