import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionReminderType } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { TenantContextGuard } from '../tenant/guards/tenant-context.guard';
import { TenantContext } from '../tenant/interfaces/tenant-context.interface';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationReminderService } from './notification-reminder.service';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly reminderService: NotificationReminderService,
  ) {}

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

  /**
   * Manually triggers the subscription reminder scan (with optional asOfDate for testing).
   */
  @Post('reminders/scan')
  @UseGuards(RolesGuard)
  @Roles('SALON_ADMIN')
  scanReminders(@Query('asOfDate') asOfDate?: string) {
    const targetDate = asOfDate ? new Date(asOfDate) : new Date();
    return this.reminderService.scanAndQueueSubscriptionReminders(targetDate);
  }

  /**
   * Manually test a specific reminder type on the tenant's current subscription.
   */
  @Post('reminders/test')
  @UseGuards(RolesGuard)
  @Roles('SALON_ADMIN')
  async testReminder(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: { reminderType: SubscriptionReminderType; subscriptionId?: string },
  ) {
    let subId = body.subscriptionId;
    if (!subId) {
      const activeSub = await this.notificationsService['prisma'].subscription.findFirst({
        where: { tenantId: tenant.tenantId },
        orderBy: { createdAt: 'desc' },
      });
      subId = activeSub?.id;
    }

    if (!subId) {
      throw new Error('No subscription found for this tenant');
    }

    return this.reminderService.triggerReminderTest(subId, body.reminderType);
  }

  /**
   * Returns reminder logs and delivery history for this salon.
   */
  @Get('reminders/history')
  @UseGuards(RolesGuard)
  @Roles('SALON_ADMIN')
  getReminderHistory(@CurrentTenant() tenant: TenantContext) {
    return this.reminderService.listReminderHistory({ tenantId: tenant.tenantId });
  }
}
