import { Controller, Get, Param } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('public/sales')
export class PublicSalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get(':id/ebill')
  getPublicEbill(@Param('id') id: string) {
    return this.salesService.getPublicEbill(id);
  }
}
