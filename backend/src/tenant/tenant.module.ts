import { Module } from '@nestjs/common';
import { FeatureGuard } from './guards/feature.guard';
import { PermissionGuard } from './guards/permission.guard';
import { TenantContextGuard } from './guards/tenant-context.guard';
import { TenantContextService } from './services/tenant-context.service';
import { TenantFeatureService } from './services/tenant-feature.service';
import { TenantPermissionService } from './services/tenant-permission.service';
import { TenantSchemaService } from './services/tenant-schema.service';
import { TenantTestController } from './tenant-test.controller';

@Module({
  controllers: [TenantTestController],
  providers: [
    TenantContextService,
    TenantSchemaService,
    TenantFeatureService,
    TenantPermissionService,
    TenantContextGuard,
    FeatureGuard,
    PermissionGuard,
  ],
  exports: [
    TenantContextService,
    TenantSchemaService,
    TenantFeatureService,
    TenantPermissionService,
    TenantContextGuard,
    FeatureGuard,
    PermissionGuard,
  ],
})
export class TenantModule {}
