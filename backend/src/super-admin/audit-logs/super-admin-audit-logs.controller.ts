import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  GetAuditLogsQueryParams,
  SuperAdminAuditLogsService,
} from './super-admin-audit-logs.service';

@Controller('super-admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminAuditLogsController {
  constructor(private readonly auditLogsService: SuperAdminAuditLogsService) {}

  @Get()
  async getAuditLogs(@Query() query: GetAuditLogsQueryParams) {
    return this.auditLogsService.getAuditLogs(query);
  }
}
