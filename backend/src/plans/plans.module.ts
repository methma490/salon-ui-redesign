import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlansController } from './plans.controller';
import { PublicPlansController } from './public-plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [PlansController, PublicPlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
