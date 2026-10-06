import { Global, Module, forwardRef } from '@nestjs/common';
import { StorageService } from './storage.service';
import { FileAccessController } from './file-access.controller';
import { TenantModule } from '../../tenant/tenant.module';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';

@Global()
@Module({
  imports: [forwardRef(() => TenantModule), forwardRef(() => SubscriptionsModule)],
  controllers: [FileAccessController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
