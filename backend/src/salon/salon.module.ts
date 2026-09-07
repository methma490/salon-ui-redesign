import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { BranchesController } from './branches/branches.controller';
import { BranchesService } from './branches/branches.service';
import { CustomersController } from './customers/customers.controller';
import { CustomersService } from './customers/customers.service';
import { DashboardController, ReportsController } from './dashboard/dashboard.controller';
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

@Module({
  imports: [TenantModule],
  controllers: [
    BranchesController,
    EmployeesController,
    CustomersController,
    ServicesCatalogController,
    InventoryController,
    PosController,
    SalesController,
    DashboardController,
    ReportsController,
    TenantFeaturesController,
  ],
  providers: [
    BranchesService,
    EmployeesService,
    CustomersService,
    ServicesCatalogService,
    InventoryService,
    PosService,
    SalesService,
    DashboardService,
  ],
})
export class SalonModule {}
