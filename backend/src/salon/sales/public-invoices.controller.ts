import { Controller, Get, Param } from '@nestjs/common';
import { InvoiceLinksService } from './invoice-links.service';

@Controller('public/invoices')
export class PublicInvoicesController {
  constructor(private readonly invoiceLinksService: InvoiceLinksService) {}

  @Get(':token')
  getInvoiceByToken(@Param('token') token: string) {
    return this.invoiceLinksService.getPublicInvoiceByToken(token);
  }
}
