import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FeaturesModule } from './features/features.module';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import payhereConfig from './config/payhere.config';
import invoiceConfig from './config/invoice.config';
import redisConfig from './config/redis.config';
import { DatabaseModule } from './database/database.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { TenantModule } from './tenant/tenant.module';
import { SalonModule } from './salon/salon.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SignupModule } from './signup/signup.module';
import { PaymentsModule } from './payments/payments.module';
import { InvoicesModule } from './invoices/invoices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SmsModule } from './sms/sms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [jwtConfig, mailConfig, payhereConfig, invoiceConfig, redisConfig],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    CacheModule.register({
      isGlobal: true,
      ttl: 300_000,
      max: 100,
    }),
    DatabaseModule,
    AuthModule,
    FeaturesModule,
    SuperAdminModule,
    TenantModule,
    SalonModule,
    PlansModule,
    SubscriptionsModule,
    SignupModule,
    PaymentsModule,
    InvoicesModule,
    NotificationsModule,
    SmsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
