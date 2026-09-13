import { Injectable } from '@nestjs/common';
import { PaymentGatewayProvider } from '@prisma/client';
import {
  CreateCheckoutInput,
  GatewayCheckoutSession,
  GatewayVerificationResult,
  PaymentGateway,
} from '../interfaces/payment-gateway.interface';

/** Placeholder adapter for future Stripe payment integration. */
@Injectable()
export class StripeGateway implements PaymentGateway {
  readonly provider = PaymentGatewayProvider.STRIPE;

  isConfigured(): boolean {
    return false;
  }

  createCheckoutSession(_input: CreateCheckoutInput): GatewayCheckoutSession {
    throw new Error('Stripe payment gateway is not configured');
  }

  verifyWebhook(payload: unknown): GatewayVerificationResult {
    return {
      valid: false,
      orderReference: '',
      transactionId: null,
      status: 'pending',
      amount: null,
      currency: null,
      rawPayload: (payload ?? {}) as Record<string, unknown>,
      error: 'Stripe payment gateway is not configured',
    };
  }
}
