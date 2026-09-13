import { PaymentGatewayProvider } from '@prisma/client';

export type GatewayPaymentStatus = 'paid' | 'failed' | 'pending' | 'cancelled';

export interface CheckoutCustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country?: string;
}

export interface CreateCheckoutInput {
  orderReference: string;
  amount: number;
  currency: string;
  description: string;
  customer: CheckoutCustomerInfo;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface GatewayCheckoutSession {
  gateway: PaymentGatewayProvider;
  orderReference: string;
  redirectData: Record<string, unknown>;
}

export interface GatewayVerificationResult {
  valid: boolean;
  orderReference: string;
  transactionId: string | null;
  status: GatewayPaymentStatus;
  amount: number | null;
  currency: string | null;
  rawPayload: Record<string, unknown>;
  error?: string;
}

/** Gateway adapter — each provider implements this contract. */
export interface PaymentGateway {
  readonly provider: PaymentGatewayProvider;

  isConfigured(): boolean;

  createCheckoutSession(input: CreateCheckoutInput): GatewayCheckoutSession;

  verifyWebhook(payload: unknown): GatewayVerificationResult;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
