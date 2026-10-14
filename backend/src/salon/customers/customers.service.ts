import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable, tenantType } from '../../tenant/utils/schema-name.util';
import { logAudit } from '../utils/audit.util';
import { generateSequentialCode } from '../utils/code-generator.util';
import {
  CreateCustomerDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
  UpdateCustomerStatusDto,
} from './dto/customer.dto';

export interface CustomerRecord {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomersService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  private customerSelectSql(table: string): string {
    return `SELECT id, code, name, phone, email,
                   birthday::text AS birthday, notes,
                   status::text AS status,
                   created_at AS "createdAt", updated_at AS "updatedAt"
            FROM ${table}`;
  }

  private async fetchCustomerByIdTx(
    tx: { $queryRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown> },
    schemaName: string,
    id: string,
  ): Promise<CustomerRecord | null> {
    const table = tenantTable(schemaName, 'customers');
    const rows = (await tx.$queryRawUnsafe(
      `${this.customerSelectSql(table)} WHERE id = $1::uuid LIMIT 1`,
      id,
    )) as CustomerRecord[];
    return rows[0] ?? null;
  }

  private normalizePhone(phone: string): { raw: string; e164: string; local: string; core9: string } {
    const raw = phone.trim();
    const digits = raw.replace(/\D/g, '');
    const core9 = digits.length >= 9 ? digits.slice(-9) : digits;
    const e164 = `+94${core9}`;
    const local = core9.length === 9 ? `0${core9}` : raw;
    return { raw, e164, local, core9 };
  }

  async list(schemaName: string, query: ListCustomersQueryDto) {
    const table = tenantTable(schemaName, 'customers');
    const { page, limit, offset } = resolvePagination(query.page, query.limit);
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    if (query.phone) {
      const { core9 } = this.normalizePhone(query.phone);
      conditions.push(`(phone ILIKE $${idx} OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 9) ILIKE $${idx + 1})`);
      params.push(`%${query.phone}%`, `%${core9}%`);
      idx += 2;
    } else if (query.search) {
      const search = query.search.trim();
      const digits = search.replace(/\D/g, '');
      if (digits.length >= 4) {
        conditions.push(`(name ILIKE $${idx} OR phone ILIKE $${idx} OR email ILIKE $${idx} OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), ${Math.min(digits.length, 9)}) ILIKE $${idx + 1})`);
        params.push(`%${search}%`, `%${digits}%`);
        idx += 2;
      } else {
        conditions.push(`(name ILIKE $${idx} OR phone ILIKE $${idx} OR email ILIKE $${idx})`);
        params.push(`%${search}%`);
        idx++;
      }
    }

    if (query.status) {
      conditions.push(`status = $${idx++}::${tenantType(schemaName, 'customer_status')}`);
      params.push(query.status);
    }

    const whereClause = conditions.join(' AND ');
    const selectSql = query.summary
      ? `SELECT id, code, name, phone FROM ${table}`
      : `SELECT id, code, name, phone, email,
                birthday::text AS birthday, notes,
                status::text AS status,
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM ${table}`;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${table} WHERE ${whereClause}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);

      const data = await tx.$queryRawUnsafe(
        `${selectSql}
         WHERE ${whereClause}
         ORDER BY name ASC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      );

      return buildPaginatedResponse(data as CustomerRecord[], total, page, limit);
    });
  }

  async findById(schemaName: string, id: string): Promise<CustomerRecord> {
    const customer = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      this.fetchCustomerByIdTx(tx, schemaName, id),
    );

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async create(
    schemaName: string,
    dto: CreateCustomerDto,
    userId: string,
  ): Promise<CustomerRecord> {
    const table = tenantTable(schemaName, 'customers');
    const { raw, e164, local, core9 } = this.normalizePhone(dto.phone);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${table}
         WHERE (
           phone = $1 OR phone = $2 OR phone = $3
           OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 9) = $4
         ) LIMIT 1`,
        raw,
        e164,
        local,
        core9,
      );
      if (existing.length > 0) {
        throw new ConflictException('Customer with this mobile number already exists');
      }

