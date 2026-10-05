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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { TenantContextGuard } from '../tenant/guards/tenant-context.guard';
import { TenantContext } from '../tenant/interfaces/tenant-context.interface';
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
  ) {}

  @Get()
  list(@Query() query: SubscriptionListQueryDto) {
    return this.subscriptionsService.listForAdmin(query);
  }

  @Post()
  createForTenant(@Body() dto: CreateSubscriptionForTenantDto) {
    return this.subscriptionsService.createSubscription(dto.tenantId, dto.planId);
  }

  @Post('trial')
  createTrialForTenant(@Body() dto: CreateTrialSubscriptionForTenantDto) {
    const { tenantId, ...trialDto } = dto;
    return this.subscriptionsService.createTrialSubscription(tenantId, trialDto);
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
  activate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActivateSubscriptionForTenantDto) {
    return this.subscriptionsService.activateSubscription(id, dto.tenantId, dto);
  }

  @Post(':id/renew')
  renew(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RenewSubscriptionForTenantDto) {
    const { tenantId, ...renewDto } = dto;
    return this.subscriptionsService.renewSubscription(id, tenantId, renewDto);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() body: { tenantId: string }) {
    return this.subscriptionsService.cancelAtPeriodEnd(id, body.tenantId);
  }

  @Post(':id/upgrade')
  upgrade(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpgradeSubscriptionForTenantDto) {
    const { tenantId, ...upgradeDto } = dto;
    return this.subscriptionsService.upgradeSubscription(id, tenantId, upgradeDto, {
      allowWithoutPayment: true,
    });
  }

  @Post(':id/downgrade')
  scheduleDowngrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleDowngradeForTenantDto,
  ) {
    const { tenantId, ...downgradeDto } = dto;
    return this.subscriptionsService.scheduleDowngrade(id, tenantId, downgradeDto);
  }

  @Delete(':id/pending-downgrade')
  cancelPendingDowngrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    return this.subscriptionsService.cancelPendingDowngrade(id, tenantId);
  }

  @Get('tenant/:tenantId')
  getTenantSubscription(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.subscriptionsService.getTenantSubscriptionContext(tenantId);
  }

  @Patch(':id/plan')
  changePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeSubscriptionPlanForTenantDto,
  ) {
    return this.subscriptionsService.changePlanForTenant(id, dto.tenantId, dto.planId);
  }

  @Put(':id/features')
  updateFeatures(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionFeaturesForTenantDto,
  ) {
    return this.subscriptionsService.updateSubscriptionFeatures(id, dto.tenantId, dto.features);
  }

  @Post(':id/extend-trial')
  extendTrial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendTrialDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionsService.extendTrial(id, dto.tenantId, dto, user?.id);
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
  createSubscriptionAddOn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSubscriptionAddOnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionAddonsService.createSubscriptionAddOn(id, dto, user?.id);
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
  confirmManualPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: ConfirmManualAddonPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionAddonsService.confirmManualPayment(id, addonId, {
      ...dto,
      performedBy: user?.id,
    });
  }

  @Delete(':id/add-ons/:addonId')
  deleteSubscriptionAddOn(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: RemoveSubscriptionAddonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionAddonsService.removeSubscriptionAddOn(id, addonId, {
      ...dto,
      performedBy: user?.id,
    });
  }

  @Post(':id/add-ons/:addonId/remove')
  removeSubscriptionAddOn(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: RemoveSubscriptionAddonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionAddonsService.removeSubscriptionAddOn(id, addonId, {
      ...dto,
      performedBy: user?.id,
    });
  }

  @Post(':id/add-ons/:addonId/cancel-at-period-end')
  cancelAddonAtPeriodEnd(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: CancelAddonAtPeriodEndDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionAddonsService.removeSubscriptionAddOn(id, addonId, {
      ...dto,
      performedBy: user?.id,
    });
  }

  @Post(':id/add-ons/:addonId/undo-cancellation')
  undoAddonCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: UndoAddonCancellationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionAddonsService.undoAddonCancellation(id, addonId, {
      ...dto,
      performedBy: user?.id,
    });
  }

  @Post(':id/add-ons/:addonId/cancel-pending-payment')
  cancelPendingAddonPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: CancelPendingAddonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionAddonsService.cancelPendingAddonPayment(id, addonId, {
      ...dto,
      performedBy: user?.id,
    });
  }
}

