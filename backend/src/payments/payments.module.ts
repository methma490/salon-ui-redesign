import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import payhereConfig from '../config/payhere.config';
import { AuthModule } from '../auth/auth.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TenantModule } from '../tenant/tenant.module';
import { KokoGateway } from './gateways/koko.gateway';
import { PayHereGateway } from './gateways/payhere.gateway';
import { StripeGateway } from './gateways/stripe.gateway';
import { PayHereService } from './payhere.service';
import { PaymentGatewayRegistry } from './payment-gateway.registry';
import { PaymentOrdersService } from './payment-orders.service';
import { PaymentProcessorService } from './payment-processor.service';
import { PaymentsController } from './payments.controller';
import { SuperAdminPaymentsController } from './super-admin-payments.controller';

@Module({
  imports: [
    ConfigModule.forFeature(payhereConfig),
    forwardRef(() => AuthModule),
    forwardRef(() => TenantModule),
    InvoicesModule,
    NotificationsModule,
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [PaymentsController, SuperAdminPaymentsController],
  providers: [
    PayHereService,
    PayHereGateway,
    KokoGateway,
    StripeGateway,
    PaymentGatewayRegistry,
    PaymentOrdersService,
    PaymentProcessorService,
  ],
  exports: [
    PayHereService,
    PaymentGatewayRegistry,
    PaymentOrdersService,
    PaymentProcessorService,
  ],
})
export class PaymentsModule {}
