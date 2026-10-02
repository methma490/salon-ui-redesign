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
}
