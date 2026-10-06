import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { SuperAdminAuditLogsService } from '../audit-logs/super-admin-audit-logs.service';
import { CreateSalonDto } from './dto/create-salon.dto';
import { ListSalonsQueryDto } from './dto/list-salons-query.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { UpdateSalonFeaturesDto } from './dto/update-salon-features.dto';
import { UpdateSalonStatusDto } from './dto/update-salon-status.dto';
import { SalonsService } from './salons.service';

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
};

@Controller('super-admin/salons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SalonsController {
  constructor(
    private readonly salonsService: SalonsService,
    private readonly auditLogsService: SuperAdminAuditLogsService,
  ) {}

  @Get()
  findAll(@Query() query: ListSalonsQueryDto) {
    return this.salonsService.findAll(query);
  }

  @Post()
  async create(
    @Body() dto: CreateSalonDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.salonsService.createSalon(dto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SALON_CREATE',
      entityType: 'TENANT',
      entityId: result.id,
      tenantId: result.id,
      newValue: { name: result.name, code: result.code, email: result.admin.email },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Get(':salonId')
  findOne(@Param('salonId', ParseUUIDPipe) salonId: string) {
    return this.salonsService.findOne(salonId);
  }

  @Patch(':salonId')
  async update(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: UpdateSalonDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.salonsService.updateSalon(salonId, dto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SALON_UPDATE',
      entityType: 'TENANT',
      entityId: salonId,
      tenantId: salonId,
      newValue: dto,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Patch(':salonId/status')
  async updateStatus(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: UpdateSalonStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.salonsService.updateSalonStatus(salonId, dto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SALON_STATUS_CHANGE',
      entityType: 'TENANT',
      entityId: salonId,
      tenantId: salonId,
      newValue: { status: dto.status },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Put(':salonId/features')
  async updateFeatures(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: UpdateSalonFeaturesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.salonsService.updateSalonFeatures(salonId, dto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SALON_FEATURES_UPDATE',
      entityType: 'TENANT',
      entityId: salonId,
      tenantId: salonId,
      newValue: { features: dto.features },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }
}