import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { TenantModule } from '../../tenant/tenant.module';
import { SuperAdminAuditLogsModule } from '../audit-logs/super-admin-audit-logs.module';
import { SuperAdminSalonAnalyticsController } from './super-admin-salon-analytics.controller';
import { SuperAdminSalonAnalyticsService } from './super-admin-salon-analytics.service';

import { SalonModule } from '../../salon/salon.module';

@Module({
  imports: [
    DatabaseModule,
    TenantModule,
    AuthModule,
    SuperAdminAuditLogsModule,
    SalonModule,
  ],
  controllers: [SuperAdminSalonAnalyticsController],
  providers: [SuperAdminSalonAnalyticsService],
  exports: [SuperAdminSalonAnalyticsService],
})
export class SuperAdminSalonAnalyticsModule {}
