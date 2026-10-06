import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { SuperAdminAuditLogsService } from '../super-admin/audit-logs/super-admin-audit-logs.service';
import { AssignPlanFeaturesDto } from './dto/assign-plan-features.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdatePlanPricingDto } from './dto/update-plan-pricing.dto';
import { PlansService } from './plans.service';

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
};

@Controller('super-admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly auditLogsService: SuperAdminAuditLogsService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreatePlanDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.plansService.create(dto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'PLAN_CREATE',
      entityType: 'PLAN',
      entityId: result.id,
      newValue: { code: result.code, name: result.name, price: dto.price },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Get()
  findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const old = await this.plansService.findById(id);
    const result = await this.plansService.update(id, dto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'PLAN_UPDATE',
      entityType: 'PLAN',
      entityId: id,
      oldValue: { name: old?.name, description: old?.description, displayOrder: old?.displayOrder },
      newValue: dto,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Put(':id/features')
  async assignFeatures(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPlanFeaturesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.plansService.assignFeatures(id, dto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'PLAN_FEATURES_ASSIGN',
      entityType: 'PLAN',
      entityId: id,
      newValue: { features: dto.features },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Put(':id/pricing')
  async updatePricing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanPricingDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const old = await this.plansService.findById(id);
    const result = await this.plansService.updatePricing(id, dto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'PLAN_PRICING_UPDATE',
      entityType: 'PLAN',
      entityId: id,
      oldValue: { planPrices: old?.planPrices },
      newValue: dto,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Patch(':id/activate')
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.plansService.activate(id);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'PLAN_ACTIVATE',
      entityType: 'PLAN',
      entityId: id,
      newValue: { status: 'ACTIVE' },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.plansService.deactivate(id);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'PLAN_DEACTIVATE',
      entityType: 'PLAN',
      entityId: id,
      newValue: { status: 'INACTIVE' },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }
}
