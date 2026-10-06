import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { TenantModule } from '../tenant/tenant.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { SubscriptionFeatureService } from './subscription-feature.service';
import {
  SubscriptionsController,
  SuperAdminSubscriptionsController,
} from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

import { SubscriptionAddonsService } from './subscription-addons.service';
import { BulkAddonsService } from './bulk-addons.service';
import { SuperAdminBulkAddonsController } from './super-admin-bulk-addons.controller';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => PlansModule),
    forwardRef(() => TenantModule),
    forwardRef(() => InvoicesModule),
  ],
  controllers: [
    SubscriptionsController,
    SuperAdminSubscriptionsController,
    SuperAdminBulkAddonsController,
  ],
  providers: [
    SubscriptionsService,
    SubscriptionFeatureService,
    SubscriptionAddonsService,
    BulkAddonsService,
  ],
  exports: [
    SubscriptionsService,
    SubscriptionFeatureService,
    SubscriptionAddonsService,
    BulkAddonsService,
  ],
})
export class SubscriptionsModule {}
