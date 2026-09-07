import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  async list(schemaName: string, query: ListCustomersQueryDto): Promise<CustomerRecord[]> {
    const table = tenantTable(schemaName, 'customers');
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

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe<CustomerRecord[]>(
        `SELECT id, code, name, phone, email,
                birthday::text AS birthday, notes,
                status::text AS status,
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM ${table}
         WHERE ${conditions.join(' AND ')}
         ORDER BY name ASC`,
        ...params,
      ),
    );
  }

  async findById(schemaName: string, id: string): Promise<CustomerRecord> {
    const table = tenantTable(schemaName, 'customers');
    const rows = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe<CustomerRecord[]>(
        `SELECT id, code, name, phone, email,
                birthday::text AS birthday, notes,
                status::text AS status,
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM ${table} WHERE id = $1::uuid LIMIT 1`,
        id,
      ),
    );

    if (rows.length === 0) {
      throw new NotFoundException('Customer not found');
    }

    return rows[0];
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

      return this.findById(schemaName, rows[0].id);
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
