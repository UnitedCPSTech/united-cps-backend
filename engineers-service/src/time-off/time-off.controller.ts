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
import { CreateTimeOffDto } from './dto/create-time-off.dto';
import { UpdateTimeOffStatusDto } from './dto/update-time-off-status.dto';
import { TimeOffService } from './time-off.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('timeoff')
export class TimeoffController {
  constructor(private readonly timeoffService: TimeOffService) {}

  /**
   * Managers create time off for any engineer
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  @Post()
  create(@Body() dto: CreateTimeOffDto, @Req() req: any) {
    return this.timeoffService.create(dto, req.user.sub);
  }

  /**
   * Engineers create time off for themselves
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ENGINEER')
  @Post('me')
  createForMe(@Body() dto: Omit<CreateTimeOffDto, 'engineerId'>, @Req() req: any) {
    return this.timeoffService.createForUser(req.user.sub, dto);
  }

  /**
   * List time off for engineer
   */
  @UseGuards(JwtAuthGuard)
  @Get('engineer/:engineerId')
  listByEngineer(
    @Param('engineerId') engineerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.timeoffService.listByEngineer(engineerId, from, to);
  }

  /**
   * Get single time off
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.timeoffService.getById(id);
  }

  /**
   * Manager approves/rejects
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTimeOffStatusDto, @Req() req: any) {
    return this.timeoffService.updateStatus(id, dto, req.user.sub);
  }

  /**
   * Engineer cancels their own time off
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ENGINEER')
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.timeoffService.cancel(id, req.user.sub);
  }
}