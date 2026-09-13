import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { TenantModule } from '../tenant/tenant.module';
import { SubscriptionFeatureService } from './subscription-feature.service';
import {
  SubscriptionsController,
  SuperAdminSubscriptionsController,
} from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => PlansModule),
    forwardRef(() => TenantModule),
  ],
  controllers: [SubscriptionsController, SuperAdminSubscriptionsController],
  providers: [SubscriptionsService, SubscriptionFeatureService],
  exports: [SubscriptionsService, SubscriptionFeatureService],
})
export class SubscriptionsModule {}
