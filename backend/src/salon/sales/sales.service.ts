import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { ListSalesQueryDto } from '../pos/dto/pos.dto';

@Injectable()
export class SalesService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  async list(schemaName: string, query: ListSalesQueryDto) {
    const sales = tenantTable(schemaName, 'sales');
    const branches = tenantTable(schemaName, 'branches');
    const customers = tenantTable(schemaName, 'customers');
    const users = tenantTable(schemaName, 'users');

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

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe(
        `SELECT DISTINCT s.id, s.sale_number AS "saleNumber",
                s.subtotal, s.discount, s.total, s.status::text AS status,
                s.branch_id AS "branchId", b.name AS "branchName",
                s.customer_id AS "customerId", c.name AS "customerName",
                s.cashier_id AS "cashierId", u.name AS "cashierName",
                s.created_at AS "createdAt"
         FROM ${sales} s
         INNER JOIN ${branches} b ON s.branch_id = b.id
         LEFT JOIN ${customers} c ON s.customer_id = c.id
         LEFT JOIN ${users} u ON s.cashier_id = u.id
         ${employeeJoin}
         WHERE ${conditions.join(' AND ')}
         ORDER BY s.created_at DESC`,
        ...params,
      ),
    );
  }

  async findById(schemaName: string, id: string) {
    const sales = tenantTable(schemaName, 'sales');
    const branches = tenantTable(schemaName, 'branches');
    const customers = tenantTable(schemaName, 'customers');
    const users = tenantTable(schemaName, 'users');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
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

      const items = await tx.$queryRawUnsafe(
        `SELECT si.id, si.item_type AS "itemType",
                si.service_id AS "serviceId", sv.name AS "serviceName",
                si.product_id AS "productId", p.name AS "productName",
                si.quantity, si.unit_price AS "unitPrice",
                si.discount, si.total,
                e.id AS "employeeId", e.name AS "employeeName"
         FROM ${saleItems} si
         LEFT JOIN ${services} sv ON si.service_id = sv.id
         LEFT JOIN ${products} p ON si.product_id = p.id
         LEFT JOIN ${saleItemEmployees} sie ON sie.sale_item_id = si.id
         LEFT JOIN ${employees} e ON sie.employee_id = e.id
         WHERE si.sale_id = $1::uuid
         ORDER BY si.created_at ASC`,
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
        items,
        payments: paymentRows,
      };
    });
  }
}
