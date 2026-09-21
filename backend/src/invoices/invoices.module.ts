import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import invoiceConfig from '../config/invoice.config';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { TenantModule } from '../tenant/tenant.module';
import { InvoicesController } from './invoices.controller';
import { SuperAdminInvoicesController } from './super-admin-invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    ConfigModule.forFeature(invoiceConfig),
    MailModule,
    forwardRef(() => AuthModule),
    forwardRef(() => TenantModule),
  ],
  controllers: [InvoicesController, SuperAdminInvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
