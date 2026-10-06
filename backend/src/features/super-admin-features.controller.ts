import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { SetFeatureAddonPriceDto } from '../subscriptions/dto/subscription.dto';
import { SubscriptionAddonsService } from '../subscriptions/subscription-addons.service';

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
};

@Controller('super-admin/features')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminFeaturesController {
  constructor(
    private readonly addonsService: SubscriptionAddonsService,
    private readonly auditLogsService: SuperAdminAuditLogsService,
  ) {}

  @Get('add-ons')
  listAddonFeatures() {
    return this.addonsService.listFeaturesWithAddonPrices();
  }

  @Get(':id/add-on-prices')
  getAddonPrices(@Param('id', ParseUUIDPipe) id: string) {
    return this.addonsService.getFeatureAddonPrices(id);
  }

  @Post(':id/add-on-prices')
  async setAddonPrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetFeatureAddonPriceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.addonsService.setFeatureAddonPrice(id, dto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'FEATURE_ADDON_PRICE_SET',
      entityType: 'FEATURE_ADDON_PRICE',
      entityId: id,
      newValue: { price: dto.price, billingCycle: dto.billingCycle, currency: dto.currency },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Put(':id/add-on-prices')
  async updateAddonPrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetFeatureAddonPriceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.addonsService.setFeatureAddonPrice(id, dto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'FEATURE_ADDON_PRICE_UPDATE',
      entityType: 'FEATURE_ADDON_PRICE',
      entityId: id,
      newValue: { price: dto.price, billingCycle: dto.billingCycle, currency: dto.currency },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }
}

