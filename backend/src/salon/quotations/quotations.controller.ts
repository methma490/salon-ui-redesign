import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { CurrentTenant } from '../../tenant/decorators/current-tenant.decorator';
import { RequireFeature } from '../../tenant/decorators/require-feature.decorator';
import { RequirePermission } from '../../tenant/decorators/require-permission.decorator';
import { FeatureGuard } from '../../tenant/guards/feature.guard';
import { PermissionGuard } from '../../tenant/guards/permission.guard';
import { TenantContextGuard } from '../../tenant/guards/tenant-context.guard';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';
import {
  CancelQuotationDto,
  ConvertQuotationDto,
  CreateQuotationDto,
  ListQuotationsQueryDto,
  UpdateQuotationDto,
} from './dto/quotation.dto';
import { QuotationsService } from './quotations.service';

@Controller('tenant/quotations')
@UseGuards(JwtAuthGuard, TenantContextGuard, FeatureGuard, PermissionGuard)
@RequireFeature('QUOTATIONS')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  @RequirePermission('QUOTATION_VIEW')
  list(@CurrentTenant() tenant: TenantContext, @Query() query: ListQuotationsQueryDto) {
    return this.quotationsService.list(tenant.schemaName, query);
  }

  @Get(':id')
  @RequirePermission('QUOTATION_VIEW')
  get(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.quotationsService.getById(tenant.schemaName, id, tenant.tenantId);
  }

  @Get(':id/print')
  @RequirePermission('QUOTATION_VIEW')
  @Header('Content-Type', 'text/html; charset=utf-8')
  print(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.quotationsService.getPrintHtml(tenant.schemaName, tenant.tenantId, id);
  }

  @Post()
  @RequirePermission('QUOTATION_CREATE')
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.quotationsService.create(tenant.schemaName, tenant.tenantId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermission('QUOTATION_UPDATE')
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.quotationsService.update(tenant.schemaName, tenant.tenantId, id, dto, user.id);
  }

  @Post(':id/cancel')
  @RequirePermission('QUOTATION_CANCEL')
  cancel(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto?: CancelQuotationDto,
  ) {
    return this.quotationsService.cancel(tenant.schemaName, tenant.tenantId, id, user.id, dto);
  }

  @Post(':id/whatsapp')
  @RequirePermission('QUOTATION_SEND')
  whatsapp(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.quotationsService.prepareWhatsApp(
      tenant.schemaName,
      tenant.tenantId,
      id,
      user.id,
    );
  }

  @Post(':id/sms')
  @RequirePermission('QUOTATION_SEND')
  sms(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.quotationsService.sendSms(tenant.schemaName, tenant.tenantId, id, user.id);
  }

  @Post(':id/convert')
  @RequirePermission('QUOTATION_CONVERT')
  convert(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ConvertQuotationDto,
  ) {
    return this.quotationsService.convert(
      tenant.schemaName,
      tenant.tenantId,
      id,
      dto,
      user,
    );
  }
}
