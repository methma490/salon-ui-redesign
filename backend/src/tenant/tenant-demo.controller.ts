import { Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from './decorators/current-tenant.decorator';
import { TenantContextGuard } from './guards/tenant-context.guard';
import { TenantContext } from './interfaces/tenant-context.interface';
import { DemoResetService } from '../database/demo/demo-reset.service';

@Controller('tenant/demo')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class TenantDemoController {
  constructor(private readonly demoResetService: DemoResetService) {}

  /**
   * Reset demo data back to baseline state for authenticated demo salon.
   * STRICT SECURITY:
   * - Tenant ID is resolved only from authenticated JWT tenantContext.
   * - Reset is strictly forbidden for real customer salons (isDemo === false).
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetDemoData(
    @CurrentTenant() tenant: TenantContext,
    @Req() req: Request,
  ) {
    const result = await this.demoResetService.resetDemoTenant(tenant.tenantId, {
      performedBy: tenant.userEmail,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });

    return {
      success: true,
      message: 'Demo data restored successfully.',
      tenantId: result.tenantId,
      schemaName: result.schemaName,
      lastDemoResetAt: result.lastDemoResetAt,
    };
  }
}
