import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SuperAdminAuditLogsController } from './super-admin-audit-logs.controller';
import { SuperAdminAuditLogsService } from './super-admin-audit-logs.service';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [SuperAdminAuditLogsController],
  providers: [SuperAdminAuditLogsService],
  exports: [SuperAdminAuditLogsService],
})
export class SuperAdminAuditLogsModule {}
