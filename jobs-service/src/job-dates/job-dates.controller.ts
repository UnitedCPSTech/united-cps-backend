import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpsertJobDatesDto } from './dto/upsert-job-dates.dto';
import { JobDatesService } from './job-dates.service';

@Controller('jobs')
export class JobDatesController {
  constructor(private readonly jobDatesService: JobDatesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  @Post(':jobId/dates')
  upsert(@Param('jobId') jobId: string, @Body() dto: UpsertJobDatesDto) {
    return this.jobDatesService.upsert(jobId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':jobId/dates')
  get(@Param('jobId') jobId: string) {
    return this.jobDatesService.getByJobId(jobId);
  }
}