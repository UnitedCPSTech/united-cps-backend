import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AssignmentStatus } from '../schemas/assignments.schema';

export class SetAssignmentStatusDto {
  @IsEnum(AssignmentStatus)
  status!: AssignmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}