import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubscriptionDto {
  @IsUUID()
  planId!: string;
}

export class CreateSubscriptionForTenantDto extends CreateSubscriptionDto {
  @IsUUID()
  tenantId!: string;
}

export class CreateTrialSubscriptionDto {
  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsUUID()
  planPriceId?: string;

  @IsOptional()
  @IsEnum(['MONTHLY', 'YEARLY'])
  billingCycle?: 'MONTHLY' | 'YEARLY';
}

export class CreateTrialSubscriptionForTenantDto extends CreateTrialSubscriptionDto {
  @IsUUID()
  tenantId!: string;
}

export class ActivateSubscriptionDto {
  @IsOptional()
  @IsUUID()
  planPriceId?: string;

  @IsOptional()
  @IsEnum(['MONTHLY', 'YEARLY'])
  billingCycle?: 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentReference?: string;
}

export class ActivateSubscriptionForTenantDto extends ActivateSubscriptionDto {
  @IsUUID()
  tenantId!: string;
}

export class RenewSubscriptionDto {
  @IsOptional()
  @IsUUID()
  planPriceId?: string;

  @IsOptional()
  @IsEnum(['MONTHLY', 'YEARLY'])
  billingCycle?: 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentReference?: string;
}

export class RenewSubscriptionForTenantDto extends RenewSubscriptionDto {
  @IsUUID()
  tenantId!: string;
}

export class UpgradeSubscriptionDto {
  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsUUID()
  planPriceId?: string;

  @IsOptional()
  @IsEnum(['MONTHLY', 'YEARLY'])
  billingCycle?: 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentReference?: string;
}

export class UpgradeSubscriptionForTenantDto extends UpgradeSubscriptionDto {
  @IsUUID()
  tenantId!: string;
}

export class ScheduleDowngradeDto {
  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsUUID()
  planPriceId?: string;

  @IsOptional()
  @IsEnum(['MONTHLY', 'YEARLY'])
  billingCycle?: 'MONTHLY' | 'YEARLY';
}

export class ScheduleDowngradeForTenantDto extends ScheduleDowngradeDto {
  @IsUUID()
  tenantId!: string;
}

export class ChangeSubscriptionPlanForTenantDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  planId!: string;
}

export class UpdateSubscriptionFeaturesForTenantDto {
  @IsUUID()
  tenantId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  features!: string[];
}

export class CreateCustomSubscriptionDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsString()
  planCode?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsEnum(['MONTHLY', 'YEARLY'])
  billingCycle!: 'MONTHLY' | 'YEARLY';

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  features!: string[];
}

export class ExtendTrialDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  extraDays?: number;

  @IsOptional()
  @IsString()
  newTrialEnd?: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class SetFeatureAddonPriceDto {
  @IsEnum(['MONTHLY', 'YEARLY'])
  billingCycle!: 'MONTHLY' | 'YEARLY';

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSubscriptionAddOnDto {
  @IsUUID()
  featureId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customReason?: string;
}

export class RemoveSubscriptionAddonDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class GetAddonQuoteDto {
  @IsOptional()
  @IsString()
  effectiveDate?: string;
}

export class ConfirmManualAddonPaymentDto {
  @IsString()
  @MaxLength(50)
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class BulkAddonSalonItemDto {
  @IsUUID()
  subscriptionId!: string;

  @IsOptional()
  @IsEnum(['DEFAULT', 'CUSTOM'])
  pricingMode?: 'DEFAULT' | 'CUSTOM';

  @IsOptional()
  @IsNumber()
  @Min(0)
  customPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customReason?: string;
}

export class BulkAddonPreviewDto {
  @IsUUID()
  featureId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAddonSalonItemDto)
  salons!: BulkAddonSalonItemDto[];
}

export class BulkAddonConfirmDto {
  @IsUUID()
  featureId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAddonSalonItemDto)
  salons!: BulkAddonSalonItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}

export class BulkAddonSalonsQueryDto {
  @IsUUID()
  featureId!: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  billingCycle?: string;
}

export class CancelAddonAtPeriodEndDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class UndoAddonCancellationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelPendingAddonDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
