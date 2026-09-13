import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
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

  async list(schemaName: string, query: ListCustomersQueryDto) {
    const table = tenantTable(schemaName, 'customers');
    const { page, limit, offset } = resolvePagination(query.page, query.limit);
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    if (query.phone) {
      conditions.push(`phone ILIKE $${idx++}`);
      params.push(`%${query.phone}%`);
    } else if (query.search) {
      conditions.push(`(name ILIKE $${idx} OR phone ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${query.search}%`);
      idx++;
    }

    if (query.status) {
      conditions.push(`status = $${idx++}::customer_status`);
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

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${table} WHERE phone = $1 LIMIT 1`,
        dto.phone,
      );
      if (existing.length > 0) {
        throw new ConflictException('Customer with this phone already exists');
      }

      const code = await generateSequentialCode(tx, table, 'CUST-');
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${table} (code, name, phone, email, birthday, notes, status)
         VALUES ($1, $2, $3, $4, $5::date, $6, 'ACTIVE')
         RETURNING id`,
        code,
        dto.name,
        dto.phone,
        dto.email ?? null,
        dto.birthday ?? null,
        dto.notes ?? null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'CUSTOMER_CREATE',
        entityType: 'customer',
        entityId: rows[0].id,
        details: { name: dto.name, phone: dto.phone },
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

    if (dto.phone) {
      const duplicate = await this.tenantSchemaService.withTenantSchema(
        schemaName,
        async ({ tx }) =>
          tx.$queryRawUnsafe<Array<{ id: string }>>(
            `SELECT id FROM ${table} WHERE phone = $1 AND id != $2::uuid LIMIT 1`,
            dto.phone,
            id,
          ),
      );
      if (duplicate.length > 0) {
        throw new ConflictException('Customer with this phone already exists');
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
        dto.name ?? null,
        dto.phone ?? null,
        dto.email ?? null,
        dto.birthday ?? null,
        dto.notes ?? null,
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
        `UPDATE ${table} SET status = $2::customer_status, updated_at = NOW() WHERE id = $1::uuid`,
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
}
