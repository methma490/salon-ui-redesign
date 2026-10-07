import { Injectable } from '@nestjs/common';
import { PaymentGatewayProvider } from '@prisma/client';
import { PayHereService, PayHereNotifyPayload } from '../payhere.service';
import {
  CreateCheckoutInput,
  GatewayCheckoutSession,
  GatewayVerificationResult,
  PaymentGateway,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class PayHereGateway implements PaymentGateway {
  readonly provider = PaymentGatewayProvider.PAYHERE;

  constructor(private readonly payHereService: PayHereService) {}

  isConfigured(): boolean {
    return this.payHereService.isConfigured();
  }

  createCheckoutSession(input: CreateCheckoutInput): GatewayCheckoutSession {
    const checkout = this.payHereService.buildCheckoutParams({
      orderId: input.orderReference,
      amount: input.amount,
      currency: input.currency,
      items: input.description,
      firstName: input.customer.firstName,
      lastName: input.customer.lastName,
      email: input.customer.email,
      phone: input.customer.phone,
      address: input.customer.address,
      city: input.customer.city,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
      notifyUrl: this.payHereService.notifyUrl || input.notifyUrl,
    });

    return {
      gateway: this.provider,
      orderReference: input.orderReference,
      redirectData: checkout as unknown as Record<string, unknown>,
    };
  }

  verifyWebhook(payload: unknown): GatewayVerificationResult {
    const body = payload as PayHereNotifyPayload;
    const rawPayload = body as unknown as Record<string, unknown>;

    if (!this.payHereService.isConfigured()) {
      return {
        valid: false,
        orderReference: body?.order_id ?? '',
        transactionId: body?.payment_id ?? null,
        status: 'pending',
        amount: null,
        currency: null,
        rawPayload,
        error: 'PayHere is not configured',
      };
    }

    const signatureValid = this.payHereService.verifyNotifySignature(body);

    let status: GatewayVerificationResult['status'] = 'pending';
    if (body.status_code === '2') {
      status = 'paid';
    } else if (body.status_code === '-1' || body.status_code === '-2') {
      status = 'failed';
    }

    return {
      valid: signatureValid,
      orderReference: body.order_id,
      transactionId: body.payment_id ?? null,
      status,
      amount: body.payhere_amount ? Number(body.payhere_amount) : null,
      currency: body.payhere_currency ?? null,
      rawPayload,
      error: signatureValid ? undefined : 'Invalid PayHere signature',
    };
  }
}
