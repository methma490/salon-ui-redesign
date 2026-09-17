import { Controller, Get, Param, ParseUUIDPipe, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { TenantContextGuard } from '../tenant/guards/tenant-context.guard';
import { TenantContext } from '../tenant/interfaces/tenant-context.interface';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@Roles('SALON_ADMIN')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  list(@CurrentTenant() tenant: TenantContext, @Query() query: InvoiceQueryDto) {
    return this.invoicesService.listForTenant(tenant.tenantId, query);
  }

  @Get(':id/download')
  async download(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { html, filename, contentType } = await this.invoicesService.renderDownload(
      id,
      tenant.tenantId,
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  }

  @Get(':id')
  getOne(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findByIdForTenant(id, tenant.tenantId);
  }
}
