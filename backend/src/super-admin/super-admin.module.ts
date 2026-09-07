import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SalonsModule } from './salons/salons.module';
import { SuperAdminController } from './super-admin.controller';
import { DiagnosticController } from './diagnostic.controller';

@Module({
  imports: [AuthModule, SalonsModule],
  controllers: [SuperAdminController, DiagnosticController],
})
export class SuperAdminModule {}
