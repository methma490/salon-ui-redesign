import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { logAudit } from '../utils/audit.util';
import { generateSequentialCode } from '../utils/code-generator.util';
import {
  CreateServiceCategoryDto,
  CreateServiceDto,
  ListServiceCategoriesQueryDto,
  ListServicesQueryDto,
  UpdateCategoryStatusDto,
  UpdateServiceCategoryDto,
  UpdateServiceDto,
  UpdateServiceStatusDto,
} from './dto/service.dto';

@Injectable()
export class ServicesCatalogService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  // --- Categories ---

  async listCategories(schemaName: string, query?: ListServiceCategoriesQueryDto) {
    const table = tenantTable(schemaName, 'service_categories');
    const services = tenantTable(schemaName, 'services');
    const branches = tenantTable(schemaName, 'branches');
    const categoryBranches = tenantTable(schemaName, 'service_category_branches');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (query?.status && query.status !== 'all') {
      const isActive = query.status === 'ACTIVE';
      conditions.push(`sc.is_active = $${idx++}`);
      params.push(isActive);
    }

    if (query?.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(sc.name) LIKE $${idx} OR LOWER(sc.code) LIKE $${idx} OR LOWER(COALESCE(sc.description, '')) LIKE $${idx})`,
      );
      params.push(term);
      idx++;
    }

    if (query?.branchId) {
      conditions.push(`(
        EXISTS (SELECT 1 FROM ${categoryBranches} scb_filter WHERE scb_filter.category_id = sc.id AND scb_filter.branch_id = $${idx}::uuid)
        OR NOT EXISTS (SELECT 1 FROM ${categoryBranches} scb_empty WHERE scb_empty.category_id = sc.id)
      )`);
      params.push(query.branchId);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const isPaginated = query?.page !== undefined || query?.limit !== undefined;

      if (!isPaginated && (query?.all === true || query?.all === 'true' || !query)) {
        const rows = await tx.$queryRawUnsafe<Array<any>>(
          `SELECT sc.id, sc.code, sc.name, sc.description,
                  COALESCE(sc.is_active, true) AS "isActive",
                  CASE WHEN COALESCE(sc.is_active, true) THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                  sc.created_at AS "createdAt", sc.updated_at AS "updatedAt",
                  (SELECT COUNT(*)::int FROM ${services} s WHERE s.category_id = sc.id) AS "servicesCount",
                  COALESCE(
                    json_agg(
                      json_build_object('id', b.id, 'name', b.name, 'code', b.code)
                    ) FILTER (WHERE b.id IS NOT NULL),
                    '[]'
                  ) AS branches,
                  COALESCE(
                    array_remove(array_agg(scb.branch_id), NULL),
                    '{}'
                  ) AS "branchIds"
           FROM ${table} sc
           LEFT JOIN ${categoryBranches} scb ON sc.id = scb.category_id
           LEFT JOIN ${branches} b ON scb.branch_id = b.id
           ${whereClause}
           GROUP BY sc.id
           ORDER BY sc.name ASC`,
          ...params,
        );
        return rows;
      }

      // Count query for pagination
      const countResult = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(DISTINCT sc.id)::bigint AS count
         FROM ${table} sc
         ${whereClause}`,
        ...params,
      );
      const total = Number(countResult[0]?.count ?? 0);

      const page = query?.page ? Number(query.page) : 1;
      const limit = query?.limit ? Number(query.limit) : 10;
      const { offset, page: safePage, limit: safeLimit } = resolvePagination(page, limit);

      const rows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT sc.id, sc.code, sc.name, sc.description,
                COALESCE(sc.is_active, true) AS "isActive",
                CASE WHEN COALESCE(sc.is_active, true) THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                sc.created_at AS "createdAt", sc.updated_at AS "updatedAt",
                (SELECT COUNT(*)::int FROM ${services} s WHERE s.category_id = sc.id) AS "servicesCount",
                COALESCE(
                  json_agg(
                    json_build_object('id', b.id, 'name', b.name, 'code', b.code)
                  ) FILTER (WHERE b.id IS NOT NULL),
                  '[]'
                ) AS branches,
                COALESCE(
                  array_remove(array_agg(scb.branch_id), NULL),
                  '{}'
                ) AS "branchIds"
         FROM ${table} sc
         LEFT JOIN ${categoryBranches} scb ON sc.id = scb.category_id
         LEFT JOIN ${branches} b ON scb.branch_id = b.id
         ${whereClause}
         GROUP BY sc.id
         ORDER BY sc.name ASC
         LIMIT $${idx++} OFFSET $${idx++}`,
        ...params,
        safeLimit,
        offset,
      );

      return buildPaginatedResponse(rows, total, safePage, safeLimit);
    });
  }

  async createCategory(schemaName: string, dto: CreateServiceCategoryDto, userId: string) {
    const table = tenantTable(schemaName, 'service_categories');
    const categoryBranches = tenantTable(schemaName, 'service_category_branches');

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

      const categoryId = rows[0].id;

      if (dto.branchIds && dto.branchIds.length > 0) {
        for (const branchId of dto.branchIds) {
          await tx.$queryRawUnsafe(
            `INSERT INTO ${categoryBranches} (category_id, branch_id)
             VALUES ($1::uuid, $2::uuid)
             ON CONFLICT DO NOTHING`,
            categoryId,
            branchId,
          );
        }
      }

      await logAudit(tx, schemaName, {
        userId,
        action: 'SERVICE_CATEGORY_CREATE',
        entityType: 'service_category',
        entityId: categoryId,
        details: { code, name: dto.name, branchIds: dto.branchIds },
      });

      return { id: categoryId };
    });
  }

  async updateCategory(
    schemaName: string,
    id: string,
    dto: UpdateServiceCategoryDto,
    userId: string,
  ) {
    const table = tenantTable(schemaName, 'service_categories');
    const categoryBranches = tenantTable(schemaName, 'service_category_branches');
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

      if (dto.branchIds !== undefined) {
        await tx.$queryRawUnsafe(
          `DELETE FROM ${categoryBranches} WHERE category_id = $1::uuid`,
          id,
        );
        if (dto.branchIds.length > 0) {
          for (const branchId of dto.branchIds) {
            await tx.$queryRawUnsafe(
              `INSERT INTO ${categoryBranches} (category_id, branch_id)
               VALUES ($1::uuid, $2::uuid)
               ON CONFLICT DO NOTHING`,
              id,
              branchId,
            );
          }
        }
      }

      await logAudit(tx, schemaName, {
        userId,
        action: 'SERVICE_CATEGORY_UPDATE',
        entityType: 'service_category',
        entityId: id,
        details: { branchIds: dto.branchIds },
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

      // Cascading status update:
      // When category is activated -> activate all services in this category
      // When category is deactivated -> deactivate all services in this category
      await tx.$queryRawUnsafe(
        `UPDATE ${services} SET is_active = $2, updated_at = NOW() WHERE category_id = $1::uuid`,
        id,
        isActive,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'SERVICE_CATEGORY_STATUS_UPDATE',
        entityType: 'service_category',
        entityId: id,
        details: { status: dto.status, cascadedServicesStatus: isActive },
      });

      return { id, status: dto.status };
    });
  }

  async deleteCategory(schemaName: string, id: string, userId: string) {
    const table = tenantTable(schemaName, 'service_categories');
    const services = tenantTable(schemaName, 'services');
    await this.ensureCategoryExists(schemaName, id);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const assignedServices = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${services} WHERE category_id = $1::uuid`,
        id,
      );

      const count = Number(assignedServices[0]?.count ?? 0);
      if (count > 0) {
        throw new BadRequestException(
          `Cannot delete category because ${count} service${count === 1 ? ' is' : 's are'} assigned to it. Please reassign or delete those services first, or deactivate the category.`,
        );
      }

      await tx.$queryRawUnsafe(`DELETE FROM ${table} WHERE id = $1::uuid`, id);

      await logAudit(tx, schemaName, {
        userId,
        action: 'SERVICE_CATEGORY_DELETE',
        entityType: 'service_category',
        entityId: id,
      });

      return { id, success: true };
    });
  }

  // --- Services ---

  async listServices(schemaName: string, query?: ListServicesQueryDto | string) {
    const services = tenantTable(schemaName, 'services');
    const categories = tenantTable(schemaName, 'service_categories');
    const categoryBranches = tenantTable(schemaName, 'service_category_branches');

    const normalizedQuery: ListServicesQueryDto =
      typeof query === 'string'
        ? { categoryId: query }
        : query || {};

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (normalizedQuery.categoryId && normalizedQuery.categoryId !== 'all') {
      conditions.push(`s.category_id = $${idx++}::uuid`);
      params.push(normalizedQuery.categoryId);
    }

    if (normalizedQuery.status && normalizedQuery.status !== 'all') {
      const isActive = normalizedQuery.status === 'ACTIVE';
      conditions.push(`s.is_active = $${idx++}`);
      params.push(isActive);
    }

    if (normalizedQuery.search?.trim()) {
      const term = `%${normalizedQuery.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(s.name) LIKE $${idx} OR LOWER(s.code) LIKE $${idx} OR LOWER(COALESCE(s.description, '')) LIKE $${idx})`,
      );
      params.push(term);
      idx++;
    }

    if (normalizedQuery.branchId) {
      conditions.push(`(
        EXISTS (SELECT 1 FROM ${categoryBranches} scb WHERE scb.category_id = s.category_id AND scb.branch_id = $${idx}::uuid)
        OR NOT EXISTS (SELECT 1 FROM ${categoryBranches} scb_empty WHERE scb_empty.category_id = s.category_id)
      )`);
      params.push(normalizedQuery.branchId);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const isPaginated = normalizedQuery.page !== undefined || normalizedQuery.limit !== undefined;

      if (!isPaginated && (normalizedQuery.all === true || normalizedQuery.all === 'true' || typeof query === 'string' || !query)) {
        const rows = await tx.$queryRawUnsafe<Array<any>>(
          `SELECT s.id, s.code, s.name, s.description, s.price, s.duration_minutes AS "durationMinutes",
                  s.category_id AS "categoryId", c.name AS "categoryName",
                  COALESCE(c.is_active, true) AS "categoryIsActive",
                  CASE WHEN s.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                  s.created_at AS "createdAt", s.updated_at AS "updatedAt"
           FROM ${services} s
           LEFT JOIN ${categories} c ON s.category_id = c.id
           ${whereClause}
           ORDER BY c.name ASC NULLS LAST, s.name ASC`,
          ...params,
        );
        return rows;
      }

      // Count query
      const countResult = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(DISTINCT s.id)::bigint AS count
         FROM ${services} s
         LEFT JOIN ${categories} c ON s.category_id = c.id
         ${whereClause}`,
        ...params,
      );
      const total = Number(countResult[0]?.count ?? 0);

      const page = normalizedQuery.page ? Number(normalizedQuery.page) : 1;
      const limit = normalizedQuery.limit ? Number(normalizedQuery.limit) : 10;
      const { offset, page: safePage, limit: safeLimit } = resolvePagination(page, limit);

      const rows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT s.id, s.code, s.name, s.description, s.price, s.duration_minutes AS "durationMinutes",
                s.category_id AS "categoryId", c.name AS "categoryName",
                COALESCE(c.is_active, true) AS "categoryIsActive",
                CASE WHEN s.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                s.created_at AS "createdAt", s.updated_at AS "updatedAt"
         FROM ${services} s
         LEFT JOIN ${categories} c ON s.category_id = c.id
         ${whereClause}
         ORDER BY c.name ASC NULLS LAST, s.name ASC
         LIMIT $${idx++} OFFSET $${idx++}`,
        ...params,
        safeLimit,
        offset,
      );

      return buildPaginatedResponse(rows, total, safePage, safeLimit);
    });
  }

  async createService(schemaName: string, dto: CreateServiceDto, userId: string) {
    const services = tenantTable(schemaName, 'services');
    const categories = tenantTable(schemaName, 'service_categories');
    await this.ensureCategoryExists(schemaName, dto.categoryId);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const catRows = await tx.$queryRawUnsafe<Array<{ is_active: boolean }>>(
        `SELECT COALESCE(is_active, true) AS is_active FROM ${categories} WHERE id = $1::uuid LIMIT 1`,
        dto.categoryId,
      );
      if (catRows.length > 0 && !catRows[0].is_active) {
        throw new BadRequestException(
          'Cannot create an active service under a deactivated category. Please activate the category first.',
        );
      }

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
    const categories = tenantTable(schemaName, 'service_categories');
    await this.ensureServiceExists(schemaName, id);
    const isActive = dto.status === 'ACTIVE';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      if (isActive) {
        const catRows = await tx.$queryRawUnsafe<Array<{ is_active: boolean }>>(
          `SELECT COALESCE(c.is_active, true) AS is_active
           FROM ${categories} c
           INNER JOIN ${services} s ON s.category_id = c.id
           WHERE s.id = $1::uuid LIMIT 1`,
          id,
        );
        if (catRows.length > 0 && !catRows[0].is_active) {
          throw new BadRequestException(
            'Cannot activate service because its category is deactivated. Please activate the category first.',
          );
        }
      }

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

  async deleteService(schemaName: string, id: string, userId: string) {
    const services = tenantTable(schemaName, 'services');
    const appointmentServices = tenantTable(schemaName, 'appointment_services');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const quotationItems = tenantTable(schemaName, 'quotation_items');

    await this.ensureServiceExists(schemaName, id);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      // Check if service is linked to appointments, sales, or quotations
      const [salesUsage, aptUsage, quotUsage] = await Promise.all([
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${saleItems} WHERE service_id = $1::uuid`,
          id,
        ),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${appointmentServices} WHERE service_id = $1::uuid`,
          id,
        ),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${quotationItems} WHERE service_id = $1::uuid`,
          id,
        ),
      ]);

      const hasHistory =
        Number(salesUsage[0]?.count ?? 0) > 0 ||
        Number(aptUsage[0]?.count ?? 0) > 0 ||
        Number(quotUsage[0]?.count ?? 0) > 0;

      if (hasHistory) {
        throw new BadRequestException(
          'Cannot delete this service because it is linked to existing transactions, appointments, or quotations. Please deactivate it instead.',
        );
      }

      await tx.$queryRawUnsafe(`DELETE FROM ${services} WHERE id = $1::uuid`, id);

      await logAudit(tx, schemaName, {
        userId,
        action: 'SERVICE_DELETE',
        entityType: 'service',
        entityId: id,
      });

      return { id, success: true };
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
