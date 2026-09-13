import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminInvoiceQueryDto } from './dto/admin-invoice-query.dto';
import { InvoicesService } from './invoices.service';

@Controller('super-admin/invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  list(@Query() query: AdminInvoiceQueryDto) {
    return this.invoicesService.listForAdmin(query);
  }

  @Get(':id/download')
  async download(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { html, filename, contentType } =
      await this.invoicesService.renderDownloadForAdmin(id);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findByIdForAdmin(id);
  }
}
