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
import { CertificatesService } from './certificates.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { ListCertificatesQueryDto } from './dto/list-certificates-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  create(@Body() dto: CreateCertificateDto) {
    return this.certificatesService.create(dto);
  }

  @Get()
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER', 'ENGINEER')
  list(@Query() query: ListCertificatesQueryDto) {
    return this.certificatesService.list(query);
  }

  @Get(':id')
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER', 'ENGINEER')
  get(@Param('id') id: string) {
    return this.certificatesService.get(id);
  }

  @Patch(':id')
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateCertificateDto) {
    return this.certificatesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  deactivate(@Param('id') id: string) {
    return this.certificatesService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles('OPS_MANAGER', 'GENERAL_MANAGER')
  activate(@Param('id') id: string) {
    return this.certificatesService.activate(id);
  }
}