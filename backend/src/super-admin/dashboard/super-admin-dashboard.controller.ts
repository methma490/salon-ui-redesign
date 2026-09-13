import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { SuperAdminDashboardService } from './super-admin-dashboard.service';

@Controller('super-admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminDashboardController {
  constructor(private readonly dashboardService: SuperAdminDashboardService) {}

  @Get()
  getDashboard(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getDashboard(query.period ?? '30d');
  }
}
