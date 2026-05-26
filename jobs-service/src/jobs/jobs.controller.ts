import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CancelJobDto } from './dto/cancel-job.dto';
import { CompleteJobDto } from './dto/complete-job.dto';
import { JobsService } from './jobs.service';
import { JobStatus } from './schemas/job.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  @Post()
  create(@Body() dto: CreateJobDto, @Req() req: any) {
    const createdByUserId = req.user.sub;
    return this.jobsService.create(dto, createdByUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Query('country') country?: string, @Query('status') status?: JobStatus) {
    return this.jobsService.list(country, status);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.jobsService.get(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelJobDto, @Req() req: any) {
    return this.jobsService.cancel(id, req.user.sub, dto.reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  @Patch(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteJobDto, @Req() req: any) {
    return this.jobsService.complete(id, req.user.sub, dto.note);
  }
}