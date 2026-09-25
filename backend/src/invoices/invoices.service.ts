import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus, PaymentOrderStatus, PaymentRecordStatus, Prisma } from '@prisma/client';
import { buildPaginatedResponse, resolvePagination } from '../common/dto/pagination.dto';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
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
export class InvoicesService implements OnModuleInit {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Optional() private readonly mailService?: MailService,
  ) {}

  async onModuleInit() {
    await this.backfillMissingInvoices().catch((err) => {
      this.logger.warn(`Initial invoice backfill warning: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  /**
   * Backfills invoices for any paid payment orders or payments that do not yet have an invoice record.
   */
  async backfillMissingInvoices(): Promise<number> {
    let generatedCount = 0;

    // 1. Check paid PaymentOrders that don't have invoices
    const paidOrders = await this.prisma.paymentOrder.findMany({
      where: {
        status: PaymentOrderStatus.PAID,
      },
      include: {
        payments: true,
        invoices: true,
      },
      take: 50,
    });

    for (const order of paidOrders) {
      if (order.invoices.length === 0) {
        let payment = order.payments[0];
        if (!payment) {
          const meta = (order.metadata ?? {}) as Record<string, any>;
          const rawTx =
            meta.payherePaymentId ??
            meta.transactionId ??
            meta.paymentId ??
            order.reference;
          const transactionId = String(rawTx);

          try {
            payment = await this.prisma.payment.create({
              data: {
                paymentOrderId: order.id,
                transactionId,
                status: PaymentRecordStatus.PAID,
                paidAt: order.updatedAt ?? order.createdAt,
              },
            });
          } catch {
            payment = (await this.prisma.payment.findFirst({
              where: { paymentOrderId: order.id },
            }))!;
          }
        }

        if (payment) {
          try {
            await this.generateFromPayment({
              paymentOrderId: order.id,
              paymentId: payment.id,
              transactionId: payment.transactionId ?? order.reference,
              paidAt: payment.paidAt ?? order.createdAt,
            });
            generatedCount++;
          } catch (error) {
            this.logger.warn(
              `Could not backfill invoice for payment order ${order.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }
    }

    // 2. Also check any orphan paid payments without invoices
    const paidPayments = await this.prisma.payment.findMany({
      where: {
        status: PaymentRecordStatus.PAID,
        invoice: null,
      },
      include: {
        paymentOrder: true,
      },
      take: 50,
    });

    for (const payment of paidPayments) {
      if (payment.paymentOrder) {
        try {
          await this.generateFromPayment({
            paymentOrderId: payment.paymentOrderId,
            paymentId: payment.id,
            transactionId: payment.transactionId ?? payment.paymentOrder.reference,
            paidAt: payment.paidAt ?? payment.createdAt,
          });
          generatedCount++;
        } catch (error) {
          this.logger.warn(
            `Could not backfill invoice for payment ${payment.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    if (generatedCount > 0) {
      this.logger.log(`Generated ${generatedCount} missing invoice(s) for existing paid payments/orders.`);
    }

    return generatedCount;
  }

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
    const customerPhone = metadata.customerPhone ?? order.tenant.phone ?? null;

    const planName = order.subscription?.plan?.name ?? 'Salon Subscription';
    const planCode = order.subscription?.plan?.code ?? 'SUBSCRIPTION';
    const amount = order.amount;
    const billingCycle = order.subscription?.billingCycle ?? 'MONTHLY';
    const lineDescription = `${planName} — ${billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'} subscription`;
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
          planName,
          planCode,
          billingCycle: billingCycle as any,
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.invoice.findUnique({
          where: { paymentId: input.paymentId },
          include: { items: true },
        });
      }

      throw error;
    }
  }

  async listForTenant(tenantId: string, query: InvoiceQueryDto) {
    await this.backfillMissingInvoices().catch(() => {});
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
        include: {
          tenant: { select: { id: true, name: true, code: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
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
    await this.backfillMissingInvoices().catch(() => {});
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

  async sendInvoiceEmail(id: string, customRecipientEmail?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, code: true, email: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const recipient =
      customRecipientEmail?.trim() ||
      invoice.customerEmail?.trim() ||
      invoice.salonEmail?.trim() ||
      invoice.tenant?.email?.trim();

    if (!recipient) {
      throw new BadRequestException('No recipient email found for this invoice');
    }

    const issuer = this.getIssuerInfo();
    const html = buildInvoiceHtml(invoice, issuer);

    if (this.mailService) {
      await this.mailService.sendMail({
        to: recipient,
        subject: `Invoice ${invoice.invoiceNumber} from ${issuer.name}`,
        html,
        attachments: [
          {
            filename: `${invoice.invoiceNumber}.html`,
            content: html,
            contentType: 'text/html; charset=utf-8',
          },
        ],
      });
    } else {
      this.logger.warn(`MailService not available — cannot send invoice ${invoice.invoiceNumber} email`);
    }

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      recipient,
      message: `Invoice ${invoice.invoiceNumber} sent successfully to ${recipient}`,
    };
  }

  async sendInvoiceEmailForTenant(id: string, tenantId: string, customRecipientEmail?: string) {
    const invoice = await this.findByIdForTenant(id, tenantId);
    return this.sendInvoiceEmail(invoice.id, customRecipientEmail);
  }

  async sendInvoiceEmailForAdmin(id: string, customRecipientEmail?: string) {
    const invoice = await this.findByIdForAdmin(id);
    return this.sendInvoiceEmail(invoice.id, customRecipientEmail);
  }

  private getIssuerInfo(): InvoiceIssuerInfo {
    return {
      name: this.configService.get<string>('invoice.issuerName', 'Dart Smart Salon'),

      email: this.configService.get<string>('invoice.issuerEmail', 'billing@dartsmartsalon.local'),

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
