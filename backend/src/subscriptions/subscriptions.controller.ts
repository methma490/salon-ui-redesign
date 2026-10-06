import {
  Body,
  Controller,
  Delete,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { TenantContextGuard } from '../tenant/guards/tenant-context.guard';
import { TenantContext } from '../tenant/interfaces/tenant-context.interface';
import { SuperAdminAuditLogsService } from '../super-admin/audit-logs/super-admin-audit-logs.service';
import {
  ActivateSubscriptionForTenantDto,
  ChangeSubscriptionPlanForTenantDto,
  CreateCustomSubscriptionDto,
  CreateSubscriptionDto,
  CreateSubscriptionForTenantDto,
  CreateTrialSubscriptionDto,
  CreateTrialSubscriptionForTenantDto,
  ExtendTrialDto,
  CreateSubscriptionAddOnDto,
  RemoveSubscriptionAddonDto,
  GetAddonQuoteDto,
  ConfirmManualAddonPaymentDto,
  CancelAddonAtPeriodEndDto,
  UndoAddonCancellationDto,
  CancelPendingAddonDto,
  RenewSubscriptionDto,
  RenewSubscriptionForTenantDto,
  ScheduleDowngradeDto,
  ScheduleDowngradeForTenantDto,
  UpgradeSubscriptionDto,
  UpgradeSubscriptionForTenantDto,
  UpdateSubscriptionFeaturesForTenantDto,
} from './dto/subscription.dto';
import { SubscriptionListQueryDto } from './dto/subscription-list-query.dto';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionAddonsService } from './subscription-addons.service';
import { SubscriptionFeatureService } from './subscription-feature.service';

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
};

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @Roles('SALON_ADMIN')
  createForCurrentTenant(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.createSubscription(tenant.tenantId, dto.planId);
  }

  @Post('trial')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @Roles('SALON_ADMIN')
  createTrial(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateTrialSubscriptionDto) {
    return this.subscriptionsService.createTrialSubscription(tenant.tenantId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  getMySubscription(@CurrentTenant() tenant: TenantContext) {
    return this.subscriptionsService.getTenantSubscriptionContext(tenant.tenantId);
  }

  @Post(':id/renew')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @Roles('SALON_ADMIN')
  renew(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenewSubscriptionDto,
  ) {
    return this.subscriptionsService.renewSubscription(id, tenant.tenantId, dto);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @Roles('SALON_ADMIN')
  cancel(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.cancelAtPeriodEnd(id, tenant.tenantId);
  }

  @Delete(':id/cancel')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @Roles('SALON_ADMIN')
  undoCancel(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.undoCancelAtPeriodEnd(id, tenant.tenantId);
  }

  @Post(':id/upgrade')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @Roles('SALON_ADMIN')
  upgrade(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpgradeSubscriptionDto,
  ) {
    return this.subscriptionsService.upgradeSubscription(id, tenant.tenantId, dto);
  }

  @Post(':id/downgrade')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @Roles('SALON_ADMIN')
  scheduleDowngrade(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleDowngradeDto,
  ) {
    return this.subscriptionsService.scheduleDowngrade(id, tenant.tenantId, dto);
  }

  @Delete(':id/pending-downgrade')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @Roles('SALON_ADMIN')
  cancelPendingDowngrade(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptionsService.cancelPendingDowngrade(id, tenant.tenantId);
  }
}

@Controller('super-admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminSubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionAddonsService: SubscriptionAddonsService,
    private readonly subscriptionFeatureService: SubscriptionFeatureService,
    private readonly auditLogsService: SuperAdminAuditLogsService,
  ) {}

  @Get()
  list(@Query() query: SubscriptionListQueryDto) {
    return this.subscriptionsService.listForAdmin(query);
  }

  @Post()
  async createForTenant(
    @Body() dto: CreateSubscriptionForTenantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionsService.createSubscription(dto.tenantId, dto.planId);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_CREATE',
      entityType: 'SUBSCRIPTION',
      entityId: result.id,
      tenantId: dto.tenantId,
      newValue: { planId: dto.planId, status: result.status },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post('trial')
  async createTrialForTenant(
    @Body() dto: CreateTrialSubscriptionForTenantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const { tenantId, ...trialDto } = dto;
    const result = await this.subscriptionsService.createTrialSubscription(tenantId, trialDto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_TRIAL_CREATE',
      entityType: 'SUBSCRIPTION',
      entityId: result.id,
      tenantId,
      newValue: { planId: trialDto.planId, billingCycle: trialDto.billingCycle, status: result.status },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post('custom')
  createCustom(@Body() dto: CreateCustomSubscriptionDto) {
    return this.subscriptionsService.createCustomSubscription(dto);
  }

  @Post('process-due')
  processDueSubscriptions() {
    return this.subscriptionsService.processDueSubscriptions();
  }

  @Post(':id/activate')
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateSubscriptionForTenantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionsService.activateSubscription(id, dto.tenantId, dto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_ACTIVATE',
      entityType: 'SUBSCRIPTION',
      entityId: id,
      tenantId: dto.tenantId,
      newValue: { status: result.status, paymentMethod: dto.paymentMethod },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post(':id/renew')
  async renew(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenewSubscriptionForTenantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const { tenantId, ...renewDto } = dto;
    const result = await this.subscriptionsService.renewSubscription(id, tenantId, renewDto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_RENEW',
      entityType: 'SUBSCRIPTION',
      entityId: id,
      tenantId,
      newValue: { status: result.status, paymentMethod: renewDto.paymentMethod },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { tenantId: string },
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionsService.cancelAtPeriodEnd(id, body.tenantId);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_CANCEL',
      entityType: 'SUBSCRIPTION',
      entityId: id,
      tenantId: body.tenantId,
      newValue: { cancelAtPeriodEnd: true },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post(':id/upgrade')
  async upgrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpgradeSubscriptionForTenantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const { tenantId, ...upgradeDto } = dto;
    const result = await this.subscriptionsService.upgradeSubscription(id, tenantId, upgradeDto, {
      allowWithoutPayment: true,
    });
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_UPGRADE',
      entityType: 'SUBSCRIPTION',
      entityId: id,
      tenantId,
      newValue: { planId: upgradeDto.planId },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post(':id/downgrade')
  async scheduleDowngrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleDowngradeForTenantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const { tenantId, ...downgradeDto } = dto;
    const result = await this.subscriptionsService.scheduleDowngrade(id, tenantId, downgradeDto);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_DOWNGRADE_SCHEDULE',
      entityType: 'SUBSCRIPTION',
      entityId: id,
      tenantId,
      newValue: { planId: downgradeDto.planId },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Delete(':id/pending-downgrade')
  async cancelPendingDowngrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionsService.cancelPendingDowngrade(id, tenantId);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_DOWNGRADE_CANCEL',
      entityType: 'SUBSCRIPTION',
      entityId: id,
      tenantId,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Get('tenant/:tenantId')
  getTenantSubscription(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.subscriptionsService.getTenantSubscriptionContext(tenantId);
  }

  @Patch(':id/plan')
  async changePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeSubscriptionPlanForTenantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionsService.changePlanForTenant(id, dto.tenantId, dto.planId);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_PLAN_CHANGE',
      entityType: 'SUBSCRIPTION',
      entityId: id,
      tenantId: dto.tenantId,
      newValue: { planId: dto.planId },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Put(':id/features')
  async updateFeatures(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionFeaturesForTenantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionsService.updateSubscriptionFeatures(id, dto.tenantId, dto.features);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_FEATURES_UPDATE',
      entityType: 'SUBSCRIPTION',
      entityId: id,
      tenantId: dto.tenantId,
      newValue: { features: dto.features },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post(':id/extend-trial')
  async extendTrial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendTrialDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionsService.extendTrial(id, dto.tenantId, dto, user?.id);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_TRIAL_EXTEND',
      entityType: 'SUBSCRIPTION',
      entityId: id,
      tenantId: dto.tenantId,
      newValue: { extraDays: dto.extraDays, newTrialEnd: dto.newTrialEnd, reason: dto.reason },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Get(':id/add-ons')
  getSubscriptionAddOns(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionAddonsService.getSubscriptionAddOns(id);
  }

  @Get(':id/eligible-add-ons')
  getEligibleAddonFeatures(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionAddonsService.getEligibleAddonFeatures(id);
  }

  @Post(':id/add-ons')
  async createSubscriptionAddOn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSubscriptionAddOnDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionAddonsService.createSubscriptionAddOn(id, dto, user?.id);
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_ADDON_ADD',
      entityType: 'SUBSCRIPTION_ADDON',
      entityId: result.id,
      newValue: { featureId: dto.featureId, price: dto.price ?? dto.customPrice, reason: dto.reason ?? dto.customReason },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Get(':id/entitlements')
  async getDetailedEntitlements(@Param('id', ParseUUIDPipe) id: string) {
    const details = await this.subscriptionAddonsService.getSubscriptionAddOns(id);
    return this.subscriptionFeatureService.getDetailedEntitlements(details.tenantId);
  }

  @Post(':id/add-ons/:addonId/quote')
  getAddonQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: GetAddonQuoteDto,
  ) {
    const effective = dto.effectiveDate ? new Date(dto.effectiveDate) : undefined;
    return this.subscriptionAddonsService.getAddonProrationQuote(id, addonId, effective);
  }

  @Post(':id/add-ons/:addonId/payment-order')
  createAddonPaymentOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionAddonsService.createOrGetAddonPaymentOrder(id, addonId, user?.id);
  }

  @Get(':id/add-ons/:addonId/payment')
  getAddonPaymentDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
  ) {
    return this.subscriptionAddonsService.getAddonPaymentDetails(id, addonId);
  }

  @Post(':id/add-ons/:addonId/confirm-manual-payment')
  async confirmManualPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: ConfirmManualAddonPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionAddonsService.confirmManualPayment(id, addonId, {
      ...dto,
      performedBy: user?.id,
    });
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'MANUAL_PAYMENT_CONFIRM',
      entityType: 'SUBSCRIPTION_ADDON',
      entityId: addonId,
      newValue: { method: dto.paymentMethod, reference: dto.paymentReference, notes: dto.notes },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Delete(':id/add-ons/:addonId')
  async deleteSubscriptionAddOn(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: RemoveSubscriptionAddonDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionAddonsService.removeSubscriptionAddOn(id, addonId, {
      ...dto,
      performedBy: user?.id,
    });
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_ADDON_REMOVE',
      entityType: 'SUBSCRIPTION_ADDON',
      entityId: addonId,
      newValue: { reason: dto?.reason },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post(':id/add-ons/:addonId/remove')
  async removeSubscriptionAddOn(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: RemoveSubscriptionAddonDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionAddonsService.removeSubscriptionAddOn(id, addonId, {
      ...dto,
      performedBy: user?.id,
    });
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_ADDON_REMOVE',
      entityType: 'SUBSCRIPTION_ADDON',
      entityId: addonId,
      newValue: { reason: dto?.reason },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post(':id/add-ons/:addonId/cancel-at-period-end')
  async cancelAddonAtPeriodEnd(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: CancelAddonAtPeriodEndDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionAddonsService.removeSubscriptionAddOn(id, addonId, {
      ...dto,
      performedBy: user?.id,
    });
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_ADDON_REMOVE',
      entityType: 'SUBSCRIPTION_ADDON',
      entityId: addonId,
      newValue: { reason: dto?.reason },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post(':id/add-ons/:addonId/undo-cancellation')
  async undoAddonCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: UndoAddonCancellationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionAddonsService.undoAddonCancellation(id, addonId, {
      ...dto,
      performedBy: user?.id,
    });
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_ADDON_UNDO_CANCEL',
      entityType: 'SUBSCRIPTION_ADDON',
      entityId: addonId,
      newValue: { reason: dto?.reason },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post(':id/add-ons/:addonId/cancel-pending-payment')
  async cancelPendingAddonPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: CancelPendingAddonDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.subscriptionAddonsService.cancelPendingAddonPayment(id, addonId, {
      ...dto,
      performedBy: user?.id,
    });
    await this.auditLogsService.logAction({
      adminUserId: user.id,
      action: 'SUBSCRIPTION_ADDON_PENDING_CANCEL',
      entityType: 'SUBSCRIPTION_ADDON',
      entityId: addonId,
      newValue: { reason: dto?.reason },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return result;
  }
}

