import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TenantModule } from '../tenant/tenant.module';
import { BranchesController } from './branches/branches.controller';
import { BranchesService } from './branches/branches.service';
import { CustomersController } from './customers/customers.controller';
import { CustomersService } from './customers/customers.service';
import { DashboardController, ReportsController } from './dashboard/dashboard.controller';
import { DashboardCacheInterceptor } from './dashboard/dashboard-cache.interceptor';
import { DashboardService } from './dashboard/dashboard.service';
import { EmployeesController } from './employees/employees.controller';
import { EmployeesService } from './employees/employees.service';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryService } from './inventory/inventory.service';
import { PosController } from './pos/pos.controller';
import { PosService } from './pos/pos.service';
import { SalesController } from './sales/sales.controller';
import { SalesService } from './sales/sales.service';
import { ServicesCatalogController } from './services/services-catalog.controller';
import { ServicesCatalogService } from './services/services-catalog.service';
import { TenantFeaturesController } from './tenant-features.controller';
import { SettingsController } from './settings/settings.controller';
import { SettingsService } from './settings/settings.service';
import { AppointmentsController } from './appointments/appointments.controller';
import { AppointmentsService } from './appointments/appointments.service';
import { ExpensesController } from './expenses/expenses.controller';
import { ExpensesService } from './expenses/expenses.service';
import { PayrollController } from './payroll/payroll.controller';
import { PayrollService } from './payroll/payroll.service';
import { SalesAnalyticsController } from './sales-analytics/sales-analytics.controller';
import { SalesAnalyticsService } from './sales-analytics/sales-analytics.service';

@Module({
  imports: [TenantModule, SubscriptionsModule],
  controllers: [
    BranchesController,
    EmployeesController,
    CustomersController,
    ServicesCatalogController,
    InventoryController,
    PosController,
    SalesController,
    SalesAnalyticsController,
    DashboardController,
    ReportsController,
    TenantFeaturesController,
    SettingsController,
    AppointmentsController,
    ExpensesController,
    PayrollController,
  ],
  providers: [
    BranchesService,
    EmployeesService,
    CustomersService,
    ServicesCatalogService,
    InventoryService,
    PosService,
    SalesService,
    SalesAnalyticsService,
    DashboardService,
    DashboardCacheInterceptor,
    SettingsService,
    AppointmentsService,
    ExpensesService,
    PayrollService,
  ],
})
export class SalonModule {}