      const code = await generateSequentialCode(tx, table, 'CUST-');
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${table} (code, name, phone, email, birthday, notes, status)
         VALUES ($1, $2, $3, $4, $5::date, $6, 'ACTIVE')
         RETURNING id`,
        code,
        dto.name.trim(),
        local,
        dto.email?.trim() || null,
        dto.birthday?.trim() || null,
        dto.notes?.trim() || null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'CUSTOMER_CREATE',
        entityType: 'customer',
        entityId: rows[0].id,
        details: { name: dto.name, phone: local },
      });

      const created = await this.fetchCustomerByIdTx(tx, schemaName, rows[0].id);
      if (!created) {
        throw new NotFoundException('Customer not found');
      }

      return created;
    });
  }

  async update(
    schemaName: string,
    id: string,
    dto: UpdateCustomerDto,
    userId: string,
  ): Promise<CustomerRecord> {
    const table = tenantTable(schemaName, 'customers');
    await this.findById(schemaName, id);

    let formattedPhone: string | undefined = undefined;
    if (dto.phone) {
      const { raw, e164, local, core9 } = this.normalizePhone(dto.phone);
      formattedPhone = local;

      const duplicate = await this.tenantSchemaService.withTenantSchema(
        schemaName,
        async ({ tx }) =>
          tx.$queryRawUnsafe<Array<{ id: string }>>(
            `SELECT id FROM ${table}
             WHERE (
               phone = $1 OR phone = $2 OR phone = $3
               OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 9) = $4
             ) AND id != $5::uuid LIMIT 1`,
            raw,
            e164,
            local,
            core9,
            id,
          ),
      );
      if (duplicate.length > 0) {
        throw new ConflictException('Customer with this mobile number already exists');
      }
    }

    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${table}
         SET name = COALESCE($2, name),
             phone = COALESCE($3, phone),
             email = COALESCE($4, email),
             birthday = COALESCE($5::date, birthday),
             notes = COALESCE($6, notes),
             updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.name ? dto.name.trim() : null,
        formattedPhone ?? null,
        dto.email ? dto.email.trim() : null,
        dto.birthday ? dto.birthday.trim() : null,
        dto.notes ? dto.notes.trim() : null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'CUSTOMER_UPDATE',
        entityType: 'customer',
        entityId: id,
        details: dto as Record<string, unknown>,
      });
    });

    return this.findById(schemaName, id);
  }

  async updateStatus(
    schemaName: string,
    id: string,
    dto: UpdateCustomerStatusDto,
    userId: string,
  ): Promise<CustomerRecord> {
    const table = tenantTable(schemaName, 'customers');
    await this.findById(schemaName, id);

    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${table} SET status = $2::${tenantType(schemaName, 'customer_status')}, updated_at = NOW() WHERE id = $1::uuid`,
        id,
        dto.status,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'CUSTOMER_STATUS_UPDATE',
        entityType: 'customer',
        entityId: id,
        details: { status: dto.status },
      });
    });

    return this.findById(schemaName, id);
  }

  async deleteCustomer(
    schemaName: string,
    id: string,
    userId: string,
  ): Promise<{ id: string; success: boolean }> {
    const table = tenantTable(schemaName, 'customers');
    const appointmentsTable = tenantTable(schemaName, 'appointments');
    const salesTable = tenantTable(schemaName, 'sales');

    const customer = await this.findById(schemaName, id);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      // Check appointments
      const apptCount = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${appointmentsTable} WHERE customer_id = $1::uuid`,
        id,
      );
      if (Number(apptCount[0]?.count ?? 0) > 0) {
        throw new BadRequestException(
          'Cannot delete customer with existing appointment records. You can deactivate this customer instead.',
        );
      }

      // Check sales
      const saleCount = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${salesTable} WHERE customer_id = $1::uuid`,
        id,
      );
      if (Number(saleCount[0]?.count ?? 0) > 0) {
        throw new BadRequestException(
          'Cannot delete customer with existing sales/invoice records. You can deactivate this customer instead.',
        );
      }

      await tx.$queryRawUnsafe(`DELETE FROM ${table} WHERE id = $1::uuid`, id);

      await logAudit(tx, schemaName, {
        userId,
        action: 'CUSTOMER_DELETE',
        entityType: 'customer',
        entityId: id,
        details: { name: customer.name, code: customer.code, phone: customer.phone },
      });

      return { id, success: true };
    });
  }

  async getBookingHistory(schemaName: string, customerId: string) {
    const appointments = tenantTable(schemaName, 'appointments');
    const appointmentServices = tenantTable(schemaName, 'appointment_services');
    const branches = tenantTable(schemaName, 'branches');
    const employees = tenantTable(schemaName, 'employees');

    await this.findById(schemaName, customerId);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          code: string;
          appointmentDate: string;
          startTime: string;
          endTime: string;
          status: string;
          notes: string | null;
          branchName: string;
          employeeName: string | null;
          totalPrice: number;
          services: Array<{
            id: string;
            name: string;
            price: number;
            durationMinutes: number | null;
          }>;
        }>
      >(
        `SELECT a.id, a.code,
                a.appointment_date::text AS "appointmentDate",
                a.start_time::text AS "startTime",
                a.end_time::text AS "endTime",
                a.status::text AS status,
                a.notes,
                b.name AS "branchName",
                e.name AS "employeeName",
                COALESCE(
                  (SELECT SUM(aps.price)::float FROM ${appointmentServices} aps WHERE aps.appointment_id = a.id),
                  0
                )::float AS "totalPrice",
                COALESCE(
                  (
                    SELECT json_agg(
                      json_build_object(
                        'id', aps.service_id,
                        'name', aps.service_name,
                        'price', aps.price::float,
                        'durationMinutes', aps.duration_minutes
                      )
                    )
                    FROM ${appointmentServices} aps
                    WHERE aps.appointment_id = a.id
                  ),
                  '[]'::json
                ) AS services
         FROM ${appointments} a
         INNER JOIN ${branches} b ON b.id = a.branch_id
         LEFT JOIN ${employees} e ON e.id = a.employee_id
         WHERE a.customer_id = $1::uuid
         ORDER BY a.appointment_date DESC, a.start_time DESC`,
        customerId,
      );

      return rows;
    });
  }

  // =========================================================================
  // CUSTOMER LOYALTY & ANALYTICS
  // =========================================================================

  private resolveCustomerRange(query: { from?: string; to?: string; preset?: string }) {
    const today = new Date().toISOString().slice(0, 10);
    const preset = (query.preset ?? 'all_time').toLowerCase();

    if (query.from && query.to) {
      return { from: query.from.slice(0, 10), to: query.to.slice(0, 10) };
    }

    if (preset === 'today') {
      return { from: today, to: today };
    }
    if (preset === 'last_30_days' || preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return { from: d.toISOString().slice(0, 10), to: today };
    }
    if (preset === 'this_month') {
      const d = new Date();
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      return { from: start, to: today };
    }
    if (preset === 'last_month') {
      const d = new Date();
      const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const end = new Date(d.getFullYear(), d.getMonth(), 0);
      return {
        from: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`,
        to: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
      };
    }

    // Default: all time
    return { from: '2000-01-01', to: today };
  }

  async getAnalytics(
    schemaName: string,
    query: {
      from?: string;
      to?: string;
      preset?: string;
      branchId?: string;
      search?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
      sortBy?: 'visits' | 'servicesTaken' | 'totalSpend' | 'name' | 'lastVisit';
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ) {
    const range = this.resolveCustomerRange(query);
    const customers = tenantTable(schemaName, 'customers');
    const sales = tenantTable(schemaName, 'sales');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const services = tenantTable(schemaName, 'services');
    const { page, limit, offset } = resolvePagination(query.page, query.limit ?? 10);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const conditions: string[] = ['1=1'];
      const params: unknown[] = [];
      let idx = 1;

      if (query.status) {
        conditions.push(`c.status::text = $${idx++}`);
        params.push(query.status);
      }
      if (query.search?.trim()) {
        const search = query.search.trim();
        const digits = search.replace(/\D/g, '');
        if (digits.length >= 4) {
          conditions.push(
            `(c.name ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.email ILIKE $${idx} OR RIGHT(REGEXP_REPLACE(c.phone, '\\D', '', 'g'), ${Math.min(digits.length, 9)}) ILIKE $${idx + 1})`,
          );
          params.push(`%${search}%`, `%${digits}%`);
          idx += 2;
        } else {
          conditions.push(`(c.name ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.email ILIKE $${idx})`);
          params.push(`%${search}%`);
          idx++;
        }
      }

      const whereClause = conditions.join(' AND ');

      // Total customers matching search/status filter
      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${customers} c WHERE ${whereClause}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);

      const dateStartIdx = idx;
      const allParams = [...params, range.from, range.to];
      idx += 2;

      let branchFilter = '';
      if (query.branchId && query.branchId !== 'all') {
        branchFilter = `AND s.branch_id = $${idx++}::uuid`;
        allParams.push(query.branchId);
      }

      const dir = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
      let orderClause = `COALESCE(cs.total_spend, 0) DESC, c.name ASC`;
      if (query.sortBy === 'visits') {
        orderClause = `COALESCE(cs.visits, 0) ${dir}, c.name ASC`;
      } else if (query.sortBy === 'servicesTaken') {
        orderClause = `COALESCE(csv.services_taken, 0) ${dir}, c.name ASC`;
      } else if (query.sortBy === 'totalSpend') {
        orderClause = `COALESCE(cs.total_spend, 0) ${dir}, c.name ASC`;
      } else if (query.sortBy === 'name') {
        orderClause = `c.name ${dir}`;
      } else if (query.sortBy === 'lastVisit') {
        orderClause = `cs.last_visit ${dir} NULLS LAST, c.name ASC`;
      }

      const rows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          code: string;
          name: string;
          phone: string | null;
          email: string | null;
          birthday: string | null;
          notes: string | null;
          status: string;
          createdAt: Date;
          visits: number;
          servicesTaken: number;
          totalSpend: number;
          lastVisit: string | null;
          favouriteService: string | null;
          favouriteServiceCount: number;
        }>
      >(
        `WITH cust_sales AS (
           SELECT
             s.customer_id,
             COUNT(DISTINCT s.id)::int AS visits,
             COALESCE(SUM(GREATEST(0, s.total - COALESCE(s.refunded_amount, 0))), 0)::float AS total_spend,
             MAX(s.created_at)::text AS last_visit
           FROM ${sales} s
           WHERE s.customer_id IS NOT NULL
             AND s.status::text = 'COMPLETED'
             AND s.created_at >= $${dateStartIdx}::date
             AND s.created_at < ($${dateStartIdx + 1}::date + INTERVAL '1 day')
             ${branchFilter}
           GROUP BY s.customer_id
         ),
         cust_services AS (
           SELECT
             s.customer_id,
             COUNT(si.id)::int AS services_taken
           FROM ${saleItems} si
           INNER JOIN ${sales} s ON s.id = si.sale_id
           WHERE s.customer_id IS NOT NULL
             AND s.status::text = 'COMPLETED'
             AND si.item_type = 'service'
             AND s.created_at >= $${dateStartIdx}::date
             AND s.created_at < ($${dateStartIdx + 1}::date + INTERVAL '1 day')
             ${branchFilter}
           GROUP BY s.customer_id
         ),
         cust_fav_ranks AS (
           SELECT
             s.customer_id,
             COALESCE(svc.name, 'Service') AS service_name,
             COUNT(*)::int AS svc_count,
             COALESCE(SUM(si.total), 0)::float AS svc_revenue,
             ROW_NUMBER() OVER (
               PARTITION BY s.customer_id
               ORDER BY COUNT(*) DESC, COALESCE(SUM(si.total), 0) DESC, COALESCE(svc.name, 'Service') ASC
             ) AS rank
           FROM ${saleItems} si
           INNER JOIN ${sales} s ON s.id = si.sale_id
           LEFT JOIN ${services} svc ON svc.id = si.service_id
           WHERE s.customer_id IS NOT NULL
             AND s.status::text = 'COMPLETED'
             AND si.item_type = 'service'
             AND s.created_at >= $${dateStartIdx}::date
             AND s.created_at < ($${dateStartIdx + 1}::date + INTERVAL '1 day')
             ${branchFilter}
           GROUP BY s.customer_id, svc.name
         )
         SELECT
           c.id,
           c.code,
           c.name,
           c.phone,
           c.email,
           c.birthday::text AS birthday,
           c.notes,
           c.status::text AS status,
           c.created_at AS "createdAt",
           COALESCE(cs.visits, 0)::int AS visits,
           COALESCE(csv.services_taken, 0)::int AS "servicesTaken",
           COALESCE(cs.total_spend, 0)::float AS "totalSpend",
           cs.last_visit AS "lastVisit",
           cfr.service_name AS "favouriteService",
           COALESCE(cfr.svc_count, 0)::int AS "favouriteServiceCount"
         FROM ${customers} c
         LEFT JOIN cust_sales cs ON cs.customer_id = c.id
         LEFT JOIN cust_services csv ON csv.customer_id = c.id
         LEFT JOIN cust_fav_ranks cfr ON cfr.customer_id = c.id AND cfr.rank = 1
         ORDER BY ${orderClause}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...allParams,
        limit,
        offset,
      );

      return {
        range,
        ...buildPaginatedResponse(rows, total, page, limit),
      };
    });
  }

  async getTopCustomers(
    schemaName: string,
    query: {
      from?: string;
      to?: string;
      preset?: string;
      branchId?: string;
    },
  ) {
    const range = this.resolveCustomerRange(query);
    const customers = tenantTable(schemaName, 'customers');
    const sales = tenantTable(schemaName, 'sales');
    const saleItems = tenantTable(schemaName, 'sale_items');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const params: unknown[] = [range.from, range.to];
      let branchFilter = '';
      if (query.branchId && query.branchId !== 'all') {
        branchFilter = `AND s.branch_id = $3::uuid`;
        params.push(query.branchId);
      }

      // Top by visits
      const topByVisitsRows = await tx.$queryRawUnsafe<
        Array<{
          customerId: string;
          customerName: string;
          customerPhone: string | null;
          visits: number;
        }>
      >(
        `SELECT
           c.id AS "customerId",
           c.name AS "customerName",
           c.phone AS "customerPhone",
           COUNT(DISTINCT s.id)::int AS visits
         FROM ${sales} s
         INNER JOIN ${customers} c ON c.id = s.customer_id
         WHERE s.status::text = 'COMPLETED'
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${branchFilter}
         GROUP BY c.id, c.name, c.phone
         ORDER BY visits DESC, c.name ASC
         LIMIT 1`,
        ...params,
      );

      // Top by services taken
      const topByServicesRows = await tx.$queryRawUnsafe<
        Array<{
          customerId: string;
          customerName: string;
          customerPhone: string | null;
          servicesTaken: number;
        }>
      >(
        `SELECT
           c.id AS "customerId",
           c.name AS "customerName",
           c.phone AS "customerPhone",
           COUNT(si.id)::int AS "servicesTaken"
         FROM ${saleItems} si
         INNER JOIN ${sales} s ON s.id = si.sale_id
         INNER JOIN ${customers} c ON c.id = s.customer_id
         WHERE s.status::text = 'COMPLETED'
           AND si.item_type = 'service'
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${branchFilter}
         GROUP BY c.id, c.name, c.phone
         ORDER BY "servicesTaken" DESC, c.name ASC
         LIMIT 1`,
        ...params,
      );

      // Top by spending
      const topBySpendingRows = await tx.$queryRawUnsafe<
        Array<{
          customerId: string;
          customerName: string;
          customerPhone: string | null;
          totalSpend: number;
        }>
      >(
        `SELECT
           c.id AS "customerId",
           c.name AS "customerName",
           c.phone AS "customerPhone",
           COALESCE(SUM(GREATEST(0, s.total - COALESCE(s.refunded_amount, 0))), 0)::float AS "totalSpend"
         FROM ${sales} s
         INNER JOIN ${customers} c ON c.id = s.customer_id
         WHERE s.status::text = 'COMPLETED'
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${branchFilter}
         GROUP BY c.id, c.name, c.phone
         ORDER BY "totalSpend" DESC, c.name ASC
         LIMIT 1`,
        ...params,
      );

      return {
        range,
        topByVisits: topByVisitsRows[0] ?? null,
        topByServices: topByServicesRows[0] ?? null,
        topBySpending: topBySpendingRows[0] ?? null,
      };
    });
  }

  async getCustomerDetailAnalytics(
    schemaName: string,
    customerId: string,
    query: {
      from?: string;
      to?: string;
      preset?: string;
      branchId?: string;
    },
  ) {
    const range = this.resolveCustomerRange(query);
    const customers = tenantTable(schemaName, 'customers');
    const sales = tenantTable(schemaName, 'sales');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const employees = tenantTable(schemaName, 'employees');
    const services = tenantTable(schemaName, 'services');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const custRows = await tx.$queryRawUnsafe<Array<CustomerRecord>>(
        `${this.customerSelectSql(customers)} WHERE id = $1::uuid LIMIT 1`,
        customerId,
      );

      if (!custRows[0]) {
        throw new NotFoundException('Customer not found');
      }

      const cust = custRows[0];
      const params: unknown[] = [customerId, range.from, range.to];
      let branchFilter = '';
      if (query.branchId && query.branchId !== 'all') {
        branchFilter = `AND s.branch_id = $4::uuid`;
        params.push(query.branchId);
      }

      // 1. Core KPIs
      const kpiRows = await tx.$queryRawUnsafe<
        Array<{
          visits: number;
          totalSpend: number;
          lastVisit: string | null;
        }>
      >(
        `SELECT
           COUNT(DISTINCT s.id)::int AS visits,
           COALESCE(SUM(GREATEST(0, s.total - COALESCE(s.refunded_amount, 0))), 0)::float AS "totalSpend",
           MAX(s.created_at)::text AS "lastVisit"
         FROM ${sales} s
         WHERE s.customer_id = $1::uuid
           AND s.status::text = 'COMPLETED'
           AND s.created_at >= $2::date
           AND s.created_at < ($3::date + INTERVAL '1 day')
           ${branchFilter}`,
        ...params,
      );

      const servicesRows = await tx.$queryRawUnsafe<Array<{ servicesTaken: number }>>(
        `SELECT COUNT(si.id)::int AS "servicesTaken"
         FROM ${saleItems} si
         INNER JOIN ${sales} s ON s.id = si.sale_id
         WHERE s.customer_id = $1::uuid
           AND s.status::text = 'COMPLETED'
           AND si.item_type = 'service'
           AND s.created_at >= $2::date
           AND s.created_at < ($3::date + INTERVAL '1 day')
           ${branchFilter}`,
        ...params,
      );

      const visits = Number(kpiRows[0]?.visits ?? 0);
      const totalSpend = Number(kpiRows[0]?.totalSpend ?? 0);
      const servicesTaken = Number(servicesRows[0]?.servicesTaken ?? 0);
      const averageSpendPerVisit =
        visits > 0 ? Math.round((totalSpend / visits) * 100) / 100 : 0;
      const lastVisit = kpiRows[0]?.lastVisit ?? null;

      // 2. Favourite Service
      const favServiceRows = await tx.$queryRawUnsafe<
        Array<{
          serviceName: string;
          count: number;
          revenue: number;
        }>
      >(
        `SELECT
           COALESCE(svc.name, 'Service') AS "serviceName",
           COUNT(*)::int AS count,
           COALESCE(SUM(si.total), 0)::float AS revenue
         FROM ${saleItems} si
         INNER JOIN ${sales} s ON s.id = si.sale_id
         LEFT JOIN ${services} svc ON svc.id = si.service_id
         WHERE s.customer_id = $1::uuid
           AND s.status::text = 'COMPLETED'
           AND si.item_type = 'service'
           AND s.created_at >= $2::date
           AND s.created_at < ($3::date + INTERVAL '1 day')
           ${branchFilter}
         GROUP BY svc.name
         ORDER BY count DESC, revenue DESC, svc.name ASC
         LIMIT 5`,
        ...params,
      );

      // 3. Favourite Employee / Stylist
      const favEmployeeRows = await tx.$queryRawUnsafe<
        Array<{
          employeeId: string;
          employeeName: string;
          count: number;
        }>
      >(
        `SELECT
           e.id AS "employeeId",
           e.name AS "employeeName",
           COUNT(*)::int AS count
         FROM ${saleItemEmployees} sie
         INNER JOIN ${saleItems} si ON si.id = sie.sale_item_id AND si.item_type = 'service'
         INNER JOIN ${sales} s ON s.id = si.sale_id
         INNER JOIN ${employees} e ON e.id = sie.employee_id
         WHERE s.customer_id = $1::uuid
           AND s.status::text = 'COMPLETED'
           AND s.created_at >= $2::date
           AND s.created_at < ($3::date + INTERVAL '1 day')
           ${branchFilter}
         GROUP BY e.id, e.name
         ORDER BY count DESC, e.name ASC
         LIMIT 1`,
        ...params,
      );

      // 4. Recent visits / transactions
      const recentVisits = await tx.$queryRawUnsafe<
        Array<{
          saleId: string;
          saleNumber: string;
          date: string;
          total: number;
          status: string;
        }>
      >(
        `SELECT
           s.id AS "saleId",
           s.sale_number AS "saleNumber",
           s.created_at::text AS date,
           s.total::float AS total,
           s.status::text AS status
         FROM ${sales} s
         WHERE s.customer_id = $1::uuid
           AND s.status::text = 'COMPLETED'
           AND s.created_at >= $2::date
           AND s.created_at < ($3::date + INTERVAL '1 day')
           ${branchFilter}
         ORDER BY s.created_at DESC
         LIMIT 10`,
        ...params,
      );

      return {
        customer: cust,
        range,
        kpis: {
          totalVisits: visits,
          totalServicesTaken: servicesTaken,
          totalSpend,
          averageSpendPerVisit,
          lastVisit,
          favouriteService: favServiceRows[0]?.serviceName ?? null,
          favouriteEmployee: favEmployeeRows[0]?.employeeName ?? null,
        },
        favouriteServices: favServiceRows,
        topServices: favServiceRows,
        favouriteEmployee: favEmployeeRows[0] ?? null,
        recentVisits,
      };
    });
  }
}

