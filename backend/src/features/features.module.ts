import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { FeaturesController } from './features.controller';
import { SuperAdminFeaturesController } from './super-admin-features.controller';
import { FeaturesService } from './features.service';

@Module({
  imports: [AuthModule, forwardRef(() => SubscriptionsModule)],
  controllers: [FeaturesController, SuperAdminFeaturesController],
  providers: [FeaturesService],
})
export class FeaturesModule {}
