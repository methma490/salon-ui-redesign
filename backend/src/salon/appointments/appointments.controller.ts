import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { CurrentTenant } from '../../tenant/decorators/current-tenant.decorator';
import { RequireFeature } from '../../tenant/decorators/require-feature.decorator';
import { RequirePermission } from '../../tenant/decorators/require-permission.decorator';
import { FeatureGuard } from '../../tenant/guards/feature.guard';
import { PermissionGuard } from '../../tenant/guards/permission.guard';
import { TenantContextGuard } from '../../tenant/guards/tenant-context.guard';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';
import {
  CalendarAppointmentsQueryDto,
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  UpdateAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/appointment.dto';
import { AppointmentsService } from './appointments.service';

@Controller('tenant/appointments')
@UseGuards(JwtAuthGuard, TenantContextGuard, FeatureGuard, PermissionGuard)
@RequireFeature('APPOINTMENTS')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @RequirePermission('APPOINTMENT_VIEW')
  list(@CurrentTenant() tenant: TenantContext, @Query() query: ListAppointmentsQueryDto) {
    return this.appointmentsService.list(tenant.schemaName, query);
  }

  @Get('calendar')
  @RequirePermission('APPOINTMENT_VIEW')
  calendar(@CurrentTenant() tenant: TenantContext, @Query() query: CalendarAppointmentsQueryDto) {
    return this.appointmentsService.calendar(tenant.schemaName, query);
  }

  @Get(':id')
  @RequirePermission('APPOINTMENT_VIEW')
  getById(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.appointmentsService.findById(tenant.schemaName, id);
  }

  @Post()
  @RequirePermission('APPOINTMENT_CREATE')
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(tenant.schemaName, dto, user.id);
  }

  @Patch(':id')
  @RequirePermission('APPOINTMENT_UPDATE')
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(tenant.schemaName, id, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermission('APPOINTMENT_UPDATE')
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(tenant.schemaName, id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermission('APPOINTMENT_DELETE')
  cancel(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.appointmentsService.cancel(tenant.schemaName, id, user.id);
  }
}
