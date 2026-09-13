import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaymentGatewayProvider } from '@prisma/client';

export enum PaymentPurpose {
  SIGNUP = 'SIGNUP',
  SUBSCRIPTION_ACTIVATE = 'SUBSCRIPTION_ACTIVATE',
  SUBSCRIPTION_RENEW = 'SUBSCRIPTION_RENEW',
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
}
