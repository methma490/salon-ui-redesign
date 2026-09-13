import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentListQueryDto } from './dto/payment-list-query.dto';
import { PaymentOrdersService } from './payment-orders.service';

@Controller('super-admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminPaymentsController {
  constructor(private readonly paymentOrders: PaymentOrdersService) {}

  @Get()
  list(@Query() query: PaymentListQueryDto) {
    return this.paymentOrders.listForAdmin(query);
  }
}
