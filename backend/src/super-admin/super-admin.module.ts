import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { SuperAdminDashboardController } from './dashboard/super-admin-dashboard.controller';
import { SuperAdminDashboardService } from './dashboard/super-admin-dashboard.service';
import { SalonsModule } from './salons/salons.module';
import { SuperAdminController } from './super-admin.controller';
import { DiagnosticController } from './diagnostic.controller';

@Module({
  imports: [AuthModule, DatabaseModule, SalonsModule],
  controllers: [SuperAdminController, DiagnosticController, SuperAdminDashboardController],
  providers: [SuperAdminDashboardService],
})
export class SuperAdminModule {}
