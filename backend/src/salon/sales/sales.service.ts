import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../database/prisma.service';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { ListSalesQueryDto } from '../pos/dto/pos.dto';
import { MessagingService } from '../quotations/messaging.service';

@Injectable()
export class SalesService {
  constructor(
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly messagingService: MessagingService,
  ) {}

  async list(schemaName: string, query: ListSalesQueryDto) {
    const sales = tenantTable(schemaName, 'sales');
    const branches = tenantTable(schemaName, 'branches');
    const customers = tenantTable(schemaName, 'customers');
    const users = tenantTable(schemaName, 'users');
    const { page, limit, offset } = resolvePagination(query.page, query.limit);

    const conditions: string[] = [`s.status = 'COMPLETED'`];
    const params: unknown[] = [];
    let idx = 1;

    if (query.startDate) {
      conditions.push(`s.created_at >= $${idx++}::date`);
      params.push(query.startDate);
    }
    if (query.endDate) {
      conditions.push(`s.created_at < ($${idx++}::date + INTERVAL '1 day')`);
      params.push(query.endDate);
    }
    if (query.branchId) {
      conditions.push(`s.branch_id = $${idx++}::uuid`);
      params.push(query.branchId);
    }
    if (query.cashierId) {
      conditions.push(`s.cashier_id = $${idx++}::uuid`);
      params.push(query.cashierId);
    }
    if (query.search) {
      conditions.push(`(s.sale_number ILIKE $${idx} OR c.name ILIKE $${idx})`);
      params.push(`%${query.search}%`);
      idx++;
    }

    let employeeJoin = '';
    if (query.employeeId) {
      const saleItems = tenantTable(schemaName, 'sale_items');
      const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
      employeeJoin = `
        INNER JOIN ${saleItems} si ON si.sale_id = s.id
        INNER JOIN ${saleItemEmployees} sie ON sie.sale_item_id = si.id
      `;
      conditions.push(`sie.employee_id = $${idx++}::uuid`);
      params.push(query.employeeId);
    }

    const whereClause = conditions.join(' AND ');
    const fromClause = `
         FROM ${sales} s
         INNER JOIN ${branches} b ON s.branch_id = b.id
         LEFT JOIN ${customers} c ON s.customer_id = c.id
         LEFT JOIN ${users} u ON s.cashier_id = u.id
         ${employeeJoin}
         WHERE ${whereClause}`;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(DISTINCT s.id)::bigint AS count ${fromClause}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);

