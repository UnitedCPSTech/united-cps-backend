import {
  BadRequestException,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SetAssignmentStatusDto } from './dto/set-assignment-status.dto';
import { DeclineAssignmentDto } from './dto/decline-assignment.dto';
import { AssignmentsService } from './assignments.service';
import { AssignmentStatus } from './schemas/assignments.schema';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  @Post()
  create(@Body() dto: CreateAssignmentDto, @Req() req: any) {
    return this.assignmentsService.create(dto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OPS_MANAGER', 'GENERAL_MANAGER')
@Patch(':id/status')
setStatus(
  @Param('id') id: string,
  @Body() dto: SetAssignmentStatusDto,
  @Req() req: any,
) {
  return this.assignmentsService.setStatus(
    id,
    dto.status,
    req.user.sub,
    dto.note,
  );
}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ENGINEER')
  @Patch(':id/engineer/accept')
  engineerAccept(@Param('id') id: string, @Req() req: any) {
    return this.assignmentsService.engineerRespond(
      id,
      req.user.sub,
      AssignmentStatus.ACCEPTED,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ENGINEER')
  @Patch(':id/engineer/decline')
  engineerDecline(
    @Param('id') id: string,
    @Body() dto: DeclineAssignmentDto,
    @Req() req: any,
  ) {
    return this.assignmentsService.engineerRespond(
      id,
      req.user.sub,
      AssignmentStatus.DECLINED,
      dto.reason,
    );
  }

  @UseGuards(JwtAuthGuard)
@Get()
list(
  @Query('jobId') jobId?: string,
  @Query('engineerId') engineerId?: string,
  @Query('status') status?: AssignmentStatus,
) {
  return this.assignmentsService.list({ jobId, engineerId, status });
}

  @UseGuards(JwtAuthGuard)
  @Get('conflicts')
  conflicts(
    @Query('engineerId') engineerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!engineerId || !from || !to) {
      throw new BadRequestException('engineerId, from, and to are required');
    }

    return this.assignmentsService.getConflicts(engineerId, from, to);
  }
}