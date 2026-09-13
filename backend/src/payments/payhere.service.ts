import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

export interface PayHereCheckoutParams {
  sandbox: boolean;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  amount: string;
  currency: string;
  hash: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

export interface PayHereNotifyPayload {
  merchant_id: string;
  order_id: string;
  payment_id?: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
}

@Injectable()
export class PayHereService implements OnModuleInit {
  private readonly logger = new Logger(PayHereService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (!this.isConfigured()) {
      this.logger.warn('PayHere is not configured — set PAYHERE_MERCHANT_ID and PAYHERE_SECRET');
      return;
    }

    if (
      this.merchantId === 'your_merchant_id' ||
      this.merchantSecret === 'your_merchant_secret'
    ) {
      this.logger.error(
        'PayHere is using placeholder credentials from .env.example — update backend/.env and restart the server',
      );
      return;
    }

    this.logger.log(
      `PayHere ${this.sandbox ? 'sandbox' : 'live'} mode (merchant ${this.merchantId})`,
    );
  }

  get merchantId(): string {
    return this.configService.get<string>('payhere.merchantId', '');
  }

  get merchantSecret(): string {
    return this.configService.get<string>('payhere.merchantSecret', '');
  }

  get sandbox(): boolean {
    return this.configService.get<boolean>('payhere.sandbox', true);
  }

  isConfigured(): boolean {
    return Boolean(this.merchantId && this.merchantSecret);
  }

  formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  generateCheckoutHash(orderId: string, amount: string, currency: string): string {
    const secretHash = this.md5Upper(this.merchantSecret);
    return this.md5Upper(`${this.merchantId}${orderId}${amount}${currency}${secretHash}`);
  }

  verifyNotifySignature(payload: PayHereNotifyPayload): boolean {
    if (!this.isConfigured()) {
      return false;
    }

    const secretHash = this.md5Upper(this.merchantSecret);
    const localSig = this.md5Upper(
      `${payload.merchant_id}${payload.order_id}${payload.payhere_amount}${payload.payhere_currency}${payload.status_code}${secretHash}`,
    );

    return localSig === payload.md5sig;
  }

  buildCheckoutParams(input: {
    orderId: string;
    amount: number;
    currency: string;
    items: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    returnUrl: string;
    cancelUrl: string;
    notifyUrl: string;
  }): PayHereCheckoutParams {
    const amount = this.formatAmount(input.amount);
    const hash = this.generateCheckoutHash(input.orderId, amount, input.currency);

    return {
      sandbox: this.sandbox,
      merchant_id: this.merchantId,
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      notify_url: input.notifyUrl,
      order_id: input.orderId,
      items: input.items,
      amount,
      currency: input.currency,
      hash,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      city: input.city,
      country: 'Sri Lanka',
    };
  }

  private md5Upper(value: string): string {
    return createHash('md5').update(value, 'utf8').digest('hex').toUpperCase();
  }
}
