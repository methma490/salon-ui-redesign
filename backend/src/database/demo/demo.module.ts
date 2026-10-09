import { Global, Module } from '@nestjs/common';
import { DemoSeedService } from './demo-seed.service';
import { DemoResetService } from './demo-reset.service';
import { DemoProvisionService } from './demo-provision.service';
import { SuperAdminAuditLogsModule } from '../../super-admin/audit-logs/super-admin-audit-logs.module';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';

@Global()
@Module({
  imports: [SuperAdminAuditLogsModule, SubscriptionsModule],
  providers: [DemoSeedService, DemoResetService, DemoProvisionService],
  exports: [DemoSeedService, DemoResetService, DemoProvisionService],
})
export class DemoModule {}
