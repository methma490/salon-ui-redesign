import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { SmsService } from '../../sms/sms.service';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';

export interface PublicInvoiceSafeData {
  token: string;
  invoiceNumber: string;
  date: Date | string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  branchName: string;
  customer: {
    name: string | null;
    phone: string | null;
    maskedPhone: string | null;
  };
  salon: {
    name: string;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
  };
  items: Array<{
    type: 'service' | 'product';
    name: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
  }>;
  payments: Array<{
    method: string;
    amount: number;
    status: string;
    date: Date | string;
  }>;
}

@Injectable()
export class InvoiceLinksService {
  private readonly logger = new Logger(InvoiceLinksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
    private readonly tenantSchemaService: TenantSchemaService,
  ) {}

  /**
   * Resolves the public bill base URL configured in environment variables.
   * e.g. PUBLIC_BILL_URL=https://bill.example.com
   */
  getPublicBillBaseUrl(): string {
    const configured = this.configService.get<string>('PUBLIC_BILL_URL')?.trim();
    if (configured) {
      return configured.replace(/\/$/, '');
    }
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim();
    if (frontendUrl) {
      return frontendUrl.replace(/\/$/, '');
    }
    return 'http://localhost:5173';
  }

  /**
   * Constructs the full public eBill URL for a given token.
   * Format: https://bill.example.com/i/{token}
   */
  buildEbillUrl(token: string): string {
    return `${this.getPublicBillBaseUrl()}/i/${token}`;
  }

  /**
   * Mask customer phone number for public display (e.g. 077****567).
   */
  maskPhoneNumber(phone?: string | null): string | null {
    if (!phone) return null;
    const clean = phone.trim();
    if (clean.length <= 5) return '***';
    if (clean.startsWith('+') && clean.length > 8) {
      const prefix = clean.slice(0, 5); // e.g. +9477
      const suffix = clean.slice(-3); // e.g. 567
      return `${prefix}****${suffix}`;
    }
    const prefix = clean.slice(0, 3); // e.g. 077
    const suffix = clean.slice(-3); // e.g. 567
    return `${prefix}****${suffix}`;
  }

  /**
   * Formats short SMS body (optimized to fit strictly within 1 SMS credit / 160 GSM-7 chars).
   * Format:
   * {Salon Name}
   * {Invoice No} | Rs.{Total}
   * eBill: {Short Bill URL}
   * Thank you!
   */
  formatSmsBody(salonName: string, invoiceNo: string, total: number | string, shortBillUrl: string): string {
    const formattedTotal = Number(total).toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    // Strip accents and emojis to strictly enforce GSM-7 single-credit compatibility
    const cleanSalon = (salonName || 'Our Salon').slice(0, 30).trim();
    const cleanInvoice = (invoiceNo || 'Invoice').trim();

    return `${cleanSalon}\n${cleanInvoice} | Rs.${formattedTotal}\neBill: ${shortBillUrl}\nThank you!`;
  }

