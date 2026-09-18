import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { APP_NAME_FALLBACK } from '../../config/brand.constants';
import { logAudit } from '../utils/audit.util';
import { PosService } from '../pos/pos.service';
import {
  ConvertQuotationDto,
  CreateQuotationDto,
  ListQuotationsQueryDto,
  UpdateQuotationDto,
} from './dto/quotation.dto';
import { MessagingService } from './messaging.service';
import {
  buildSmsQuotationMessage,
  buildWhatsAppQuotationMessage,
  messageUsesPlatformAsPrimaryBrand,
  resolveQuotationSalonBrand,
  toPublicQuotationView,
} from './quotation-branding';
import { normalizePhoneE164, phoneDigitsForWhatsApp } from './phone.util';
import {
  calculateQuotationTotals,
  resolveDisplayStatus,
} from './quotation-money';
import {
  formatSriLankaDate,
  sriLankaTodayIso,
  toDateOnlyString,
} from '../../common/utils/sri-lanka-time';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly prisma: PrismaService,
    private readonly messagingService: MessagingService,
    private readonly posService: PosService,
    private readonly configService: ConfigService,
  ) {}

  private statusCast(schemaName: string, paramIndex: number) {
    return `$${paramIndex}::text::"${schemaName}".quotation_status`;
  }

  private channelCast(schemaName: string, paramIndex: number) {
    return `$${paramIndex}::text::"${schemaName}".quotation_message_channel`;
  }

  private messageStatusCast(schemaName: string, paramIndex: number) {
    return `$${paramIndex}::text::"${schemaName}".quotation_message_status`;
  }

  private async resolveSalonBranding(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        phone: true,
        email: true,
        logoUrl: true,
        primaryColor: true,
      },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  private publicBaseUrl() {
    return (
      this.configService.get<string>('PUBLIC_APP_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5173'
    ).replace(/\/$/, '');
  }

  private buildPublicUrl(token: string) {
    return `${this.publicBaseUrl()}/q/${token}`;
  }

  private newPublicToken() {
    return randomBytes(24).toString('base64url');
  }

  /** Concurrent-safe QT number: per-schema advisory lock + max+1. */
  private async nextQuotationNo(
    tx: {
      $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
      $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>;
    },
    schemaName: string,
    quotationsTable: string,
  ): Promise<string> {
    // Must use executeRaw — advisory lock returns void and breaks $queryRaw deserialize.
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1::text))`,
      `${schemaName}:quotations`,
    );
    const rows = await tx.$queryRawUnsafe<Array<{ max: number | null }>>(
      `SELECT MAX(
         CASE
           WHEN quotation_no ~ '^QT-[0-9]+$'
           THEN SUBSTRING(quotation_no FROM 4)::int
           ELSE NULL
         END
       )::int AS max
       FROM ${quotationsTable}`,
    );
    const next = Number(rows[0]?.max ?? 0) + 1;
    return `QT-${String(next).padStart(6, '0')}`;
  }

  async create(
    schemaName: string,
    tenantId: string,
    dto: CreateQuotationDto,
    userId: string,
  ) {
    const salon = await this.resolveSalonBranding(tenantId);
    const salonNameSnapshot = resolveQuotationSalonBrand(salon.name);
    const quotations = tenantTable(schemaName, 'quotations');
    const itemsTable = tenantTable(schemaName, 'quotation_items');
    const services = tenantTable(schemaName, 'services');
    const customers = tenantTable(schemaName, 'customers');
    const branches = tenantTable(schemaName, 'branches');
    const status = dto.status ?? 'DRAFT';
    const statusCast = this.statusCast(schemaName, 12);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const branch = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${branches} WHERE id = $1::uuid AND status = 'ACTIVE' LIMIT 1`,
        dto.branchId,
      );
      if (!branch.length) throw new NotFoundException('Active branch not found');

      const customer = await tx.$queryRawUnsafe<Array<{ id: string; phone: string | null }>>(
        `SELECT id, phone FROM ${customers} WHERE id = $1::uuid AND status = 'ACTIVE' LIMIT 1`,
        dto.customerId,
      );
      if (!customer.length) throw new NotFoundException('Customer not found');

      const resolvedItems: Array<{
        serviceId: string;
        descriptionSnapshot: string;
        quantity: number;
        originalServicePrice: number;
        quotationUnitPrice: number;
        discountAmount: number;
        employeeId: string | null;
      }> = [];

      for (const item of dto.items) {
        const svc = await tx.$queryRawUnsafe<
          Array<{ id: string; name: string; price: string; is_active: boolean }>
        >(
          `SELECT id, name, price::text, is_active FROM ${services} WHERE id = $1::uuid LIMIT 1`,
          item.serviceId,
        );
        if (!svc.length || !svc[0].is_active) {
          throw new NotFoundException(`Service not found or inactive: ${item.serviceId}`);
        }
        resolvedItems.push({
          serviceId: item.serviceId,
          descriptionSnapshot: svc[0].name,
          quantity: item.quantity,
          originalServicePrice: Number(svc[0].price),
          quotationUnitPrice: item.quotationUnitPrice,
          discountAmount: item.discountAmount ?? 0,
          employeeId: item.employeeId ?? null,
        });
      }

      let totals;
      try {
        totals = calculateQuotationTotals(
          resolvedItems.map((i) => ({
            quantity: i.quantity,
            quotationUnitPrice: i.quotationUnitPrice,
            discountAmount: i.discountAmount,
          })),
          dto.discountAmount ?? 0,
          0,
        );
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : 'Invalid totals');
      }

      const quotationNo = await this.nextQuotationNo(tx, schemaName, quotations);
      const publicToken = this.newPublicToken();
      const quotationDate =
        toDateOnlyString(dto.quotationDate) ?? sriLankaTodayIso();
      const validUntil = toDateOnlyString(dto.validUntil ?? null);

      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${quotations}
           (quotation_no, branch_id, customer_id, quotation_date, valid_until,
            subtotal, discount_amount, tax_amount, total_amount, status,
            customer_notes, internal_notes, salon_name_snapshot, public_token, created_by)
         VALUES (
           $1, $2::uuid, $3::uuid, $4::date, $5::date,
           $6::numeric, $7::numeric, $8::numeric, $9::numeric, ${statusCast},
           $10, $11, $13, $14, $15::uuid
         )
         RETURNING id`,
        quotationNo,
        dto.branchId,
        dto.customerId,
        quotationDate,
        validUntil,
        totals.subtotal,
        totals.discountAmount,
        totals.taxAmount,
        totals.totalAmount,
        dto.customerNotes ?? null,
        dto.internalNotes ?? null,
        status,
        salonNameSnapshot,
        publicToken,
        userId,
      );

      const quotationId = rows[0].id;
      let sort = 0;
      for (let i = 0; i < resolvedItems.length; i++) {
        const item = resolvedItems[i];
        const line = totals.lines[i];
        await tx.$queryRawUnsafe(
          `INSERT INTO ${itemsTable}
             (quotation_id, service_id, description_snapshot, quantity,
              original_service_price, quotation_unit_price, discount_amount, line_total,
              employee_id, sort_order)
           VALUES (
             $1::uuid, $2::uuid, $3, $4::numeric,
             $5::numeric, $6::numeric, $7::numeric, $8::numeric,
             $9::uuid, $10
           )`,
          quotationId,
          item.serviceId,
          item.descriptionSnapshot,
          item.quantity,
          item.originalServicePrice,
          item.quotationUnitPrice,
          line.discountAmount,
          line.lineTotal,
          item.employeeId,
          sort++,
        );
      }

      await logAudit(tx, schemaName, {
        userId,
        action: 'QUOTATION_CREATE',
        entityType: 'quotation',
        entityId: quotationId,
        details: { quotationNo, totalAmount: totals.totalAmount, status },
      });

      return {
        id: quotationId,
        quotationNo,
        publicToken,
        publicUrl: this.buildPublicUrl(publicToken),
        totalAmount: totals.totalAmount,
        status,
        salonName: salonNameSnapshot,
      };
    });
  }

  async list(schemaName: string, query: ListQuotationsQueryDto) {
    const quotations = tenantTable(schemaName, 'quotations');
    const customers = tenantTable(schemaName, 'customers');
    const branches = tenantTable(schemaName, 'branches');
    const { page, limit, offset } = resolvePagination(query.page, query.limit);

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    if (query.branchId) {
      conditions.push(`q.branch_id = $${idx++}::uuid`);
      params.push(query.branchId);
    }
    if (query.customerId) {
      conditions.push(`q.customer_id = $${idx++}::uuid`);
      params.push(query.customerId);
    }
    if (query.status && query.status !== 'EXPIRED') {
      conditions.push(`q.status = $${idx++}::text::"${schemaName}".quotation_status`);
      params.push(query.status);
    }
    if (query.status === 'EXPIRED') {
      conditions.push(
        `q.status = 'SENT'::"${schemaName}".quotation_status AND q.valid_until IS NOT NULL AND q.valid_until < CURRENT_DATE`,
      );
    }
    if (query.fromDate) {
      conditions.push(`q.quotation_date >= $${idx++}::date`);
      params.push(query.fromDate.slice(0, 10));
    }
    if (query.toDate) {
      conditions.push(`q.quotation_date <= $${idx++}::date`);
      params.push(query.toDate.slice(0, 10));
    }
    if (query.search?.trim()) {
      conditions.push(
        `(q.quotation_no ILIKE $${idx} OR c.name ILIKE $${idx} OR c.phone ILIKE $${idx})`,
      );
      params.push(`%${query.search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');
    const fromClause = `
      FROM ${quotations} q
      INNER JOIN ${customers} c ON q.customer_id = c.id
      INNER JOIN ${branches} b ON q.branch_id = b.id
      WHERE ${whereClause}`;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count ${fromClause}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);
      const data = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT q.id, q.quotation_no AS "quotationNo",
                q.branch_id AS "branchId", b.name AS "branchName",
                q.customer_id AS "customerId", c.name AS "customerName", c.phone AS "customerPhone",
                q.quotation_date::text AS "quotationDate",
                q.valid_until::text AS "validUntil",
                q.subtotal::float8 AS subtotal,
                q.discount_amount::float8 AS "discountAmount",
                q.total_amount::float8 AS "totalAmount",
                q.status::text AS status,
                q.salon_name_snapshot AS "salonNameSnapshot",
                q.converted_sale_id AS "convertedSaleId",
                q.created_at AS "createdAt"
         ${fromClause}
         ORDER BY q.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      );

      const mapped = data.map((row) => ({
        ...row,
        displayStatus: resolveDisplayStatus(
          String(row.status),
          row.validUntil as string | null,
        ),
      }));

      return buildPaginatedResponse(mapped, total, page, limit);
    });
  }

  async getById(schemaName: string, id: string, tenantId: string) {
    const detail = await this.loadQuotationDetail(schemaName, { id });
    const salon = await this.resolveSalonBranding(tenantId);
    return {
      ...detail,
      publicUrl: this.buildPublicUrl(detail.publicToken),
      salon: {
        name: salon.name,
        phone: salon.phone,
        email: salon.email,
        logoUrl: salon.logoUrl,
        primaryColor: salon.primaryColor,
      },
      platformName: APP_NAME_FALLBACK,
    };
  }

  async update(
    schemaName: string,
    tenantId: string,
    id: string,
    dto: UpdateQuotationDto,
    userId: string,
  ) {
    const existing = await this.loadQuotationDetail(schemaName, { id });
    if (!['DRAFT', 'SENT'].includes(existing.status)) {
      throw new BadRequestException('Only draft or sent quotations can be edited');
    }
    if (existing.status === 'SENT' && dto.items) {
      // Material change on SENT — allow but keep status SENT for re-send
    }

    const createDto: CreateQuotationDto = {
      branchId: dto.branchId ?? existing.branchId,
      customerId: dto.customerId ?? existing.customerId,
      quotationDate: dto.quotationDate ?? existing.quotationDate,
      validUntil: dto.validUntil ?? existing.validUntil ?? undefined,
      items:
        dto.items ??
        existing.items.map((item) => ({
          serviceId: item.serviceId!,
          quantity: item.quantity,
          quotationUnitPrice: item.quotationUnitPrice,
          discountAmount: item.discountAmount,
          employeeId: item.employeeId ?? undefined,
        })),
      discountAmount: dto.discountAmount ?? existing.discountAmount,
      customerNotes: dto.customerNotes ?? existing.customerNotes ?? undefined,
      internalNotes: dto.internalNotes ?? existing.internalNotes ?? undefined,
      status: existing.status === 'SENT' ? 'SENT' : 'DRAFT',
    };

    // Replace by cancelling old token path: update in place
    return this.replaceQuotation(schemaName, tenantId, id, createDto, userId, existing.status);
  }

  private async replaceQuotation(
    schemaName: string,
    tenantId: string,
    id: string,
    dto: CreateQuotationDto,
    userId: string,
    keepStatus: string,
  ) {
    const salon = await this.resolveSalonBranding(tenantId);
    const quotations = tenantTable(schemaName, 'quotations');
    const itemsTable = tenantTable(schemaName, 'quotation_items');
    const services = tenantTable(schemaName, 'services');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const resolvedItems = [];
      for (const item of dto.items) {
        const svc = await tx.$queryRawUnsafe<
          Array<{ id: string; name: string; price: string; is_active: boolean }>
        >(
          `SELECT id, name, price::text, is_active FROM ${services} WHERE id = $1::uuid LIMIT 1`,
          item.serviceId,
        );
        if (!svc.length || !svc[0].is_active) {
          throw new NotFoundException(`Service not found or inactive: ${item.serviceId}`);
        }
        resolvedItems.push({
          serviceId: item.serviceId,
          descriptionSnapshot: svc[0].name,
          quantity: item.quantity,
          originalServicePrice: Number(svc[0].price),
          quotationUnitPrice: item.quotationUnitPrice,
          discountAmount: item.discountAmount ?? 0,
          employeeId: item.employeeId ?? null,
        });
      }

      const totals = calculateQuotationTotals(
        resolvedItems.map((i) => ({
          quantity: i.quantity,
          quotationUnitPrice: i.quotationUnitPrice,
          discountAmount: i.discountAmount,
        })),
        dto.discountAmount ?? 0,
        0,
      );

      await tx.$queryRawUnsafe(
        `UPDATE ${quotations}
         SET branch_id = $2::uuid,
             customer_id = $3::uuid,
             quotation_date = $4::date,
             valid_until = $5::date,
             subtotal = $6::numeric,
             discount_amount = $7::numeric,
             tax_amount = $8::numeric,
             total_amount = $9::numeric,
             customer_notes = $10,
             internal_notes = $11,
             salon_name_snapshot = $12,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.branchId,
        dto.customerId,
        toDateOnlyString(dto.quotationDate) ?? sriLankaTodayIso(),
        toDateOnlyString(dto.validUntil ?? null),
        totals.subtotal,
        totals.discountAmount,
        totals.taxAmount,
        totals.totalAmount,
        dto.customerNotes ?? null,
        dto.internalNotes ?? null,
        resolveQuotationSalonBrand(salon.name),
      );

      await tx.$queryRawUnsafe(`DELETE FROM ${itemsTable} WHERE quotation_id = $1::uuid`, id);
      let sort = 0;
      for (let i = 0; i < resolvedItems.length; i++) {
        const item = resolvedItems[i];
        const line = totals.lines[i];
        await tx.$queryRawUnsafe(
          `INSERT INTO ${itemsTable}
             (quotation_id, service_id, description_snapshot, quantity,
              original_service_price, quotation_unit_price, discount_amount, line_total,
              employee_id, sort_order)
           VALUES ($1::uuid, $2::uuid, $3, $4::numeric, $5::numeric, $6::numeric, $7::numeric, $8::numeric, $9::uuid, $10)`,
          id,
          item.serviceId,
          item.descriptionSnapshot,
          item.quantity,
          item.originalServicePrice,
          item.quotationUnitPrice,
          line.discountAmount,
          line.lineTotal,
          item.employeeId,
          sort++,
        );
      }

      await logAudit(tx, schemaName, {
        userId,
        action: 'QUOTATION_UPDATE',
        entityType: 'quotation',
        entityId: id,
        details: { status: keepStatus },
      });

      return { id, status: keepStatus };
    });
  }

  async cancel(schemaName: string, id: string, userId: string) {
    const detail = await this.loadQuotationDetail(schemaName, { id });
    if (['CONVERTED', 'CANCELLED'].includes(detail.status)) {
      throw new BadRequestException('Quotation cannot be cancelled');
    }
    const quotations = tenantTable(schemaName, 'quotations');
    const statusCast = this.statusCast(schemaName, 2);
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${quotations}
         SET status = ${statusCast}, updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        'CANCELLED',
      );
      await logAudit(tx, schemaName, {
        userId,
        action: 'QUOTATION_CANCEL',
        entityType: 'quotation',
        entityId: id,
      });
      return { id, status: 'CANCELLED' };
    });
  }

  async prepareWhatsApp(schemaName: string, tenantId: string, id: string, userId: string) {
    const detail = await this.loadQuotationDetail(schemaName, { id });
    if (detail.status === 'CANCELLED') {
      throw new BadRequestException('Cancelled quotations cannot be sent');
    }
    const salon = await this.resolveSalonBranding(tenantId);
    const salonName = resolveQuotationSalonBrand(salon.name);
    const phone = detail.customerPhone;
    if (!phone) {
      throw new BadRequestException('Customer does not have a valid phone number.');
    }
    const digits = phoneDigitsForWhatsApp(phone);
    if (!digits) {
      throw new BadRequestException('Customer does not have a valid phone number.');
    }

    const url = this.buildPublicUrl(detail.publicToken);
    const message = buildWhatsAppQuotationMessage({
      customerName: detail.customerName,
      quotationNo: detail.quotationNo,
      salonName,
      totalAmount: detail.totalAmount,
      publicUrl: url,
    });

    if (messageUsesPlatformAsPrimaryBrand(message, salonName)) {
      throw new BadRequestException('Invalid salon branding in message');
    }

    const result = this.messagingService.buildWhatsAppDeepLink(digits, message);
    await this.recordMessage(schemaName, {
      quotationId: id,
      channel: 'WHATSAPP',
      recipient: digits,
      message,
      status: result.status,
      providerMessageId: result.providerMessageId,
      userId,
    });
    await this.markSentIfDraft(schemaName, id, userId);

    return {
      channel: 'WHATSAPP',
      status: result.status,
      externalUrl: result.externalUrl,
      recipient: digits,
      salonName,
      platformName: APP_NAME_FALLBACK,
    };
  }

  async sendSms(schemaName: string, tenantId: string, id: string, userId: string) {
    const detail = await this.loadQuotationDetail(schemaName, { id });
    if (detail.status === 'CANCELLED') {
      throw new BadRequestException('Cancelled quotations cannot be sent');
    }
    const salon = await this.resolveSalonBranding(tenantId);
    const salonName = resolveQuotationSalonBrand(salon.name);
    const phone = detail.customerPhone;
    if (!phone) {
      throw new BadRequestException('Customer does not have a valid phone number.');
    }
    const e164 = normalizePhoneE164(phone);
    if (!e164) {
      throw new BadRequestException('Customer does not have a valid phone number.');
    }

    const url = this.buildPublicUrl(detail.publicToken);
    const message = buildSmsQuotationMessage({
      quotationNo: detail.quotationNo,
      salonName,
      totalAmount: detail.totalAmount,
      publicUrl: url,
    });

    if (messageUsesPlatformAsPrimaryBrand(message, salonName)) {
      throw new BadRequestException('Invalid salon branding in message');
    }

    const result = await this.messagingService.sendSms(e164, message);
    await this.recordMessage(schemaName, {
      quotationId: id,
      channel: 'SMS',
      recipient: e164,
      message,
      status: result.status,
      providerMessageId: result.providerMessageId,
      failureReason: result.failureReason,
      userId,
    });
    if (result.status === 'SENT') {
      await this.markSentIfDraft(schemaName, id, userId);
    }

    return {
      channel: 'SMS',
      status: result.status,
      recipient: e164,
      failureReason: result.failureReason ?? null,
      salonName,
    };
  }

  async getPublicByToken(token: string) {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        schemaName: true,
        name: true,
        phone: true,
        email: true,
        logoUrl: true,
        primaryColor: true,
      },
    });

    for (const tenant of tenants) {
      try {
        const detail = await this.loadQuotationDetail(tenant.schemaName, { publicToken: token });
        if (['CANCELLED'].includes(detail.status)) continue;
        const displayStatus = resolveDisplayStatus(detail.status, detail.validUntil);
        return toPublicQuotationView({
          quotationNo: detail.quotationNo,
          quotationDate: detail.quotationDate,
          validUntil: detail.validUntil,
          customerName: detail.customerName,
          customerNotes: detail.customerNotes,
          subtotal: detail.subtotal,
          discountAmount: detail.discountAmount,
          totalAmount: detail.totalAmount,
          status: displayStatus,
          canRespond:
            ['SENT', 'DRAFT'].includes(detail.status) && displayStatus !== 'EXPIRED',
          items: detail.items.map((i) => ({
            description: i.descriptionSnapshot,
            quantity: i.quantity,
            unitPrice: i.quotationUnitPrice,
            lineTotal: i.lineTotal,
          })),
          salon: {
            name: detail.salonNameSnapshot || tenant.name,
            phone: tenant.phone,
            email: tenant.email,
            logoUrl: tenant.logoUrl,
            primaryColor: tenant.primaryColor,
          },
        });
      } catch {
        // token not in this tenant
      }
    }
    throw new NotFoundException('Quotation not found');
  }

  async acceptPublic(token: string, meta?: { ip?: string; userAgent?: string }) {
    return this.respondPublic(token, 'ACCEPTED', undefined, meta);
  }

  async declinePublic(token: string, reason?: string) {
    return this.respondPublic(token, 'DECLINED', reason);
  }

  private async respondPublic(
    token: string,
    nextStatus: 'ACCEPTED' | 'DECLINED',
    reason?: string,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { schemaName: true, name: true },
    });

    for (const tenant of tenants) {
      try {
        const detail = await this.loadQuotationDetail(tenant.schemaName, { publicToken: token });
        const display = resolveDisplayStatus(detail.status, detail.validUntil);
        if (display === 'EXPIRED') {
          throw new BadRequestException('This quotation has expired');
        }
        if (!['SENT', 'DRAFT'].includes(detail.status)) {
          throw new BadRequestException(`Quotation cannot be ${nextStatus.toLowerCase()}`);
        }

        const quotations = tenantTable(tenant.schemaName, 'quotations');
        const statusCast = this.statusCast(tenant.schemaName, 2);

        await this.tenantSchemaService.withTenantSchema(tenant.schemaName, async ({ tx }) => {
          if (nextStatus === 'ACCEPTED') {
            await tx.$queryRawUnsafe(
              `UPDATE ${quotations}
               SET status = ${statusCast},
                   accepted_at = NOW(),
                   accepted_ip = $3,
                   accepted_user_agent = $4,
                   updated_at = NOW()
               WHERE id = $1::uuid`,
              detail.id,
              'ACCEPTED',
              meta?.ip ?? null,
              meta?.userAgent ?? null,
            );
          } else {
            await tx.$queryRawUnsafe(
              `UPDATE ${quotations}
               SET status = ${statusCast},
                   declined_at = NOW(),
                   decline_reason = $3,
                   updated_at = NOW()
               WHERE id = $1::uuid`,
              detail.id,
              'DECLINED',
              reason ?? null,
            );
          }
        });

        return {
          status: nextStatus,
          salonName: detail.salonNameSnapshot || tenant.name,
          message:
            nextStatus === 'ACCEPTED'
              ? `Quotation accepted successfully. ${detail.salonNameSnapshot || tenant.name} will contact you regarding the next step.`
              : 'Quotation declined.',
        };
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        if (error instanceof NotFoundException) continue;
      }
    }
    throw new NotFoundException('Quotation not found');
  }

  async convert(
    schemaName: string,
    tenantId: string,
    id: string,
    dto: ConvertQuotationDto,
    user: AuthenticatedUser,
  ) {
    const detail = await this.loadQuotationDetail(schemaName, { id });
    if (detail.convertedSaleId) {
      throw new ConflictException({
        message: 'Quotation already converted',
        convertedSaleId: detail.convertedSaleId,
      });
    }
    if (detail.status !== 'ACCEPTED') {
      throw new BadRequestException('Only accepted quotations can be converted');
    }

    const performerMap = new Map(
      (dto.itemPerformers ?? []).map((p) => [p.quotationItemId, p.employeeId]),
    );

    const services = detail.items.map((item) => {
      const employeeId = performerMap.get(item.id) ?? item.employeeId;
      if (!employeeId) {
        throw new BadRequestException(
          `Performer required for service line: ${item.descriptionSnapshot}`,
        );
      }
      if (!item.serviceId) {
        throw new BadRequestException(`Missing service for line: ${item.descriptionSnapshot}`);
      }
      return {
        serviceId: item.serviceId,
        employeeId,
        quantity: item.quantity,
        unitPrice: item.quotationUnitPrice,
        discount: item.discountAmount,
      };
    });

    const sale = await this.posService.createSaleFromSnapshot(schemaName, user, {
      branchId: detail.branchId,
      customerId: detail.customerId,
      discount: detail.discountAmount,
      services,
      products: [],
      payments: dto.payments,
      quotationId: detail.id,
    });

    const quotations = tenantTable(schemaName, 'quotations');
    const statusCast = this.statusCast(schemaName, 3);
    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const updated = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `UPDATE ${quotations}
         SET status = ${statusCast},
             converted_sale_id = $2::uuid,
             updated_at = NOW()
         WHERE id = $1::uuid
           AND converted_sale_id IS NULL
           AND status = 'ACCEPTED'::"${schemaName}".quotation_status
         RETURNING id`,
        id,
        sale.id,
        'CONVERTED',
      );
      if (!updated.length) {
        throw new ConflictException('Quotation was already converted');
      }
      await logAudit(tx, schemaName, {
        userId: user.id,
        action: 'QUOTATION_CONVERT',
        entityType: 'quotation',
        entityId: id,
        details: { saleId: sale.id, saleNumber: sale.saleNumber },
      });
    });

    return {
      quotationId: id,
      status: 'CONVERTED',
      saleId: sale.id,
      saleNumber: sale.saleNumber,
    };
  }

  async getPrintHtml(schemaName: string, tenantId: string, id: string) {
    const detail = await this.getById(schemaName, id, tenantId);
    const salonName = detail.salonNameSnapshot || detail.salon.name;
    const rows = detail.items
      .map(
        (i) =>
          `<tr><td>${escapeHtml(i.descriptionSnapshot)}</td><td style="text-align:right">${i.quantity}</td><td style="text-align:right">${formatLkr(i.quotationUnitPrice)}</td><td style="text-align:right">${formatLkr(i.lineTotal)}</td></tr>`,
      )
      .join('');

    return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(detail.quotationNo)}</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;padding:24px}
h1{margin:0 0 4px;font-size:22px;color:${detail.salon.primaryColor || '#0d5c3d'}}
.muted{color:#64748b;font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:18px}
th,td{border-bottom:1px solid #e2e8f0;padding:8px;font-size:13px;text-align:left}
.total{font-size:18px;font-weight:700;margin-top:16px}
.footer{margin-top:28px;font-size:11px;color:#94a3b8}
</style></head><body>
<h1>${escapeHtml(salonName)}</h1>
<p class="muted">QUOTATION ${escapeHtml(detail.quotationNo)}</p>
<p><strong>Customer:</strong> ${escapeHtml(detail.customerName)} · ${escapeHtml(detail.customerPhone || '')}</p>
<p><strong>Date:</strong> ${escapeHtml(formatSriLankaDate(detail.quotationDate))} · <strong>Valid until:</strong> ${escapeHtml(detail.validUntil ? formatSriLankaDate(detail.validUntil) : '—')}</p>
<table><thead><tr><th>Service</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
<p class="total">Total: ${formatLkr(detail.totalAmount)}</p>
${detail.customerNotes ? `<p><strong>Notes:</strong> ${escapeHtml(detail.customerNotes)}</p>` : ''}
<p class="footer">Powered by ${escapeHtml(APP_NAME_FALLBACK)}</p>
</body></html>`;
  }

  private async markSentIfDraft(schemaName: string, id: string, userId: string) {
    const quotations = tenantTable(schemaName, 'quotations');
    const statusCast = this.statusCast(schemaName, 2);
    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${quotations}
         SET status = ${statusCast}, updated_at = NOW()
         WHERE id = $1::uuid AND status = 'DRAFT'::"${schemaName}".quotation_status`,
        id,
        'SENT',
      );
      await logAudit(tx, schemaName, {
        userId,
        action: 'QUOTATION_SEND',
        entityType: 'quotation',
        entityId: id,
      });
    });
  }

  private async recordMessage(
    schemaName: string,
    data: {
      quotationId: string;
      channel: 'WHATSAPP' | 'SMS';
      recipient: string;
      message: string;
      status: string;
      providerMessageId?: string | null;
      failureReason?: string | null;
      userId: string;
    },
  ) {
    const messages = tenantTable(schemaName, 'quotation_messages');
    const channelCast = this.channelCast(schemaName, 2);
    const statusCast = this.messageStatusCast(schemaName, 4);
    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `INSERT INTO ${messages}
           (quotation_id, channel, recipient, message, status, provider_message_id, sent_at, failed_at, failure_reason, created_by)
         VALUES (
           $1::uuid, ${channelCast}, $3, $5, ${statusCast}, $6,
           CASE WHEN $4 IN ('SENT','OPENED_EXTERNALLY','DELIVERED') THEN NOW() ELSE NULL END,
           CASE WHEN $4 = 'FAILED' THEN NOW() ELSE NULL END,
           $7, $8::uuid
         )`,
        data.quotationId,
        data.channel,
        data.recipient,
        data.status,
        data.message,
        data.providerMessageId ?? null,
        data.failureReason ?? null,
        data.userId,
      );
    });
  }

  private async loadQuotationDetail(
    schemaName: string,
    key: { id?: string; publicToken?: string },
  ) {
    const quotations = tenantTable(schemaName, 'quotations');
    const itemsTable = tenantTable(schemaName, 'quotation_items');
    const messages = tenantTable(schemaName, 'quotation_messages');
    const customers = tenantTable(schemaName, 'customers');
    const branches = tenantTable(schemaName, 'branches');

    const where = key.id
      ? `q.id = $1::uuid`
      : `q.public_token = $1`;
    const param = key.id ?? key.publicToken;
    if (!param) throw new BadRequestException('Missing quotation key');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          quotationNo: string;
          branchId: string;
          branchName: string;
          customerId: string;
          customerName: string;
          customerPhone: string | null;
          quotationDate: string;
          validUntil: string | null;
          subtotal: number;
          discountAmount: number;
          taxAmount: number;
          totalAmount: number;
          status: string;
          customerNotes: string | null;
          internalNotes: string | null;
          salonNameSnapshot: string;
          publicToken: string;
          convertedSaleId: string | null;
          acceptedAt: Date | null;
          declinedAt: Date | null;
          declineReason: string | null;
          createdAt: Date;
        }>
      >(
        `SELECT q.id, q.quotation_no AS "quotationNo",
                q.branch_id AS "branchId", b.name AS "branchName",
                q.customer_id AS "customerId", c.name AS "customerName", c.phone AS "customerPhone",
                q.quotation_date::text AS "quotationDate",
                q.valid_until::text AS "validUntil",
                q.subtotal::float8 AS subtotal,
                q.discount_amount::float8 AS "discountAmount",
                q.tax_amount::float8 AS "taxAmount",
                q.total_amount::float8 AS "totalAmount",
                q.status::text AS status,
                q.customer_notes AS "customerNotes",
                q.internal_notes AS "internalNotes",
                q.salon_name_snapshot AS "salonNameSnapshot",
                q.public_token AS "publicToken",
                q.converted_sale_id AS "convertedSaleId",
                q.accepted_at AS "acceptedAt",
                q.declined_at AS "declinedAt",
                q.decline_reason AS "declineReason",
                q.created_at AS "createdAt"
         FROM ${quotations} q
         INNER JOIN ${customers} c ON q.customer_id = c.id
         INNER JOIN ${branches} b ON q.branch_id = b.id
         WHERE ${where}
         LIMIT 1`,
        param,
      );
      if (!rows.length) throw new NotFoundException('Quotation not found');

      const items = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          serviceId: string | null;
          descriptionSnapshot: string;
          quantity: number;
          originalServicePrice: number;
          quotationUnitPrice: number;
          discountAmount: number;
          lineTotal: number;
          employeeId: string | null;
        }>
      >(
        `SELECT id, service_id AS "serviceId", description_snapshot AS "descriptionSnapshot",
                quantity::float8 AS quantity,
                original_service_price::float8 AS "originalServicePrice",
                quotation_unit_price::float8 AS "quotationUnitPrice",
                discount_amount::float8 AS "discountAmount",
                line_total::float8 AS "lineTotal",
                employee_id AS "employeeId"
         FROM ${itemsTable}
         WHERE quotation_id = $1::uuid
         ORDER BY sort_order ASC, created_at ASC`,
        rows[0].id,
      );

      const messageRows = await tx.$queryRawUnsafe(
        `SELECT id, channel::text AS channel, recipient, message, status::text AS status,
                provider_message_id AS "providerMessageId",
                sent_at AS "sentAt", created_at AS "createdAt", failure_reason AS "failureReason"
         FROM ${messages}
         WHERE quotation_id = $1::uuid
         ORDER BY created_at DESC`,
        rows[0].id,
      );

      return {
        ...rows[0],
        displayStatus: resolveDisplayStatus(rows[0].status, rows[0].validUntil),
        items,
        messages: messageRows,
      };
    });
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatLkr(value: number) {
  return `LKR ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
