import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { TenantModule } from '../../tenant/tenant.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [TenantModule, forwardRef(() => SubscriptionsModule)],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