  /**
   * Creates or retrieves an existing active invoice link for a completed sale.
   */
  async createOrGetLink(params: {
    tenantId: string;
    schemaName: string;
    saleId: string;
    saleNumber?: string;
    customerPhone?: string;
    expiresAt?: Date;
  }) {
    const { tenantId, schemaName, saleId, saleNumber, customerPhone, expiresAt } = params;

    // Check for existing link
    const existing = await this.prisma.invoiceLink.findFirst({
      where: {
        saleId,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      // If phone wasn't set earlier but is now available, update it
      if (customerPhone && !existing.customerPhone) {
        return this.prisma.invoiceLink.update({
          where: { id: existing.id },
          data: { customerPhone },
        });
      }
      return existing;
    }

    // Generate secure 16-byte base64url token (~22 characters)
    const token = randomBytes(16).toString('base64url');

    return this.prisma.invoiceLink.create({
      data: {
        token,
        tenantId,
        schemaName,
        saleId,
        saleNumber: saleNumber ?? null,
        customerPhone: customerPhone ?? null,
        smsStatus: 'NOT_SENT',
        smsAttempts: 0,
        expiresAt: expiresAt ?? null,
      },
    });
  }

  /**
   * Fetches the invoice link details for a given sale.
   */
  async getLinkForSale(tenantId: string, saleId: string) {
    const link = await this.prisma.invoiceLink.findFirst({
      where: { saleId, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!link) return null;

    return {
      ...link,
      ebillUrl: this.buildEbillUrl(link.token),
    };
  }

  /**
   * Sends or resends the eBill SMS for a sale.
   * Completely resilient and non-blocking: never throws uncaught exceptions back to caller.
   */
  async sendOrResendSms(params: {
    tenantId: string;
    schemaName: string;
    saleId: string;
    customPhone?: string;
  }): Promise<{
    success: boolean;
    status: 'NOT_SENT' | 'PENDING' | 'SENT' | 'FAILED';
    ebillUrl: string;
    sentAt?: Date | null;
    attempts: number;
    failureReason?: string | null;
    message: string;
  }> {
    const { tenantId, schemaName, saleId, customPhone } = params;

    // Query sale to obtain total, sale number, and customer info
    let saleDetails: {
      saleNumber: string;
      total: number;
      customerPhone?: string | null;
    } | null = null;

    try {
      const sales = tenantTable(schemaName, 'sales');
      const customers = tenantTable(schemaName, 'customers');

      const rows = await this.tenantSchemaService.withTenantSchema(schemaName, ({ tx }) =>
        tx.$queryRawUnsafe<
          Array<{
            saleNumber: string;
            total: string;
            customerPhone: string | null;
          }>
        >(
          `SELECT s.sale_number AS "saleNumber", s.total::text, c.phone AS "customerPhone"
           FROM ${sales} s
           LEFT JOIN ${customers} c ON s.customer_id = c.id
           WHERE s.id = $1::uuid LIMIT 1`,
          saleId,
        ),
      );

      if (rows.length > 0) {
        saleDetails = {
          saleNumber: rows[0].saleNumber,
          total: Number(rows[0].total),
          customerPhone: rows[0].customerPhone,
        };
      }
    } catch (err: any) {
      this.logger.error(`Failed to load sale details for eBill SMS (sale ${saleId}): ${err.message}`);
    }

    // Resolve customer phone
    const targetPhone =
      customPhone?.trim() || saleDetails?.customerPhone?.trim() || undefined;

    // Retrieve or create link
    const link = await this.createOrGetLink({
      tenantId,
      schemaName,
      saleId,
      saleNumber: saleDetails?.saleNumber,
      customerPhone: targetPhone,
    });

    const ebillUrl = this.buildEbillUrl(link.token);

    if (!targetPhone) {
      const reason = 'Customer phone number is not available';
      const updated = await this.prisma.invoiceLink.update({
        where: { id: link.id },
        data: {
          smsStatus: 'NOT_SENT',
          smsFailureReason: reason,
        },
      });

      return {
        success: false,
        status: updated.smsStatus,
        ebillUrl,
        sentAt: updated.smsSentAt,
        attempts: updated.smsAttempts,
        failureReason: reason,
        message: 'Customer phone number is required to send eBill SMS',
      };
    }

    // Mark as PENDING and increment attempts
    const updatedPending = await this.prisma.invoiceLink.update({
      where: { id: link.id },
      data: {
        customerPhone: targetPhone,
        smsStatus: 'PENDING',
        smsAttempts: { increment: 1 },
      },
    });

    // Fetch tenant salon name
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const salonName = tenant?.name || 'Dart Smart Salon';
    const saleNumber = saleDetails?.saleNumber || link.saleNumber || 'Sale';
    const total = saleDetails?.total ?? 0;

    const messageText = this.formatSmsBody(salonName, saleNumber, total, ebillUrl);

    // Send SMS via SmsService
    const sendResult = await this.smsService.sendSms(targetPhone, messageText);

    if (sendResult.success) {
      const sentTime = new Date();
      const finalLink = await this.prisma.invoiceLink.update({
        where: { id: link.id },
        data: {
          smsStatus: 'SENT',
          smsSentAt: sentTime,
          smsFailureReason: null,
        },
      });

      return {
        success: true,
        status: finalLink.smsStatus,
        ebillUrl,
        sentAt: finalLink.smsSentAt,
        attempts: finalLink.smsAttempts,
        failureReason: null,
        message: 'eBill sent via SMS successfully',
      };
    } else {
      const failureReason = sendResult.error || 'Failed to dispatch SMS via gateway';
      const finalLink = await this.prisma.invoiceLink.update({
        where: { id: link.id },
        data: {
          smsStatus: 'FAILED',
          smsFailureReason: failureReason,
        },
      });

      return {
        success: false,
        status: finalLink.smsStatus,
        ebillUrl,
        sentAt: finalLink.smsSentAt,
        attempts: finalLink.smsAttempts,
        failureReason,
        message: failureReason,
      };
    }
  }

  /**
   * Securely resolves a public invoice by its unique link token.
   * Ensures STRICT privacy:
   * - No schema names exposed
   * - No internal raw UUIDs exposed (outside public token)
   * - No cost prices, profit margins, or commission rates exposed
   * - Customer phone number is securely masked
   */
  async getPublicInvoiceByToken(token: string): Promise<PublicInvoiceSafeData> {
    if (!token || token.trim().length === 0) {
      throw new BadRequestException('Invalid invoice token');
    }

    const link = await this.prisma.invoiceLink.findUnique({
      where: { token: token.trim() },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Digital invoice not found or link has expired');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new NotFoundException('This digital invoice link has expired');
    }

    const schemaName = link.schemaName;
    const saleId = link.saleId;

    const sales = tenantTable(schemaName, 'sales');
    const branches = tenantTable(schemaName, 'branches');
    const customers = tenantTable(schemaName, 'customers');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const services = tenantTable(schemaName, 'services');
    const products = tenantTable(schemaName, 'products');
    const payments = tenantTable(schemaName, 'payments');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const saleRows = await tx.$queryRawUnsafe<
        Array<{
          saleNumber: string;
          subtotal: string;
          discount: string;
          total: string;
          status: string;
          branchName: string;
          customerName: string | null;
          customerPhone: string | null;
          createdAt: Date;
        }>
      >(
        `SELECT s.sale_number AS "saleNumber",
                s.subtotal::text, s.discount::text, s.total::text,
                s.status::text AS status,
                b.name AS "branchName",
                c.name AS "customerName",
                c.phone AS "customerPhone",
                (s.created_at AT TIME ZONE 'Asia/Colombo') AS "createdAt"
         FROM ${sales} s
         INNER JOIN ${branches} b ON s.branch_id = b.id
         LEFT JOIN ${customers} c ON s.customer_id = c.id
         WHERE s.id = $1::uuid LIMIT 1`,
        saleId,
      );

      if (saleRows.length === 0) {
        throw new NotFoundException('Sale invoice data could not be located');
      }

      const sale = saleRows[0];

      // Safe item breakdown: strips costs, profit margins, commissions
      const itemRows = await tx.$queryRawUnsafe<
        Array<{
          itemType: 'service' | 'product';
          serviceName: string | null;
          productName: string | null;
          quantity: number;
          unitPrice: string;
          discount: string;
          total: string;
        }>
      >(
        `SELECT si.item_type AS "itemType",
                sv.name AS "serviceName",
                p.name AS "productName",
                si.quantity,
                si.unit_price::text AS "unitPrice",
                si.discount::text AS "discount",
                si.total::text AS "total"
         FROM ${saleItems} si
         LEFT JOIN ${services} sv ON si.service_id = sv.id
         LEFT JOIN ${products} p ON si.product_id = p.id
         WHERE si.sale_id = $1::uuid
         ORDER BY si.created_at ASC`,
        saleId,
      );

      // Safe payment breakdown: strips raw IDs and sensitive references
      const paymentRows = await tx.$queryRawUnsafe<
        Array<{
          method: string;
          amount: string;
          status: string;
          createdAt: Date;
        }>
      >(
        `SELECT method::text AS method,
                amount::text AS amount,
                status::text AS status,
                (created_at AT TIME ZONE 'Asia/Colombo') AS "createdAt"
         FROM ${payments}
         WHERE sale_id = $1::uuid
         ORDER BY created_at ASC`,
        saleId,
      );

      const items = itemRows.map((item) => ({
        type: item.itemType,
        name: item.serviceName || item.productName || 'Item',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        total: Number(item.total),
      }));

      const paymentList = paymentRows.map((p) => ({
        method: p.method,
        amount: Number(p.amount),
        status: p.status,
        date: p.createdAt,
      }));

      return {
        token: link.token,
        invoiceNumber: sale.saleNumber,
        date: sale.createdAt,
        status: sale.status,
        subtotal: Number(sale.subtotal),
        discount: Number(sale.discount),
        tax: 0,
        total: Number(sale.total),
        branchName: sale.branchName,
        customer: {
          name: sale.customerName,
          phone: sale.customerPhone || link.customerPhone || null,
          maskedPhone: this.maskPhoneNumber(sale.customerPhone || link.customerPhone),
        },
        salon: {
          name: link.tenant.name,
          phone: link.tenant.phone,
          email: link.tenant.email,
          logoUrl: link.tenant.logoUrl,
          primaryColor: link.tenant.primaryColor,
        },
        items,
        payments: paymentList,
      };
    });
  }
}
