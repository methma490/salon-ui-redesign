import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable, tenantType } from '../../tenant/utils/schema-name.util';
import { logAudit } from '../utils/audit.util';
import { CreateBranchDto, UpdateBranchDto, UpdateBranchStatusDto } from './dto/branch.dto';

export interface BranchRecord {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
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
        `SELECT id, code, name, phone, email, address, latitude, longitude,
                is_main AS "isMain", status::text AS status,
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM ${table}
         ORDER BY is_main DESC, name ASC`,
      );
    });
  }

  async suggestCode(schemaName: string, name?: string): Promise<{ code: string }> {
    const code = await this.generateBranchCode(schemaName, name);
    return { code };
  }

  private async generateBranchCode(schemaName: string, name?: string): Promise<string> {
    const table = tenantTable(schemaName, 'branches');
    let prefix = 'BR';
    if (name && name.trim()) {
      const clean = name.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (clean.length >= 3) {
        prefix = `BR-${clean.slice(0, 4)}`;
      }
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      for (let i = 1; i <= 99; i++) {
        const candidate = `${prefix}-${String(i).padStart(2, '0')}`;
        const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM ${table} WHERE UPPER(code) = $1 LIMIT 1`,
          candidate,
        );
        if (existing.length === 0) {
          return candidate;
        }
      }
      return `BR-${Date.now().toString().slice(-4)}`;
    });
  }

  async create(schemaName: string, dto: CreateBranchDto, userId: string): Promise<BranchRecord> {
    const table = tenantTable(schemaName, 'branches');
    const code = dto.code && dto.code.trim()
      ? dto.code.trim().toUpperCase()
      : await this.generateBranchCode(schemaName, dto.name);

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
        `INSERT INTO ${table} (code, name, phone, email, address, latitude, longitude, is_main, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'ACTIVE')
         RETURNING id, code, name, phone, email, address, latitude, longitude,
                   is_main AS "isMain", status::text AS status,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        code,
        dto.name,
        dto.phone ?? null,
        dto.email ?? null,
        dto.address ?? null,
        dto.latitude ?? null,
        dto.longitude ?? null,
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

    let newCode: string | null = null;
    if (dto.code && dto.code.trim()) {
      newCode = dto.code.trim().toUpperCase();
      if (branch.isMain && newCode !== 'MAIN') {
        throw new BadRequestException('Main branch code cannot be changed');
      }
      if (!branch.isMain && newCode === 'MAIN') {
        throw new BadRequestException('Branch code MAIN is reserved for the main branch');
      }
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      if (newCode && newCode !== branch.code) {
        const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM ${table} WHERE UPPER(code) = $1 AND id != $2::uuid LIMIT 1`,
          newCode,
          id,
        );
        if (existing.length > 0) {
          throw new ConflictException('Branch code already exists');
        }
      }

      const rows = await tx.$queryRawUnsafe<BranchRecord[]>(
        `UPDATE ${table}
         SET code = COALESCE($2, code),
             name = COALESCE($3, name),
             phone = COALESCE($4, phone),
             email = COALESCE($5, email),
             address = COALESCE($6, address),
             latitude = COALESCE($7, latitude),
             longitude = COALESCE($8, longitude),
             updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, code, name, phone, email, address, latitude, longitude,
                   is_main AS "isMain", status::text AS status,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        id,
        newCode ?? null,
        dto.name ?? null,
        dto.phone ?? null,
        dto.email ?? null,
        dto.address ?? null,
        dto.latitude ?? null,
        dto.longitude ?? null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'BRANCH_UPDATE',
        entityType: 'branch',
        entityId: id,
        details: { code: newCode ?? branch.code, ...dto },
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
    const branchStatusType = tenantType(schemaName, 'branch_status');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<BranchRecord[]>(
        `UPDATE ${table}
         SET status = $2::text::${branchStatusType}, updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, code, name, phone, email, address, latitude, longitude,
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
        `SELECT id, code, name, phone, email, address, latitude, longitude,
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
