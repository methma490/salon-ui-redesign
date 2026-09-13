import { Module, forwardRef } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { PlansModule } from '../plans/plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PayHereController } from '../payments/payhere.controller';
import { SignupController } from './signup.controller';
import { SignupService } from './signup.service';

@Module({
  imports: [PlansModule, forwardRef(() => PaymentsModule), SubscriptionsModule],
  controllers: [SignupController, PayHereController],
  providers: [SignupService],
  exports: [SignupService],
})
export class SignupModule {}
