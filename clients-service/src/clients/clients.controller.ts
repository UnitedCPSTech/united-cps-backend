import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Get()
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER', 'ENGINEER')
  list(@Query() query: ListClientsQueryDto) {
    return this.clientsService.list(query);
  }

  @Get(':id')
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER', 'ENGINEER')
  get(@Param('id') id: string) {
    return this.clientsService.get(id);
  }

  @Patch(':id')
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  deactivate(@Param('id') id: string) {
    return this.clientsService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  activate(@Param('id') id: string) {
    return this.clientsService.activate(id);
  }
}