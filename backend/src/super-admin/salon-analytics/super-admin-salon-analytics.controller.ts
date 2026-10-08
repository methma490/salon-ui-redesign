import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import {
  SalonAnalyticsAppointmentsQueryDto,
  SalonAnalyticsCustomersQueryDto,
  SalonAnalyticsDateRangeDto,
  SalonAnalyticsListQueryDto,
  SalonAnalyticsSalesQueryDto,
  SalonAnalyticsServicesQueryDto,
} from './dto/salon-analytics.dto';
import { SuperAdminSalonAnalyticsService } from './super-admin-salon-analytics.service';

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
};

@Controller('super-admin/salon-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminSalonAnalyticsController {
  constructor(
    private readonly salonAnalyticsService: SuperAdminSalonAnalyticsService,
    private readonly auditLogsService: SuperAdminAuditLogsService,
  ) {}

  @Get()
  async getSalonAnalyticsList(
    @Query() query: SalonAnalyticsListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.salonAnalyticsService.getSalonAnalyticsList(query);
    // Audit summary access
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUPER_ADMIN_VIEW_SALON_ANALYTICS',
      entityType: 'PLATFORM_ANALYTICS',
      metadata: { from: query.from, to: query.to, salonsCount: result.summary.totalSalons },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Get(':tenantId/overview')
  getSalonOverview(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: SalonAnalyticsDateRangeDto,
  ) {
    return this.salonAnalyticsService.getSalonOverview(tenantId, query);
  }

  @Get(':tenantId/customers')
  async getSalonCustomers(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: SalonAnalyticsCustomersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.salonAnalyticsService.getSalonCustomers(tenantId, query);
    // Audit sensitive customer list access
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUPER_ADMIN_VIEW_SALON_CUSTOMERS',
      entityType: 'TENANT_CUSTOMERS',
      tenantId,
      metadata: { page: query.page, search: query.search },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Get(':tenantId/sales')
  getSalonSales(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: SalonAnalyticsSalesQueryDto,
  ) {
    return this.salonAnalyticsService.getSalonSales(tenantId, query);
  }

  @Get(':tenantId/services')
  getSalonServices(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: SalonAnalyticsServicesQueryDto,
  ) {
    return this.salonAnalyticsService.getSalonServices(tenantId, query);
  }

  @Get(':tenantId/appointments')
  getSalonAppointments(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: SalonAnalyticsAppointmentsQueryDto,
  ) {
    return this.salonAnalyticsService.getSalonAppointments(tenantId, query);
  }

  @Get(':tenantId/finance')
  getSalonFinance(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: SalonAnalyticsDateRangeDto,
  ) {
    return this.salonAnalyticsService.getSalonFinance(tenantId, query);
  }
}
