import { Body, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../tenant/decorators/current-tenant.decorator';
import { RequirePermission } from '../../tenant/decorators/require-permission.decorator';
import { PermissionGuard } from '../../tenant/guards/permission.guard';
import { TenantContextGuard } from '../../tenant/guards/tenant-context.guard';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';
import { SubscriptionFeatureService } from '../../subscriptions/subscription-feature.service';
import { ListSalesQueryDto } from '../pos/dto/pos.dto';
import { SalesService } from './sales.service';

@Controller('tenant/sales')
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly subscriptionFeatureService: SubscriptionFeatureService,
  ) {}

  @Get()
  @RequirePermission('SALE_VIEW')
  list(@CurrentTenant() tenant: TenantContext, @Query() query: ListSalesQueryDto) {
    return this.salesService.list(tenant.schemaName, query);
  }

  @Get(':id')
  @RequirePermission('SALE_VIEW')
  getById(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.salesService.findById(tenant.schemaName, id);
  }

  @Get(':id/invoice-link')
  @RequirePermission('SALE_VIEW')
  async getInvoiceLink(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.salesService.getInvoiceLink(tenant.tenantId, id);
  }

  @Post(':id/send-ebill-sms')
  @RequirePermission('SALE_VIEW')
  async sendEbillSms(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { phone?: string },
  ) {
    const hasFeature = await this.subscriptionFeatureService.hasFeature(
      tenant.tenantId,
      'SMS_NOTIFICATIONS',
    );
    if (!hasFeature) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'FEATURE_UPGRADE_REQUIRED',
        message:
          'SMS Notifications feature is not included in your current subscription plan. Please upgrade your plan to send SMS receipts.',
      });
    }

    return this.salesService.sendEbillSms(tenant.tenantId, tenant.schemaName, id, body.phone);
  }

  @Post(':id/resend-ebill-sms')
  @RequirePermission('SALE_VIEW')
  async resendEbillSms(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { phone?: string },
  ) {
    const hasFeature = await this.subscriptionFeatureService.hasFeature(
      tenant.tenantId,
      'SMS_NOTIFICATIONS',
    );
    if (!hasFeature) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'FEATURE_UPGRADE_REQUIRED',
        message:
          'SMS Notifications feature is not included in your current subscription plan. Please upgrade your plan to send SMS receipts.',
      });
    }

    return this.salesService.sendEbillSms(tenant.tenantId, tenant.schemaName, id, body.phone);
  }

  @Post(':id/send-ebill-whatsapp')
  @RequirePermission('SALE_VIEW')
  async sendEbillWhatsapp(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { phone?: string },
  ) {
    return this.salesService.sendEbillWhatsapp(
      tenant.tenantId,
      tenant.schemaName,
      id,
      body.phone,
    );
  }

  @Post(':id/send-ebill-email')
  @RequirePermission('SALE_VIEW')
  async sendEbillEmail(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { email?: string },
  ) {
    return this.salesService.sendEbillEmail(
      tenant.tenantId,
      tenant.schemaName,
      id,
      body.email,
    );
  }

  @Post(':id/send-invoice-email')
  @RequirePermission('SALE_VIEW')
  async sendInvoiceEmail(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { email?: string },
  ) {
    return this.salesService.sendEbillEmail(
      tenant.tenantId,
      tenant.schemaName,
      id,
      body.email,
    );
  }
}

