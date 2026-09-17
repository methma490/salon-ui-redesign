import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { TenantContextGuard } from '../tenant/guards/tenant-context.guard';
import { TenantContext } from '../tenant/interfaces/tenant-context.interface';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@Roles('SALON_ADMIN')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentTenant() tenant: TenantContext, @Query() query: NotificationQueryDto) {
    return this.notificationsService.listInApp(tenant.tenantId, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentTenant() tenant: TenantContext) {
    return this.notificationsService.unreadCount(tenant.tenantId);
  }

  @Patch('read-all')
  markAllRead(@CurrentTenant() tenant: TenantContext) {
    return this.notificationsService.markAllRead(tenant.tenantId);
  }

  @Patch(':id/read')
  markRead(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(id, tenant.tenantId);
  }
}
