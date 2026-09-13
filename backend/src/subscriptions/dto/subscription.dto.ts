import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

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
