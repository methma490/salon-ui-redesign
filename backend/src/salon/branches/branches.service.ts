import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { logAudit } from '../utils/audit.util';
import { CreateBranchDto, UpdateBranchDto, UpdateBranchStatusDto } from './dto/branch.dto';

export interface BranchRecord {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isMain: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BranchesService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  async list(schemaName: string): Promise<BranchRecord[]> {
    const table = tenantTable(schemaName, 'branches');
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      return tx.$queryRawUnsafe<BranchRecord[]>(
        `SELECT id, code, name, phone, email, address,
                is_main AS "isMain", status::text AS status,
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM ${table}
         ORDER BY is_main DESC, name ASC`,
      );
    });
  }

  async create(schemaName: string, dto: CreateBranchDto, userId: string): Promise<BranchRecord> {
    const table = tenantTable(schemaName, 'branches');
    const code = dto.code.toUpperCase();

    if (code === 'MAIN') {
      throw new BadRequestException('Branch code MAIN is reserved for the main branch');
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${table} WHERE UPPER(code) = $1 LIMIT 1`,
        code,
      );
      if (existing.length > 0) {
        throw new ConflictException('Branch code already exists');
      }

      const rows = await tx.$queryRawUnsafe<BranchRecord[]>(
        `INSERT INTO ${table} (code, name, phone, email, address, is_main, status)
         VALUES ($1, $2, $3, $4, $5, false, 'ACTIVE')
         RETURNING id, code, name, phone, email, address,
                   is_main AS "isMain", status::text AS status,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        code,
        dto.name,
        dto.phone ?? null,
        dto.email ?? null,
        dto.address ?? null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'BRANCH_CREATE',
        entityType: 'branch',
        entityId: rows[0].id,
        details: { code, name: dto.name },
      });

      return rows[0];
    });
  }

  async update(
    schemaName: string,
    id: string,
    dto: UpdateBranchDto,
    userId: string,
  ): Promise<BranchRecord> {
    const table = tenantTable(schemaName, 'branches');
    const branch = await this.findById(schemaName, id);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<BranchRecord[]>(
        `UPDATE ${table}
         SET name = COALESCE($2, name),
             phone = COALESCE($3, phone),
             email = COALESCE($4, email),
             address = COALESCE($5, address),
             updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, code, name, phone, email, address,
                   is_main AS "isMain", status::text AS status,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        id,
        dto.name ?? null,
        dto.phone ?? null,
        dto.email ?? null,
        dto.address ?? null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'BRANCH_UPDATE',
        entityType: 'branch',
        entityId: id,
        details: { code: branch.code, ...dto },
      });

      return rows[0];
    });
  }

  async updateStatus(
    schemaName: string,
    id: string,
    dto: UpdateBranchStatusDto,
    userId: string,
  ): Promise<BranchRecord> {
    const branch = await this.findById(schemaName, id);

    if (branch.isMain && dto.status === 'INACTIVE') {
      throw new BadRequestException('Main branch cannot be deactivated');
    }

    const table = tenantTable(schemaName, 'branches');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<BranchRecord[]>(
        `UPDATE ${table}
         SET status = $2::branch_status, updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, code, name, phone, email, address,
                   is_main AS "isMain", status::text AS status,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        id,
        dto.status,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'BRANCH_STATUS_UPDATE',
        entityType: 'branch',
        entityId: id,
        details: { status: dto.status },
      });

      return rows[0];
    });
  }

  async findById(schemaName: string, id: string): Promise<BranchRecord> {
    const table = tenantTable(schemaName, 'branches');
    const rows = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe<BranchRecord[]>(
        `SELECT id, code, name, phone, email, address,
                is_main AS "isMain", status::text AS status,
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM ${table} WHERE id = $1::uuid LIMIT 1`,
        id,
      ),
    );

    if (rows.length === 0) {
      throw new NotFoundException('Branch not found');
    }

    return rows[0];
  }
}
