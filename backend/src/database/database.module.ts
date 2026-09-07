import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantProvisioningService } from './tenant-provisioning.service';

@Global()
@Module({
  providers: [PrismaService, TenantProvisioningService],
  exports: [PrismaService, TenantProvisioningService],
})
export class DatabaseModule {}
