import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { logAudit } from '../utils/audit.util';
import { generateSequentialCode } from '../utils/code-generator.util';
import {
  CreateEmployeeDto,
  ListEmployeesQueryDto,
  UpdateEmployeeDto,
  UpdateEmployeeStatusDto,
} from './dto/employee.dto';

export interface EmployeeRecord {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  designation: string | null;
  branchId: string;
  branchName: string;
  userId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class EmployeesService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  async list(schemaName: string, query: ListEmployeesQueryDto): Promise<EmployeeRecord[]> {
    const employees = tenantTable(schemaName, 'employees');
    const branches = tenantTable(schemaName, 'branches');

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    if (query.branchId) {
      conditions.push(`e.branch_id = $${idx++}::uuid`);
      params.push(query.branchId);
    }
    if (query.status) {
      conditions.push(`e.status = $${idx++}::employee_status`);
      params.push(query.status);
    }
    if (query.search) {
      conditions.push(
        `(e.name ILIKE $${idx} OR e.phone ILIKE $${idx} OR e.email ILIKE $${idx} OR e.designation ILIKE $${idx})`,
      );
      params.push(`%${query.search}%`);
      idx++;
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe<EmployeeRecord[]>(
        `SELECT e.id, e.code, e.name, e.phone, e.email, e.designation,
                e.branch_id AS "branchId", b.name AS "branchName",
                e.user_id AS "userId", e.status::text AS status,
                e.created_at AS "createdAt", e.updated_at AS "updatedAt"
         FROM ${employees} e
         INNER JOIN ${branches} b ON e.branch_id = b.id
         WHERE ${conditions.join(' AND ')}
         ORDER BY e.name ASC`,
        ...params,
      ),
    );
  }

  async findById(schemaName: string, id: string): Promise<EmployeeRecord> {
    const employees = tenantTable(schemaName, 'employees');
    const branches = tenantTable(schemaName, 'branches');

    const rows = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe<EmployeeRecord[]>(
        `SELECT e.id, e.code, e.name, e.phone, e.email, e.designation,
                e.branch_id AS "branchId", b.name AS "branchName",
                e.user_id AS "userId", e.status::text AS status,
                e.created_at AS "createdAt", e.updated_at AS "updatedAt"
         FROM ${employees} e
         INNER JOIN ${branches} b ON e.branch_id = b.id
         WHERE e.id = $1::uuid LIMIT 1`,
        id,
      ),
    );

    if (rows.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    return rows[0];
  }

  async create(
    schemaName: string,
    dto: CreateEmployeeDto,
    userId: string,
  ): Promise<EmployeeRecord> {
    const employees = tenantTable(schemaName, 'employees');
    const branches = tenantTable(schemaName, 'branches');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const branch = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${branches} WHERE id = $1::uuid LIMIT 1`,
        dto.branchId,
      );
      if (branch.length === 0) {
        throw new NotFoundException('Branch not found');
      }

      const code = await generateSequentialCode(tx, employees, 'EMP-');

      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${employees} (branch_id, user_id, code, name, email, phone, designation, status)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, 'ACTIVE')
         RETURNING id`,
        dto.branchId,
        dto.userId ?? null,
        code,
        dto.name,
        dto.email ?? null,
        dto.phone ?? null,
        dto.designation,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'EMPLOYEE_CREATE',
        entityType: 'employee',
        entityId: rows[0].id,
        details: { name: dto.name, designation: dto.designation },
      });

      return this.findById(schemaName, rows[0].id);
    });
  }

  async update(
    schemaName: string,
    id: string,
    dto: UpdateEmployeeDto,
    userId: string,
  ): Promise<EmployeeRecord> {
    const employees = tenantTable(schemaName, 'employees');
    await this.findById(schemaName, id);

    if (dto.branchId) {
      const branches = tenantTable(schemaName, 'branches');
      const branch = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
        tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM ${branches} WHERE id = $1::uuid LIMIT 1`,
          dto.branchId,
        ),
      );
      if (branch.length === 0) {
        throw new NotFoundException('Branch not found');
      }
    }

    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${employees}
         SET name = COALESCE($2, name),
             phone = COALESCE($3, phone),
             email = COALESCE($4, email),
             designation = COALESCE($5, designation),
             branch_id = COALESCE($6::uuid, branch_id),
             user_id = CASE WHEN $7::text IS NOT NULL THEN $7::uuid ELSE user_id END,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.name ?? null,
        dto.phone ?? null,
        dto.email ?? null,
        dto.designation ?? null,
        dto.branchId ?? null,
        dto.userId === null ? null : (dto.userId ?? null),
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'EMPLOYEE_UPDATE',
        entityType: 'employee',
        entityId: id,
        details: dto as Record<string, unknown>,
      });
    });

    return this.findById(schemaName, id);
  }

  async updateStatus(
    schemaName: string,
    id: string,
    dto: UpdateEmployeeStatusDto,
    userId: string,
  ): Promise<EmployeeRecord> {
    const employees = tenantTable(schemaName, 'employees');
    await this.findById(schemaName, id);

    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${employees} SET status = $2::employee_status, updated_at = NOW() WHERE id = $1::uuid`,
        id,
        dto.status,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'EMPLOYEE_STATUS_UPDATE',
        entityType: 'employee',
        entityId: id,
        details: { status: dto.status },
      });
    });

    return this.findById(schemaName, id);
  }
}
