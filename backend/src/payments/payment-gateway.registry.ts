import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentGatewayProvider } from '@prisma/client';
import { KokoGateway } from './gateways/koko.gateway';
import { PayHereGateway } from './gateways/payhere.gateway';
import { StripeGateway } from './gateways/stripe.gateway';
import { PaymentGateway } from './interfaces/payment-gateway.interface';

@Injectable()
export class PaymentGatewayRegistry {
  private readonly gateways: Map<PaymentGatewayProvider, PaymentGateway>;

  constructor(
    payHereGateway: PayHereGateway,
    kokoGateway: KokoGateway,
    stripeGateway: StripeGateway,
  ) {
    this.gateways = new Map<PaymentGatewayProvider, PaymentGateway>([
      [PaymentGatewayProvider.PAYHERE, payHereGateway],
      [PaymentGatewayProvider.KOKO, kokoGateway],
      [PaymentGatewayProvider.STRIPE, stripeGateway],
    ]);
  }

  get(provider: PaymentGatewayProvider): PaymentGateway {
    const gateway = this.gateways.get(provider);

    if (!gateway) {
      throw new BadRequestException(`Unsupported payment gateway: ${provider}`);
    }

    return gateway;
  }

  getConfigured(provider: PaymentGatewayProvider): PaymentGateway {
    const gateway = this.get(provider);

    if (!gateway.isConfigured()) {
      throw new BadRequestException(`Payment gateway ${provider} is not configured`);
    }

    return gateway;
  }

  listProviders(): Array<{ provider: PaymentGatewayProvider; configured: boolean }> {
    return [...this.gateways.entries()].map(([provider, gateway]) => ({
      provider,
      configured: gateway.isConfigured(),
    }));
  }
}
