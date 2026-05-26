import { IsArray, IsISO8601, IsString, ArrayMinSize } from 'class-validator';

export class CheckAvailabilityBulkDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  engineerIds!: string[];

  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}
