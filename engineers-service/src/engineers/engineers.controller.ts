import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EngineersService } from './engineers.service';
import { CreateEngineerDto } from './dto/create-engineer.dto';
import { UpdateEngineerDto } from './dto/update-engineer.dto';
import { QueryEngineersDto } from './dto/query-engineers.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

import { Req } from '@nestjs/common';

@Controller('engineers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EngineersController {
  constructor(private readonly engineersService: EngineersService) {}

  // Create engineer
  @Post()
  @Roles('GENERAL_MANAGER', 'OPS_MANAGER')
  create(@Body() dto: CreateEngineerDto) {
    return this.engineersService.create(dto);
  }

  // List engineers
  @Get()
  @Roles('GENERAL_MANAGER', 'OPS_MANAGER')
  list(@Query() query: QueryEngineersDto) {
    return this.engineersService.list(query);
  }

  @Get('me')
@Roles('ENGINEER')
getMe(@Req() req: any) {
  return this.engineersService.findMe(req.user.sub, req.user.email);
  
}



  // Get single engineer
  @Get(':id')
  @Roles('GENERAL_MANAGER', 'OPS_MANAGER')
  findOne(@Param('id') id: string) {
    return this.engineersService.findOne(id);
  }

  // Update engineer
  @Patch(':id')
  @Roles('GENERAL_MANAGER', 'OPS_MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateEngineerDto) {
    return this.engineersService.update(id, dto);
  }

  // Delete engineer (GENERAL_MANAGER only)
  @Delete(':id')
  @Roles('GENERAL_MANAGER')
  remove(@Param('id') id: string) {
    return this.engineersService.remove(id);
  }
}
