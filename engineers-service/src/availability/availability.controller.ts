import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Body, Post } from '@nestjs/common';
import { CheckAvailabilityBulkDto } from './dto/check-bulk.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) { }

  // GET /availability/check?engineerId=...&from=...&to=...
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ENGINEER', 'OPS_MANAGER', 'GENERAL_MANAGER')
  @Get('check')
  check(
    @Query('engineerId') engineerId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: any,
  ) {
    const authHeader: string | undefined = req.headers?.authorization;
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined;

    return this.availabilityService.isEngineerAvailable(engineerId, from, to, token);
  }

  // POST /availability/check-bulk
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  @Post('check-bulk')
  checkBulk(@Body() dto: CheckAvailabilityBulkDto, @Req() req: any) {
    const authHeader: string | undefined = req.headers?.authorization;
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined;

    return this.availabilityService.checkBulk(dto.engineerIds, dto.from, dto.to, token);
  }
}