      const data = await tx.$queryRawUnsafe(
        `SELECT DISTINCT s.id, s.sale_number AS "saleNumber",
                s.subtotal, s.discount, s.total, s.status::text AS status,
                s.branch_id AS "branchId", b.name AS "branchName",
                s.customer_id AS "customerId", c.name AS "customerName",
                s.cashier_id AS "cashierId", u.name AS "cashierName",
                s.created_at AS "createdAt"
         ${fromClause}
         ORDER BY s.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      );

      return buildPaginatedResponse(data as unknown[], total, page, limit);
    });
  }

  async findById(schemaName: string, id: string) {
    const sales = tenantTable(schemaName, 'sales');
    const branches = tenantTable(schemaName, 'branches');
    const customers = tenantTable(schemaName, 'customers');
    const users = tenantTable(schemaName, 'users');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const saleEmployees = tenantTable(schemaName, 'sale_employees');
    const services = tenantTable(schemaName, 'services');
    const products = tenantTable(schemaName, 'products');
    const employees = tenantTable(schemaName, 'employees');
    const payments = tenantTable(schemaName, 'payments');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const saleRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          saleNumber: string;
          subtotal: string;
          discount: string;
          total: string;
          refundedAmount: string;
          status: string;
          branchId: string;
          branchName: string;
          customerId: string | null;
          customerName: string | null;
          cashierId: string | null;
          cashierName: string | null;
          createdAt: Date;
        }>
      >(
        `SELECT s.id, s.sale_number AS "saleNumber",
                s.subtotal::text, s.discount::text, s.total::text,
                COALESCE(s.refunded_amount, 0)::text AS "refundedAmount",
                s.status::text AS status,
                s.branch_id AS "branchId", b.name AS "branchName",
                s.customer_id AS "customerId", c.name AS "customerName",
                s.cashier_id AS "cashierId", u.name AS "cashierName",
                s.created_at AS "createdAt"
         FROM ${sales} s
         INNER JOIN ${branches} b ON s.branch_id = b.id
         LEFT JOIN ${customers} c ON s.customer_id = c.id
         LEFT JOIN ${users} u ON s.cashier_id = u.id
         WHERE s.id = $1::uuid LIMIT 1`,
        id,
      );

      if (saleRows.length === 0) {
        throw new NotFoundException('Sale not found');
      }

      const assignedEmployees = await tx.$queryRawUnsafe(
        `SELECT se.id, se.employee_id AS "employeeId", e.name AS "employeeName",
                e.code AS "employeeCode", e.designation,
                se.assignment_type::text AS "assignmentType",
                se.allocation_percentage::float AS "allocationPercentage",
                se.commissionable_amount::float AS "commissionableAmount"
         FROM ${saleEmployees} se
         INNER JOIN ${employees} e ON e.id = se.employee_id
         WHERE se.sale_id = $1::uuid
         ORDER BY CASE WHEN se.assignment_type::text = 'PRIMARY' THEN 0 ELSE 1 END, e.name`,
        id,
      );

      const items = await tx.$queryRawUnsafe(
        `SELECT si.id, si.item_type AS "itemType",
                si.service_id AS "serviceId", sv.name AS "serviceName",
                si.product_id AS "productId", p.name AS "productName",
                si.quantity, si.unit_price AS "unitPrice",
                si.discount, si.total,
                COALESCE(
                  json_agg(json_build_object('id', e.id, 'name', e.name))
                  FILTER (WHERE e.id IS NOT NULL),
                  '[]'::json
                ) AS employees
         FROM ${saleItems} si
         LEFT JOIN ${services} sv ON si.service_id = sv.id
         LEFT JOIN ${products} p ON si.product_id = p.id
         LEFT JOIN ${saleItemEmployees} sie ON sie.sale_item_id = si.id
         LEFT JOIN ${employees} e ON sie.employee_id = e.id
         WHERE si.sale_id = $1::uuid
         GROUP BY si.id, sv.name, p.name
         ORDER BY MIN(si.created_at) ASC`,
        id,
      );

      const paymentRows = await tx.$queryRawUnsafe(
        `SELECT id, method::text AS method, amount, status::text AS status,
                reference_number AS "referenceNumber", created_at AS "createdAt"
         FROM ${payments} WHERE sale_id = $1::uuid ORDER BY created_at ASC`,
        id,
      );

      return {
        ...saleRows[0],
        subtotal: Number(saleRows[0].subtotal),
        discount: Number(saleRows[0].discount),
        total: Number(saleRows[0].total),
        refundedAmount: Number(saleRows[0].refundedAmount ?? 0),
        assignedEmployees,
        items,
        payments: paymentRows,
      };
    });
  }

  async getPublicEbill(id: string) {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        schemaName: true,
        name: true,
        phone: true,
        email: true,
        logoUrl: true,
      },
    });

    for (const tenant of tenants) {
      try {
        const sale = await this.findById(tenant.schemaName, id);
        if (sale) {
          return {
            ...sale,
            salon: {
              name: tenant.name,
              phone: tenant.phone,
              email: tenant.email,
              logoUrl: tenant.logoUrl,
            },
          };
        }
      } catch {
        // Sale not in this schema
      }
    }

    throw new NotFoundException('E-Bill receipt not found');
  }

  async sendEbillSms(tenantId: string, schemaName: string, saleId: string, customPhone?: string) {
    const sale = await this.findById(schemaName, saleId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    let recipientPhone = customPhone?.trim();
    if (!recipientPhone && sale.customerId) {
      const customers = tenantTable(schemaName, 'customers');
      const custRows = await this.tenantSchemaService.withTenantSchema(schemaName, ({ tx }) =>
        tx.$queryRawUnsafe<Array<{ phone: string | null }>>(
          `SELECT phone FROM ${customers} WHERE id = $1::uuid LIMIT 1`,
          sale.customerId,
        ),
      );
      recipientPhone = custRows[0]?.phone ?? undefined;
    }

    if (!recipientPhone) {
      throw new BadRequestException('Customer phone number is required to send SMS');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const ebillUrl = `${frontendUrl}/ebill/${saleId}`;
    const salonName = tenant?.name || 'our salon';
    const message = `Thank you for visiting ${salonName}! View your digital receipt (E-Bill) here: ${ebillUrl}`;

    const result = await this.messagingService.sendSms(recipientPhone, message);

    return {
      success: result.status !== 'FAILED',
      status: result.status,
      message:
        result.status !== 'FAILED'
          ? 'E-Bill sent via SMS successfully'
          : result.failureReason || 'Failed to send SMS',
      ebillUrl,
      phone: recipientPhone,
    };
  }

  async sendEbillWhatsapp(tenantId: string, schemaName: string, saleId: string, customPhone?: string) {
    const sale = await this.findById(schemaName, saleId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    let recipientPhone = customPhone?.trim();
    if (!recipientPhone && sale.customerId) {
      const customers = tenantTable(schemaName, 'customers');
      const custRows = await this.tenantSchemaService.withTenantSchema(schemaName, ({ tx }) =>
        tx.$queryRawUnsafe<Array<{ phone: string | null }>>(
          `SELECT phone FROM ${customers} WHERE id = $1::uuid LIMIT 1`,
          sale.customerId,
        ),
      );
      recipientPhone = custRows[0]?.phone ?? undefined;
    }

    const cleanDigits = recipientPhone ? recipientPhone.replace(/\D/g, '') : '';
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const ebillUrl = `${frontendUrl}/ebill/${saleId}`;
    const salonName = tenant?.name || 'our salon';
    const message = `Thank you for visiting ${salonName}! View your digital receipt (E-Bill) here: ${ebillUrl}`;

    const result = this.messagingService.buildWhatsAppDeepLink(cleanDigits, message);

    return {
      success: true,
      externalUrl: result.externalUrl,
      ebillUrl,
      phone: recipientPhone,
    };
  }
}

