import { Injectable } from '@nestjs/common';
import { PaymentGatewayProvider } from '@prisma/client';
import {
  CreateCheckoutInput,
  GatewayCheckoutSession,
  GatewayVerificationResult,
  PaymentGateway,
} from '../interfaces/payment-gateway.interface';

/** Placeholder adapter for future Koko payment integration. */
@Injectable()
export class KokoGateway implements PaymentGateway {
  readonly provider = PaymentGatewayProvider.KOKO;

  isConfigured(): boolean {
    return false;
  }

  createCheckoutSession(_input: CreateCheckoutInput): GatewayCheckoutSession {
    throw new Error('Koko payment gateway is not configured');
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
      error: 'Koko payment gateway is not configured',
    };
  }
}
