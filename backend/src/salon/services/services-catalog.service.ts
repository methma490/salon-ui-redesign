import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { logAudit } from '../utils/audit.util';
import { generateSequentialCode } from '../utils/code-generator.util';
import {
  CreateServiceCategoryDto,
  CreateServiceDto,
  UpdateCategoryStatusDto,
  UpdateServiceCategoryDto,
  UpdateServiceDto,
  UpdateServiceStatusDto,
} from './dto/service.dto';

@Injectable()
export class ServicesCatalogService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  // --- Categories ---

  async listCategories(schemaName: string) {
    const table = tenantTable(schemaName, 'service_categories');
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe(
        `SELECT id, code, name, description,
                COALESCE(is_active, true) AS "isActive",
                CASE WHEN COALESCE(is_active, true) THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM ${table} ORDER BY name ASC`,
      ),
    );
  }

  async createCategory(schemaName: string, dto: CreateServiceCategoryDto, userId: string) {
    const table = tenantTable(schemaName, 'service_categories');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const code = dto.code
        ? dto.code.toUpperCase()
        : await generateSequentialCode(tx, table, 'SCAT-');

      const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${table} WHERE UPPER(code) = $1 LIMIT 1`,
        code,
      );
      if (existing.length > 0) {
        throw new ConflictException('Category code already exists');
      }

      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${table} (code, name, description, is_active)
         VALUES ($1, $2, $3, true) RETURNING id`,
        code,
        dto.name,
        dto.description ?? null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'SERVICE_CATEGORY_CREATE',
        entityType: 'service_category',
        entityId: rows[0].id,
        details: { code, name: dto.name },
      });

      return rows[0];
    });
  }

  async updateCategory(
    schemaName: string,
    id: string,
    dto: UpdateServiceCategoryDto,
    userId: string,
  ) {
    const table = tenantTable(schemaName, 'service_categories');
    await this.ensureCategoryExists(schemaName, id);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${table}
         SET name = COALESCE($2, name), description = COALESCE($3, description), updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.name ?? null,
        dto.description ?? null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'SERVICE_CATEGORY_UPDATE',
        entityType: 'service_category',
        entityId: id,
      });

      return { id };
    });
  }

  async updateCategoryStatus(
    schemaName: string,
    id: string,
    dto: UpdateCategoryStatusDto,
    userId: string,
  ) {
    const table = tenantTable(schemaName, 'service_categories');
    const services = tenantTable(schemaName, 'services');
    await this.ensureCategoryExists(schemaName, id);
    const isActive = dto.status === 'ACTIVE';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${table} SET is_active = $2, updated_at = NOW() WHERE id = $1::uuid`,
        id,
        isActive,
      );

      // If category is deactivated, also deactivate all services assigned to this category
      if (!isActive) {
        await tx.$queryRawUnsafe(
          `UPDATE ${services} SET is_active = false, updated_at = NOW() WHERE category_id = $1::uuid`,
          id,
        );
      }

      await logAudit(tx, schemaName, {
        userId,
        action: 'SERVICE_CATEGORY_STATUS_UPDATE',
        entityType: 'service_category',
        entityId: id,
        details: { status: dto.status, cascadedDeactivation: !isActive },
      });

      return { id, status: dto.status };
    });
  }

  // --- Services ---

  async listServices(schemaName: string, categoryId?: string) {
    const services = tenantTable(schemaName, 'services');
    const categories = tenantTable(schemaName, 'service_categories');
    const conditions = categoryId ? 'WHERE s.category_id = $1::uuid' : '';
    const params = categoryId ? [categoryId] : [];

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe(
        `SELECT s.id, s.code, s.name, s.description, s.price, s.duration_minutes AS "durationMinutes",
                s.category_id AS "categoryId", c.name AS "categoryName",
                CASE WHEN s.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                s.created_at AS "createdAt", s.updated_at AS "updatedAt"
         FROM ${services} s
         LEFT JOIN ${categories} c ON s.category_id = c.id
         ${conditions}
         ORDER BY c.name ASC NULLS LAST, s.name ASC`,
        ...params,
      ),
    );
  }

  async createService(schemaName: string, dto: CreateServiceDto, userId: string) {
    const services = tenantTable(schemaName, 'services');
    await this.ensureCategoryExists(schemaName, dto.categoryId);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const code = await generateSequentialCode(tx, services, 'SRV-');
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${services} (category_id, code, name, description, price, duration_minutes, is_active)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, true)
         RETURNING id`,
        dto.categoryId,
        code,
        dto.name,
        dto.description ?? null,
        dto.price,
        dto.durationMinutes ?? null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'SERVICE_CREATE',
        entityType: 'service',
        entityId: rows[0].id,
        details: { name: dto.name, price: dto.price },
      });

      return rows[0];
    });
  }

  async updateService(schemaName: string, id: string, dto: UpdateServiceDto, userId: string) {
    const services = tenantTable(schemaName, 'services');
    await this.ensureServiceExists(schemaName, id);

    if (dto.categoryId) {
      await this.ensureCategoryExists(schemaName, dto.categoryId);
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${services}
         SET category_id = COALESCE($2::uuid, category_id),
             name = COALESCE($3, name),
             description = COALESCE($4, description),
             price = COALESCE($5, price),
             duration_minutes = COALESCE($6, duration_minutes),
             updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.categoryId ?? null,
        dto.name ?? null,
        dto.description ?? null,
        dto.price ?? null,
        dto.durationMinutes ?? null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'SERVICE_UPDATE',
        entityType: 'service',
        entityId: id,
      });

      return { id };
    });
  }

  async updateServiceStatus(
    schemaName: string,
    id: string,
    dto: UpdateServiceStatusDto,
    userId: string,
  ) {
    const services = tenantTable(schemaName, 'services');
    await this.ensureServiceExists(schemaName, id);
    const isActive = dto.status === 'ACTIVE';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${services} SET is_active = $2, updated_at = NOW() WHERE id = $1::uuid`,
        id,
        isActive,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'SERVICE_STATUS_UPDATE',
        entityType: 'service',
        entityId: id,
        details: { status: dto.status },
      });

      return { id, status: dto.status };
    });
  }

  private async ensureCategoryExists(schemaName: string, id: string) {
    const table = tenantTable(schemaName, 'service_categories');
    const rows = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${table} WHERE id = $1::uuid LIMIT 1`,
        id,
      ),
    );
    if (rows.length === 0) {
      throw new NotFoundException('Service category not found');
    }
  }

  private async ensureServiceExists(schemaName: string, id: string) {
    const table = tenantTable(schemaName, 'services');
    const rows = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${table} WHERE id = $1::uuid LIMIT 1`,
        id,
      ),
    );
    if (rows.length === 0) {
      throw new NotFoundException('Service not found');
    }
  }
}
