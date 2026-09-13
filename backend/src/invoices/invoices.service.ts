import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { InvoiceStatus, Prisma } from '@prisma/client';

import {

  buildPaginatedResponse,

  resolvePagination,

} from '../common/dto/pagination.dto';

import { PrismaService } from '../database/prisma.service';

import { AdminInvoiceQueryDto } from './dto/admin-invoice-query.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';

import { buildInvoiceHtml, InvoiceIssuerInfo } from './utils/invoice-html.util';



export interface GenerateInvoiceInput {

  paymentOrderId: string;

  paymentId: string;

  transactionId: string;

  paidAt: Date;

}



@Injectable()

export class InvoicesService {

  private readonly logger = new Logger(InvoicesService.name);



  constructor(

    private readonly prisma: PrismaService,

    private readonly configService: ConfigService,

  ) {}



  /**

   * Generate an invoice after a verified successful payment.

   * Idempotent — one invoice per payment record.

   */

  async generateFromPayment(input: GenerateInvoiceInput) {

    const existing = await this.prisma.invoice.findUnique({

      where: { paymentId: input.paymentId },

      include: { items: true },

    });



    if (existing) {

      return existing;

    }



    const order = await this.prisma.paymentOrder.findUnique({

      where: { id: input.paymentOrderId },

      include: {

        tenant: true,

        subscription: { include: { plan: true } },

      },

    });



    if (!order) {

      this.logger.warn(`Cannot generate invoice — payment order ${input.paymentOrderId} not found`);

      return null;

    }



    const metadata = (order.metadata ?? {}) as Record<string, string | null>;

    const salonName = metadata.salonName ?? order.tenant.name;
    const salonEmail = order.tenant.email ?? metadata.adminEmail ?? metadata.customerEmail ?? null;
    const salonPhone = order.tenant.phone ?? null;
    const customerName = metadata.customerName ?? metadata.salonName ?? order.tenant.name;
    const customerEmail =
      metadata.customerEmail ?? metadata.adminEmail ?? order.tenant.email ?? 'billing@salon.local';
    const customerPhone =
      metadata.customerPhone ?? order.tenant.phone ?? null;



    const plan = order.subscription.plan;

    const amount = order.amount;

    const billingCycle = order.subscription.billingCycle;

    const lineDescription = `${plan.name} — ${billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'} subscription`;



    const invoiceNumber = await this.nextInvoiceNumber();



    try {

      return await this.prisma.invoice.create({

        data: {

          invoiceNumber,

          tenantId: order.tenantId,

          subscriptionId: order.subscriptionId,

          paymentId: input.paymentId,

          paymentOrderId: order.id,

          status: InvoiceStatus.PAID,

          currency: order.currency,

          subtotal: amount,

          total: amount,

          paidAt: input.paidAt,

          salonName,

          salonEmail,

          salonPhone,

          customerName,

          customerEmail,

          customerPhone,

          planName: plan.name,

          planCode: plan.code,

          billingCycle,

          paymentMethod: order.gateway,

          paymentReference: input.transactionId,

          items: {

            create: [

              {

                description: lineDescription,

                quantity: 1,

                unitPrice: amount,

                amount,

                sortOrder: 0,

              },

            ],

          },

        },

        include: { items: true },

      });

    } catch (error) {

      if (

        error instanceof Prisma.PrismaClientKnownRequestError &&

        error.code === 'P2002'

      ) {

        return this.prisma.invoice.findUnique({

          where: { paymentId: input.paymentId },

          include: { items: true },

        });

      }



      throw error;

    }

  }



  async listForTenant(tenantId: string, query: InvoiceQueryDto) {

    const { page, limit, offset } = resolvePagination(query.page, query.limit);

    const where: Prisma.InvoiceWhereInput = {

      tenantId,

      ...(query.status ? { status: query.status } : {}),

    };



    const [data, total] = await Promise.all([

      this.prisma.invoice.findMany({

        where,

        orderBy: { issueDate: 'desc' },

        skip: offset,

        take: limit,

        include: { items: { orderBy: { sortOrder: 'asc' } } },

      }),

      this.prisma.invoice.count({ where }),

    ]);



    return buildPaginatedResponse(data, total, page, limit);

  }



  async findByIdForTenant(id: string, tenantId: string) {

    const invoice = await this.prisma.invoice.findFirst({

      where: { id, tenantId },

      include: { items: { orderBy: { sortOrder: 'asc' } } },

    });



    if (!invoice) {

      throw new NotFoundException('Invoice not found');

    }



    return invoice;

  }



  async listForAdmin(query: AdminInvoiceQueryDto) {
    const { page, limit, offset } = resolvePagination(query.page, query.limit);
    const where: Prisma.InvoiceWhereInput = {
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { issueDate: 'desc' },
        skip: offset,
        take: limit,
        include: {
          tenant: { select: { id: true, name: true, code: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findByIdForAdmin(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, code: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async renderDownloadForAdmin(id: string) {
    const invoice = await this.findByIdForAdmin(id);
    const issuer = this.getIssuerInfo();
    const html = buildInvoiceHtml(invoice, issuer);

    return {
      html,
      filename: `${invoice.invoiceNumber}.html`,
      contentType: 'text/html; charset=utf-8',
    };
  }

  async renderDownload(id: string, tenantId: string) {

    const invoice = await this.findByIdForTenant(id, tenantId);

    const issuer = this.getIssuerInfo();

    const html = buildInvoiceHtml(invoice, issuer);



    return {

      html,

      filename: `${invoice.invoiceNumber}.html`,

      contentType: 'text/html; charset=utf-8',

    };

  }



  private getIssuerInfo(): InvoiceIssuerInfo {

    return {

      name: this.configService.get<string>('invoice.issuerName', 'Salon360'),

      email: this.configService.get<string>('invoice.issuerEmail', 'billing@salon360.local'),

      address: this.configService.get<string>('invoice.issuerAddress', 'Colombo, Sri Lanka'),

    };

  }



  private async nextInvoiceNumber(): Promise<string> {

    const year = new Date().getFullYear();

    const prefix = `INV-${year}-`;



    const last = await this.prisma.invoice.findFirst({

      where: { invoiceNumber: { startsWith: prefix } },

      orderBy: { invoiceNumber: 'desc' },

      select: { invoiceNumber: true },

    });



    const lastSeq = last ? Number.parseInt(last.invoiceNumber.slice(prefix.length), 10) : 0;

    const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;



    return `${prefix}${String(nextSeq).padStart(6, '0')}`;

  }

}


