import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaymentGatewayProvider } from '@prisma/client';

export enum PaymentPurpose {
  SIGNUP = 'SIGNUP',
  SUBSCRIPTION_ACTIVATE = 'SUBSCRIPTION_ACTIVATE',
  SUBSCRIPTION_RENEW = 'SUBSCRIPTION_RENEW',
  SUBSCRIPTION_UPGRADE = 'SUBSCRIPTION_UPGRADE',
  SUBSCRIPTION_ADDON_ACTIVATE = 'SUBSCRIPTION_ADDON_ACTIVATE',
}

export class CreatePaymentOrderDto {
  @IsUUID()
  subscriptionId!: string;

  @IsEnum(PaymentGatewayProvider)
  gateway!: PaymentGatewayProvider;

  @IsEnum(PaymentPurpose)
  purpose!: PaymentPurpose;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;
}

export class CreatePaymentOrderForTenantDto extends CreatePaymentOrderDto {
  @IsUUID()
  tenantId!: string;
}

export class CreateSubscriptionCheckoutDto {
  @IsUUID()
  subscriptionId!: string;

  @IsEnum(PaymentGatewayProvider)
  gateway!: PaymentGatewayProvider;

  @IsEnum(PaymentPurpose)
  purpose!: PaymentPurpose;

  /** Required when purpose is SUBSCRIPTION_UPGRADE */
  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsUUID()
  planPriceId?: string;

  @IsOptional()
  @IsEnum(['MONTHLY', 'YEARLY'])
  billingCycle?: 'MONTHLY' | 'YEARLY';
}
