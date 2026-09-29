import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { StorageService } from '../../common/storage/storage.service';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { logAudit } from '../utils/audit.util';
import { generateSequentialCode } from '../utils/code-generator.util';
import {
  CreateProductCategoryDto,
  CreateProductDto,
  CreateStockCreditPaymentDto,
  ListProductCategoriesQueryDto,
  ListProductsQueryDto,
  ListStockCreditsQueryDto,
  ListStockMovementsQueryDto,
  StockAdjustmentDto,
  StockInDto,
  UpdateProductCategoryDto,
  UpdateProductCategoryStatusDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto/inventory.dto';
import {
  resolveCreditPaymentUpdate,
  resolveStockInPayment,
} from './stock-receipt-money';

@Injectable()
export class InventoryService {
  constructor(
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly storageService: StorageService,
  ) {}

  // --- Product Image Upload ---

  async saveProductImage(file: Express.Multer.File | undefined): Promise<{ imageUrl: string }> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Product image must be 5MB or smaller');
    }

    const filename = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webp`;

    let buffer: Buffer;
    try {
      buffer = await sharp(file.buffer)
        .rotate()
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'Failed to process product image. Please provide a valid image file (PNG, JPG, WebP).',
      );
    }

    const imageUrl = await this.storageService.uploadFile(
      buffer,
      'products',
      filename,
      'image/webp',
    );

    return { imageUrl };
  }

  /** Tenant enums live in each schema; unqualified casts resolve to public and fail. */
  private stockMovementTypeCast(schemaName: string, paramIndex: number): string {
    return `$${paramIndex}::text::"${schemaName}".stock_movement_type`;
  }

  /** Map extended labels to base enum values present on all tenant schemas. */
  private resolveStockMovementType(movementType: string): string {
    const legacyMap: Record<string, string> = {
      STOCK_IN: 'IN',
      SALE: 'OUT',
      DAMAGE: 'OUT',
      TRANSFER: 'ADJUSTMENT',
    };
    return legacyMap[movementType] ?? movementType;
  }

  // --- Product Categories ---

  async listProductCategories(schemaName: string, query?: ListProductCategoriesQueryDto) {
    const table = tenantTable(schemaName, 'product_categories');
    const products = tenantTable(schemaName, 'products');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (query?.status && query.status !== 'all') {
      const isActive = query.status === 'ACTIVE';
      conditions.push(`pc.is_active = $${idx++}`);
      params.push(isActive);
    }

    if (query?.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(pc.name) LIKE $${idx} OR LOWER(pc.code) LIKE $${idx} OR LOWER(COALESCE(pc.description, '')) LIKE $${idx})`,
      );
      params.push(term);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await this.ensureProductCategoriesTableSynced(tx, schemaName);
      const isPaginated = query?.page !== undefined || query?.limit !== undefined;

      if (!isPaginated && (query?.all === true || query?.all === 'true' || !query)) {
        const rows = await tx.$queryRawUnsafe<Array<any>>(
          `SELECT pc.id, pc.code, pc.name, pc.description,
                  COALESCE(pc.is_active, true) AS "isActive",
                  CASE WHEN COALESCE(pc.is_active, true) THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                  pc.created_at AS "createdAt", pc.updated_at AS "updatedAt",
                  (SELECT COUNT(*)::int FROM ${products} p WHERE p.category_id = pc.id) AS "productsCount"
           FROM ${table} pc
           ${whereClause}
           ORDER BY pc.name ASC`,
          ...params,
        );
        return rows;
      }

      // Count query for pagination
      const countResult = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count
         FROM ${table} pc
         ${whereClause}`,
        ...params,
      );
      const total = Number(countResult[0]?.count ?? 0);

      const page = query?.page ? Number(query.page) : 1;
      const limit = query?.limit ? Number(query.limit) : 10;
      const { offset, page: safePage, limit: safeLimit } = resolvePagination(page, limit);

      const rows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT pc.id, pc.code, pc.name, pc.description,
                COALESCE(pc.is_active, true) AS "isActive",
                CASE WHEN COALESCE(pc.is_active, true) THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                pc.created_at AS "createdAt", pc.updated_at AS "updatedAt",
                (SELECT COUNT(*)::int FROM ${products} p WHERE p.category_id = pc.id) AS "productsCount"
         FROM ${table} pc
         ${whereClause}
         ORDER BY pc.name ASC
         LIMIT $${idx++} OFFSET $${idx++}`,
        ...params,
        safeLimit,
        offset,
      );

      return buildPaginatedResponse(rows, total, safePage, safeLimit);
    });
  }

  async createProductCategory(schemaName: string, dto: CreateProductCategoryDto, userId: string) {
    const table = tenantTable(schemaName, 'product_categories');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const code = dto.code
        ? dto.code.toUpperCase()
        : await generateSequentialCode(tx, table, 'PCAT-');

      const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${table} WHERE UPPER(code) = $1 LIMIT 1`,
        code,
      );
      if (existing.length > 0) {
        throw new ConflictException('Category code already exists');
      }

      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${table} (code, name, description, is_active) VALUES ($1, $2, $3, true) RETURNING id`,
        code,
        dto.name,
        dto.description ?? null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'PRODUCT_CATEGORY_CREATE',
        entityType: 'product_category',
        entityId: rows[0].id,
      });

      return rows[0];
    });
  }

  async updateProductCategory(
    schemaName: string,
    id: string,
    dto: UpdateProductCategoryDto,
    userId: string,
  ) {
    const table = tenantTable(schemaName, 'product_categories');
    await this.ensureProductCategoryExists(schemaName, id);

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
        action: 'PRODUCT_CATEGORY_UPDATE',
        entityType: 'product_category',
        entityId: id,
      });

      return { id };
    });
  }

  async updateProductCategoryStatus(
    schemaName: string,
    id: string,
    dto: UpdateProductCategoryStatusDto,
    userId: string,
  ) {
    const table = tenantTable(schemaName, 'product_categories');
    const products = tenantTable(schemaName, 'products');
    await this.ensureProductCategoryExists(schemaName, id);
    const isActive = dto.status === 'ACTIVE';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${table} SET is_active = $2, updated_at = NOW() WHERE id = $1::uuid`,
        id,
        isActive,
      );

      // Cascading status update:
      // When product category is activated/deactivated, cascade to all products in this category
      await tx.$queryRawUnsafe(
        `UPDATE ${products} SET is_active = $2, updated_at = NOW() WHERE category_id = $1::uuid`,
        id,
        isActive,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'PRODUCT_CATEGORY_STATUS_UPDATE',
        entityType: 'product_category',
        entityId: id,
        details: { status: dto.status, cascadedProductsStatus: isActive },
      });

      return { id, status: dto.status };
    });
  }

  async deleteProductCategory(schemaName: string, id: string, userId: string) {
    const table = tenantTable(schemaName, 'product_categories');
    const products = tenantTable(schemaName, 'products');
    await this.ensureProductCategoryExists(schemaName, id);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const assignedProducts = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${products} WHERE category_id = $1::uuid`,
        id,
      );

      const count = Number(assignedProducts[0]?.count ?? 0);
      if (count > 0) {
        throw new BadRequestException(
          `Cannot delete product category because ${count} product${count === 1 ? ' is' : 's are'} assigned to it. Please reassign or delete those products first, or deactivate the category.`,
        );
      }

      await tx.$queryRawUnsafe(`DELETE FROM ${table} WHERE id = $1::uuid`, id);

      await logAudit(tx, schemaName, {
        userId,
        action: 'PRODUCT_CATEGORY_DELETE',
        entityType: 'product_category',
        entityId: id,
      });

      return { id, success: true };
    });
  }

  // --- Products ---

  async listProducts(schemaName: string, query?: ListProductsQueryDto | string) {
    const products = tenantTable(schemaName, 'products');
    const categories = tenantTable(schemaName, 'product_categories');
    const branchStock = tenantTable(schemaName, 'branch_stock');
    const productBranches = tenantTable(schemaName, 'product_branches');

    const normalizedQuery: ListProductsQueryDto =
      typeof query === 'string'
        ? { categoryId: query }
        : query || {};

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (normalizedQuery.categoryId && normalizedQuery.categoryId !== 'all') {
      conditions.push(`p.category_id = $${idx++}::uuid`);
      params.push(normalizedQuery.categoryId);
    }

    if (normalizedQuery.branchId && normalizedQuery.branchId !== 'all') {
      conditions.push(
        `(EXISTS (SELECT 1 FROM ${productBranches} pb WHERE pb.product_id = p.id AND pb.branch_id = $${idx}::uuid) OR NOT EXISTS (SELECT 1 FROM ${productBranches} pb2 WHERE pb2.product_id = p.id))`,
      );
      params.push(normalizedQuery.branchId);
      idx++;
    }

    if (normalizedQuery.status && normalizedQuery.status !== 'all') {
      const isActive = normalizedQuery.status === 'ACTIVE';
      conditions.push(`p.is_active = $${idx++}`);
      params.push(isActive);
    }

    if (normalizedQuery.search?.trim()) {
      const term = `%${normalizedQuery.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(p.name) LIKE $${idx} OR LOWER(p.code) LIKE $${idx} OR LOWER(COALESCE(p.description, '')) LIKE $${idx})`,
      );
      params.push(term);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await this.ensureProductCategoriesTableSynced(tx, schemaName);
      await this.ensureProductsTableSynced(tx, schemaName);
      const isPaginated = normalizedQuery.page !== undefined || normalizedQuery.limit !== undefined;

      const branchStockSubquery =
        normalizedQuery.branchId && normalizedQuery.branchId !== 'all'
          ? `COALESCE((SELECT SUM(bs.quantity) FROM ${branchStock} bs WHERE bs.product_id = p.id AND bs.branch_id = '${normalizedQuery.branchId}'::uuid), 0)::float8 AS "stockQuantity"`
          : `COALESCE((SELECT SUM(bs.quantity) FROM ${branchStock} bs WHERE bs.product_id = p.id), 0)::float8 AS "stockQuantity"`;

      const selectFields = `p.id, p.code, p.name, p.description, p.unit, p.image_url AS "imageUrl",
                  p.selling_price AS "sellingPrice", p.cost_price AS "costPrice",
                  p.category_id AS "categoryId", c.name AS "categoryName",
                  COALESCE(c.is_active, true) AS "categoryIsActive",
                  ${branchStockSubquery},
                  COALESCE((SELECT ARRAY_AGG(pb.branch_id::text) FROM ${productBranches} pb WHERE pb.product_id = p.id), ARRAY[]::text[]) AS "branchIds",
                  CASE WHEN p.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                  p.created_at AS "createdAt", p.updated_at AS "updatedAt"`;

      if (!isPaginated && (normalizedQuery.all === true || normalizedQuery.all === 'true' || typeof query === 'string' || !query)) {
        const rows = await tx.$queryRawUnsafe<Array<any>>(
          `SELECT ${selectFields}
           FROM ${products} p
           LEFT JOIN ${categories} c ON p.category_id = c.id
           ${whereClause}
           ORDER BY c.name ASC NULLS LAST, p.name ASC`,
          ...params,
        );
        return rows;
      }

      // Count query for pagination
      const countResult = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(DISTINCT p.id)::bigint AS count
         FROM ${products} p
         LEFT JOIN ${categories} c ON p.category_id = c.id
         ${whereClause}`,
        ...params,
      );
      const total = Number(countResult[0]?.count ?? 0);

      const page = normalizedQuery.page ? Number(normalizedQuery.page) : 1;
      const limit = normalizedQuery.limit ? Number(normalizedQuery.limit) : 10;
      const { offset, page: safePage, limit: safeLimit } = resolvePagination(page, limit);

      const rows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT ${selectFields}
         FROM ${products} p
         LEFT JOIN ${categories} c ON p.category_id = c.id
         ${whereClause}
         ORDER BY c.name ASC NULLS LAST, p.name ASC
         LIMIT $${idx++} OFFSET $${idx++}`,
        ...params,
        safeLimit,
        offset,
      );

      return buildPaginatedResponse(rows, total, safePage, safeLimit);
    });
  }

  async createProduct(schemaName: string, dto: CreateProductDto, userId: string) {
    const products = tenantTable(schemaName, 'products');
    const categories = tenantTable(schemaName, 'product_categories');
    const productBranches = tenantTable(schemaName, 'product_branches');

    if (dto.categoryId) {
      await this.ensureProductCategoryExists(schemaName, dto.categoryId);
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await this.ensureProductsTableSynced(tx, schemaName);

      if (dto.categoryId) {
        const catRows = await tx.$queryRawUnsafe<Array<{ is_active: boolean }>>(
          `SELECT COALESCE(is_active, true) AS is_active FROM ${categories} WHERE id = $1::uuid LIMIT 1`,
          dto.categoryId,
        );
        if (catRows.length > 0 && !catRows[0].is_active) {
          throw new BadRequestException(
            'Cannot create an active product under a deactivated category. Please activate the category first.',
          );
        }
      }

      const code = await generateSequentialCode(tx, products, 'PRD-');
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${products} (category_id, code, name, description, unit, selling_price, cost_price, image_url, is_active)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, true)
         RETURNING id`,
        dto.categoryId || null,
        code,
        dto.name,
        dto.description ?? null,
        dto.unit,
        dto.sellingPrice,
        dto.costPrice,
        dto.imageUrl ?? null,
      );

      const productId = rows[0].id;

      // Assign to branches if selected
      if (dto.branchIds && dto.branchIds.length > 0) {
        for (const bId of dto.branchIds) {
          await tx.$queryRawUnsafe(
            `INSERT INTO ${productBranches} (product_id, branch_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`,
            productId,
            bId,
          );
        }
      }

      await logAudit(tx, schemaName, {
        userId,
        action: 'PRODUCT_CREATE',
        entityType: 'product',
        entityId: productId,
        details: { branchIds: dto.branchIds },
      });

      return { id: productId };
    });
  }

  async updateProduct(schemaName: string, id: string, dto: UpdateProductDto, userId: string) {
    const products = tenantTable(schemaName, 'products');
    const productBranches = tenantTable(schemaName, 'product_branches');
    await this.ensureProductExists(schemaName, id);

    if (dto.categoryId) {
      await this.ensureProductCategoryExists(schemaName, dto.categoryId);
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await this.ensureProductsTableSynced(tx, schemaName);

      await tx.$queryRawUnsafe(
        `UPDATE ${products}
         SET category_id = CASE WHEN $2::boolean THEN $3::uuid ELSE category_id END,
             name = COALESCE($4, name),
             description = CASE WHEN $5::boolean THEN $6 ELSE description END,
             unit = COALESCE($7, unit),
             selling_price = COALESCE($8, selling_price),
             cost_price = COALESCE($9, cost_price),
             image_url = CASE WHEN $10::boolean THEN $11 ELSE image_url END,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.categoryId !== undefined,
        dto.categoryId || null,
        dto.name ?? null,
        dto.description !== undefined,
        dto.description ?? null,
        dto.unit ?? null,
        dto.sellingPrice ?? null,
        dto.costPrice ?? null,
        dto.imageUrl !== undefined,
        dto.imageUrl ?? null,
      );

      // If branchIds provided, sync branch relations
      if (dto.branchIds !== undefined) {
        await tx.$queryRawUnsafe(`DELETE FROM ${productBranches} WHERE product_id = $1::uuid`, id);
        if (dto.branchIds.length > 0) {
          for (const bId of dto.branchIds) {
            await tx.$queryRawUnsafe(
              `INSERT INTO ${productBranches} (product_id, branch_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`,
              id,
              bId,
            );
          }
        }
      }

      await logAudit(tx, schemaName, {
        userId,
        action: 'PRODUCT_UPDATE',
        entityType: 'product',
        entityId: id,
      });

      return { id };
    });
  }

  async updateProductStatus(
    schemaName: string,
    id: string,
    dto: UpdateProductStatusDto,
    userId: string,
  ) {
    const products = tenantTable(schemaName, 'products');
    const categories = tenantTable(schemaName, 'product_categories');
    await this.ensureProductExists(schemaName, id);
    const isActive = dto.status === 'ACTIVE';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      if (isActive) {
        const catRows = await tx.$queryRawUnsafe<Array<{ is_active: boolean }>>(
          `SELECT COALESCE(c.is_active, true) AS is_active
           FROM ${categories} c
           INNER JOIN ${products} p ON p.category_id = c.id
           WHERE p.id = $1::uuid LIMIT 1`,
          id,
        );
        if (catRows.length > 0 && !catRows[0].is_active) {
          throw new BadRequestException(
            'Cannot activate product because its category is deactivated. Please activate the category first.',
          );
        }
      }

      await tx.$queryRawUnsafe(
        `UPDATE ${products} SET is_active = $2, updated_at = NOW() WHERE id = $1::uuid`,
        id,
        isActive,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'PRODUCT_STATUS_UPDATE',
        entityType: 'product',
        entityId: id,
        details: { status: dto.status },
      });

      return { id, status: dto.status };
    });
  }

  async deleteProduct(schemaName: string, id: string, userId: string) {
    const products = tenantTable(schemaName, 'products');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const stockReceiptItems = tenantTable(schemaName, 'stock_receipt_items');
    const stockMovements = tenantTable(schemaName, 'stock_movements');
    const stock = tenantTable(schemaName, 'branch_stock');

    await this.ensureProductExists(schemaName, id);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      // Check if product is referenced in sales, stock receipts, or stock movements
      const [salesUsage, receiptUsage, movementUsage, stockUsage] = await Promise.all([
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${saleItems} WHERE product_id = $1::uuid`,
          id,
        ),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${stockReceiptItems} WHERE product_id = $1::uuid`,
          id,
        ),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${stockMovements} WHERE product_id = $1::uuid`,
          id,
        ),
        tx.$queryRawUnsafe<Array<{ totalQty: string }>>(
          `SELECT COALESCE(SUM(quantity), 0)::text AS "totalQty" FROM ${stock} WHERE product_id = $1::uuid`,
          id,
        ),
      ]);

      const hasSales = Number(salesUsage[0]?.count ?? 0) > 0;
      const hasReceipts = Number(receiptUsage[0]?.count ?? 0) > 0;
      const hasMovements = Number(movementUsage[0]?.count ?? 0) > 0;
      const totalStock = Number(stockUsage[0]?.totalQty ?? 0);

      if (hasSales || hasReceipts || hasMovements || totalStock > 0) {
        throw new BadRequestException(
          'Cannot delete this product because it is linked to existing stock receipts, stock movements, or sales transactions. Please deactivate it instead.',
        );
      }

      // Delete any zero-quantity branch stock records
      await tx.$queryRawUnsafe(`DELETE FROM ${stock} WHERE product_id = $1::uuid`, id);

      // Delete product
      await tx.$queryRawUnsafe(`DELETE FROM ${products} WHERE id = $1::uuid`, id);

      await logAudit(tx, schemaName, {
        userId,
        action: 'PRODUCT_DELETE',
        entityType: 'product',
        entityId: id,
      });

      return { id, success: true };
    });
  }

  // --- Branch Stock ---

  async listStockLevels(schemaName: string, branchId?: string) {
    const stock = tenantTable(schemaName, 'branch_stock');
    const products = tenantTable(schemaName, 'products');
    const branches = tenantTable(schemaName, 'branches');
    const conditions = branchId ? 'WHERE bs.branch_id = $1::uuid' : '';
    const params = branchId ? [branchId] : [];

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe(
        `SELECT bs.id, bs.branch_id AS "branchId", b.name AS "branchName",
                bs.product_id AS "productId", p.name AS "productName", p.code AS "productCode",
                bs.quantity, bs.updated_at AS "updatedAt"
         FROM ${stock} bs
         INNER JOIN ${products} p ON bs.product_id = p.id
         INNER JOIN ${branches} b ON bs.branch_id = b.id
         ${conditions}
         ORDER BY b.name ASC, p.name ASC`,
        ...params,
      ),
    );
  }

  async stockIn(schemaName: string, dto: StockInDto, userId: string) {
    let money;
    try {
      money = resolveStockInPayment({
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        paymentType: dto.paymentType,
        paidAmount: dto.paidAmount,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid payment');
    }

    const purchaseDate = dto.purchaseDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const receipts = tenantTable(schemaName, 'stock_receipts');
    const items = tenantTable(schemaName, 'stock_receipt_items');
    const payments = tenantTable(schemaName, 'stock_credit_payments');
    const statusCast = `$9::text::"${schemaName}".stock_receipt_payment_status`;
    const methodCast = `$2::text::"${schemaName}".stock_credit_payment_method`;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const referenceNo =
        dto.referenceNo?.trim() || (await generateSequentialCode(tx, receipts, 'SIN-'));
      const movementNotes =
        [referenceNo ? `Ref ${referenceNo}` : null, dto.notes?.trim() || null]
          .filter(Boolean)
          .join(' — ') || null;

      const receiptRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${receipts}
           (branch_id, reference_no, purchase_date, total_amount, paid_amount,
            outstanding_amount, payment_status, notes, created_by)
         VALUES (
           $1::uuid, $2, $3::date, $4::numeric, $5::numeric,
           $6::numeric, ${statusCast}, $7, $8::uuid
         )
         RETURNING id`,
        dto.branchId,
        referenceNo,
        purchaseDate,
        money.totalAmount,
        money.paidAmount,
        money.outstandingAmount,
        dto.notes ?? null,
        userId,
        money.paymentStatus,
      );
      const receiptId = receiptRows[0].id;

      await tx.$queryRawUnsafe(
        `INSERT INTO ${items}
           (stock_receipt_id, product_id, quantity, unit_cost, line_total)
         VALUES ($1::uuid, $2::uuid, $3::numeric, $4::numeric, $5::numeric)`,
        receiptId,
        dto.productId,
        dto.quantity,
        dto.unitCost,
        money.lineTotal,
      );

      const stockResult = await this.applyStockChangeInTx(tx, schemaName, {
        branchId: dto.branchId,
        productId: dto.productId,
        quantityChange: dto.quantity,
        movementType: 'STOCK_IN',
        notes: movementNotes ?? undefined,
        userId,
        referenceType: 'STOCK_RECEIPT',
        referenceId: receiptId,
      });

      if (money.paidAmount > 0) {
        await tx.$queryRawUnsafe(
          `INSERT INTO ${payments}
             (stock_receipt_id, amount, payment_method, payment_date, notes, created_by)
           VALUES ($1::uuid, $3::numeric, ${methodCast}, $4::date, $5, $6::uuid)`,
          receiptId,
          'CASH',
          money.paidAmount,
          purchaseDate,
          'Initial payment on stock in',
          userId,
        );
      }

      await logAudit(tx, schemaName, {
        userId,
        action: 'STOCK_RECEIPT_CREATE',
        entityType: 'stock_receipt',
        entityId: receiptId,
        details: {
          paymentType: dto.paymentType,
          paymentStatus: money.paymentStatus,
          totalAmount: money.totalAmount,
          paidAmount: money.paidAmount,
          outstandingAmount: money.outstandingAmount,
          productId: dto.productId,
          quantity: dto.quantity,
        },
      });

      return {
        id: receiptId,
        stockQuantity: stockResult.stockQuantity,
        movementId: stockResult.movementId,
        totalAmount: money.totalAmount,
        paidAmount: money.paidAmount,
        outstandingAmount: money.outstandingAmount,
        paymentStatus: money.paymentStatus,
      };
    });
  }

  async listStockCredits(schemaName: string, query: ListStockCreditsQueryDto) {
    const receipts = tenantTable(schemaName, 'stock_receipts');
    const branches = tenantTable(schemaName, 'branches');
    const { page, limit, offset } = resolvePagination(query.page, query.limit);

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    if (query.branchId) {
      conditions.push(`sr.branch_id = $${idx++}::uuid`);
      params.push(query.branchId);
    }
    if (query.paymentStatus) {
      conditions.push(
        `sr.payment_status = $${idx++}::text::"${schemaName}".stock_receipt_payment_status`,
      );
      params.push(query.paymentStatus);
    }
    if (query.fromDate) {
      conditions.push(`sr.purchase_date >= $${idx++}::date`);
      params.push(query.fromDate.slice(0, 10));
    }
    if (query.toDate) {
      conditions.push(`sr.purchase_date <= $${idx++}::date`);
      params.push(query.toDate.slice(0, 10));
    }
    if (query.search?.trim()) {
      conditions.push(`sr.reference_no ILIKE $${idx++}`);
      params.push(`%${query.search.trim()}%`);
    }

    const whereClause = conditions.join(' AND ');
    const sortMap: Record<string, string> = {
      purchaseDate: 'sr.purchase_date',
      totalAmount: 'sr.total_amount',
      outstandingAmount: 'sr.outstanding_amount',
    };
    const sortCol = sortMap[query.sortBy ?? 'purchaseDate'] ?? 'sr.purchase_date';
    const sortDir = query.sortDir === 'asc' ? 'ASC' : 'DESC';

    const fromClause = `
         FROM ${receipts} sr
         INNER JOIN ${branches} b ON sr.branch_id = b.id
         WHERE ${whereClause}`;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count ${fromClause}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);

      const summaryRows = await tx.$queryRawUnsafe<
        Array<{
          totalPurchases: string;
          totalPaid: string;
          totalOutstanding: string;
        }>
      >(
        `SELECT COALESCE(SUM(sr.total_amount), 0)::text AS "totalPurchases",
                COALESCE(SUM(sr.paid_amount), 0)::text AS "totalPaid",
                COALESCE(SUM(sr.outstanding_amount), 0)::text AS "totalOutstanding"
         ${fromClause}`,
        ...params,
      );

      const data = await tx.$queryRawUnsafe(
        `SELECT sr.id, sr.branch_id AS "branchId", b.name AS "branchName",
                sr.reference_no AS "referenceNo",
                sr.purchase_date::text AS "purchaseDate",
                sr.total_amount::float8 AS "totalAmount",
                sr.paid_amount::float8 AS "paidAmount",
                sr.outstanding_amount::float8 AS "outstandingAmount",
                sr.payment_status::text AS "paymentStatus",
                sr.notes, sr.created_at AS "createdAt"
         ${fromClause}
         ORDER BY ${sortCol} ${sortDir}, sr.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      );

      const summary = summaryRows[0] ?? {
        totalPurchases: '0',
        totalPaid: '0',
        totalOutstanding: '0',
      };

      return {
        ...buildPaginatedResponse(data as unknown[], total, page, limit),
        summary: {
          totalPurchases: Number(summary.totalPurchases),
          totalPaid: Number(summary.totalPaid),
          totalOutstanding: Number(summary.totalOutstanding),
        },
      };
    });
  }

  async getStockCredit(schemaName: string, id: string) {
    const receipts = tenantTable(schemaName, 'stock_receipts');
    const branches = tenantTable(schemaName, 'branches');
    const items = tenantTable(schemaName, 'stock_receipt_items');
    const products = tenantTable(schemaName, 'products');
    const payments = tenantTable(schemaName, 'stock_credit_payments');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          branchId: string;
          branchName: string;
          referenceNo: string | null;
          purchaseDate: string;
          totalAmount: number;
          paidAmount: number;
          outstandingAmount: number;
          paymentStatus: string;
          notes: string | null;
          createdAt: Date;
        }>
      >(
        `SELECT sr.id, sr.branch_id AS "branchId", b.name AS "branchName",
                sr.reference_no AS "referenceNo",
                sr.purchase_date::text AS "purchaseDate",
                sr.total_amount::float8 AS "totalAmount",
                sr.paid_amount::float8 AS "paidAmount",
                sr.outstanding_amount::float8 AS "outstandingAmount",
                sr.payment_status::text AS "paymentStatus",
                sr.notes, sr.created_at AS "createdAt"
         FROM ${receipts} sr
         INNER JOIN ${branches} b ON sr.branch_id = b.id
         WHERE sr.id = $1::uuid
         LIMIT 1`,
        id,
      );
      if (rows.length === 0) {
        throw new NotFoundException('Stock credit receipt not found');
      }

      const itemRows = await tx.$queryRawUnsafe(
        `SELECT sri.id, sri.product_id AS "productId", p.name AS "productName", p.code AS "productCode",
                sri.quantity::float8 AS quantity,
                sri.unit_cost::float8 AS "unitCost",
                sri.line_total::float8 AS "lineTotal"
         FROM ${items} sri
         INNER JOIN ${products} p ON sri.product_id = p.id
         WHERE sri.stock_receipt_id = $1::uuid
         ORDER BY sri.created_at ASC`,
        id,
      );

      const paymentRows = await tx.$queryRawUnsafe(
        `SELECT scp.id, scp.amount::float8 AS amount,
                scp.payment_method::text AS "paymentMethod",
                scp.payment_date::text AS "paymentDate",
                scp.payment_reference AS "paymentReference",
                scp.notes, scp.created_at AS "createdAt"
         FROM ${payments} scp
         WHERE scp.stock_receipt_id = $1::uuid
         ORDER BY scp.payment_date ASC, scp.created_at ASC`,
        id,
      );

      return {
        ...rows[0],
        items: itemRows,
        payments: paymentRows,
      };
    });
  }

  async addStockCreditPayment(
    schemaName: string,
    id: string,
    dto: CreateStockCreditPaymentDto,
    userId: string,
  ) {
    const receipts = tenantTable(schemaName, 'stock_receipts');
    const payments = tenantTable(schemaName, 'stock_credit_payments');
    const statusCast = `$4::text::"${schemaName}".stock_receipt_payment_status`;
    const methodCast = `$2::text::"${schemaName}".stock_credit_payment_method`;
    const paymentDate = dto.paymentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          totalAmount: string;
          paidAmount: string;
          outstandingAmount: string;
        }>
      >(
        `SELECT id,
                total_amount::text AS "totalAmount",
                paid_amount::text AS "paidAmount",
                outstanding_amount::text AS "outstandingAmount"
         FROM ${receipts}
         WHERE id = $1::uuid
         FOR UPDATE`,
        id,
      );
      if (rows.length === 0) {
        throw new NotFoundException('Stock credit receipt not found');
      }

      let next;
      try {
        next = resolveCreditPaymentUpdate({
          totalAmount: Number(rows[0].totalAmount),
          currentPaidAmount: Number(rows[0].paidAmount),
          paymentAmount: dto.amount,
        });
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : 'Invalid payment');
      }

      const paymentRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${payments}
           (stock_receipt_id, amount, payment_method, payment_date, payment_reference, notes, created_by)
         VALUES ($1::uuid, $3::numeric, ${methodCast}, $4::date, $5, $6, $7::uuid)
         RETURNING id`,
        id,
        dto.paymentMethod,
        dto.amount,
        paymentDate,
        dto.paymentReference ?? null,
        dto.notes ?? null,
        userId,
      );

      await tx.$queryRawUnsafe(
        `UPDATE ${receipts}
         SET paid_amount = $2::numeric,
             outstanding_amount = $3::numeric,
             payment_status = ${statusCast},
             updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        next.paidAmount,
        next.outstandingAmount,
        next.paymentStatus,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'STOCK_CREDIT_PAYMENT',
        entityType: 'stock_credit_payment',
        entityId: paymentRows[0].id,
        details: {
          stockReceiptId: id,
          amount: dto.amount,
          paidAmount: next.paidAmount,
          outstandingAmount: next.outstandingAmount,
          paymentStatus: next.paymentStatus,
        },
      });

      return {
        paymentId: paymentRows[0].id,
        stockReceiptId: id,
        paidAmount: next.paidAmount,
        outstandingAmount: next.outstandingAmount,
        paymentStatus: next.paymentStatus,
      };
    });
  }

  async stockAdjustment(schemaName: string, dto: StockAdjustmentDto, userId: string) {
    if (dto.quantity === 0) {
      throw new BadRequestException('Adjustment quantity cannot be zero');
    }

    return this.applyStockChange(schemaName, {
      branchId: dto.branchId,
      productId: dto.productId,
      quantityChange: dto.quantity,
      movementType: 'ADJUSTMENT',
      notes: dto.notes,
      userId,
    });
  }

  async listStockMovements(schemaName: string, query: ListStockMovementsQueryDto) {
    const movements = tenantTable(schemaName, 'stock_movements');
    const products = tenantTable(schemaName, 'products');
    const branches = tenantTable(schemaName, 'branches');
    const { page, limit, offset } = resolvePagination(query.page, query.limit);

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    if (query.branchId) {
      conditions.push(`sm.branch_id = $${idx++}::uuid`);
      params.push(query.branchId);
    }
    if (query.productId) {
      conditions.push(`sm.product_id = $${idx++}::uuid`);
      params.push(query.productId);
    }

    const whereClause = conditions.join(' AND ');
    const fromClause = `
         FROM ${movements} sm
         INNER JOIN ${products} p ON sm.product_id = p.id
         INNER JOIN ${branches} b ON sm.branch_id = b.id
         WHERE ${whereClause}`;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count ${fromClause}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);

      const data = await tx.$queryRawUnsafe(
        `SELECT sm.id, sm.branch_id AS "branchId", b.name AS "branchName",
                sm.product_id AS "productId", p.name AS "productName",
                sm.type::text AS type, sm.quantity, sm.notes,
                sm.reference_type AS "referenceType", sm.reference_id AS "referenceId",
                sm.created_by AS "createdBy", sm.created_at AS "createdAt"
         ${fromClause}
         ORDER BY sm.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      );

      return buildPaginatedResponse(data as unknown[], total, page, limit);
    });
  }

  /** Used by POS to reduce stock - must run inside existing transaction */
  async reduceStockForSale(
    tx: { $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T> },
    schemaName: string,
    data: {
      branchId: string;
      productId: string;
      quantity: number;
      saleId: string;
      userId: string;
    },
  ): Promise<void> {
    await this.applyStockChangeInTx(tx, schemaName, {
      branchId: data.branchId,
      productId: data.productId,
      quantityChange: -Math.abs(data.quantity),
      movementType: 'SALE',
      notes: `Sale ${data.saleId}`,
      userId: data.userId,
      referenceType: 'sale',
      referenceId: data.saleId,
    });
  }

  private async applyStockChange(
    schemaName: string,
    data: {
      branchId: string;
      productId: string;
      quantityChange: number;
      movementType: string;
      notes?: string;
      userId: string;
      referenceType?: string;
      referenceId?: string;
    },
  ) {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const result = await this.applyStockChangeInTx(tx, schemaName, data);
      return result;
    });
  }

  private async applyStockChangeInTx(
    tx: { $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T> },
    schemaName: string,
    data: {
      branchId: string;
      productId: string;
      quantityChange: number;
      movementType: string;
      notes?: string;
      userId: string;
      referenceType?: string;
      referenceId?: string;
    },
  ) {
    const stock = tenantTable(schemaName, 'branch_stock');
    const movements = tenantTable(schemaName, 'stock_movements');
    const branches = tenantTable(schemaName, 'branches');
    const products = tenantTable(schemaName, 'products');

    const branch = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM ${branches} WHERE id = $1::uuid LIMIT 1`,
      data.branchId,
    );
    if (branch.length === 0) {
      throw new NotFoundException('Branch not found');
    }

    const product = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM ${products} WHERE id = $1::uuid LIMIT 1`,
      data.productId,
    );
    if (product.length === 0) {
      throw new NotFoundException('Product not found');
    }

    const existing = await tx.$queryRawUnsafe<Array<{ id: string; quantity: string }>>(
      `SELECT id, quantity::text FROM ${stock}
       WHERE branch_id = $1::uuid AND product_id = $2::uuid LIMIT 1`,
      data.branchId,
      data.productId,
    );

    const currentQty = existing.length > 0 ? Number(existing[0].quantity) : 0;
    const newQty = currentQty + data.quantityChange;

    if (newQty < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    if (existing.length > 0) {
      await tx.$queryRawUnsafe(
        `UPDATE ${stock} SET quantity = $2::numeric, updated_at = NOW() WHERE id = $1::uuid`,
        existing[0].id,
        newQty,
      );
    } else {
      if (data.quantityChange < 0) {
        throw new BadRequestException('Insufficient stock');
      }
      await tx.$queryRawUnsafe(
        `INSERT INTO ${stock} (branch_id, product_id, quantity) VALUES ($1::uuid, $2::uuid, $3::numeric)`,
        data.branchId,
        data.productId,
        newQty,
      );
    }

    const dbMovementType = this.resolveStockMovementType(data.movementType);
    const typeCast = this.stockMovementTypeCast(schemaName, 3);

    const movementRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO ${movements}
         (branch_id, product_id, type, quantity, notes, reference_type, reference_id, created_by)
       VALUES ($1::uuid, $2::uuid, ${typeCast}, $4::numeric, $5, $6, $7::uuid, $8::uuid)
       RETURNING id`,
      data.branchId,
      data.productId,
      dbMovementType,
      Math.abs(data.quantityChange),
      data.notes ?? null,
      data.referenceType ?? null,
      data.referenceId ?? null,
      data.userId,
    );

    await logAudit(tx, schemaName, {
      userId: data.userId,
      action: 'STOCK_MOVEMENT',
      entityType: 'stock_movement',
      entityId: movementRows[0].id,
      details: {
        type: data.movementType,
        quantity: data.quantityChange,
        branchId: data.branchId,
        productId: data.productId,
      },
    });

    return { stockQuantity: newQty, movementId: movementRows[0].id };
  }

  private async ensureProductCategoryExists(schemaName: string, id: string) {
    const table = tenantTable(schemaName, 'product_categories');
    const rows = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${table} WHERE id = $1::uuid LIMIT 1`,
        id,
      ),
    );
    if (rows.length === 0) {
      throw new NotFoundException('Product category not found');
    }
  }

  private async ensureProductExists(schemaName: string, id: string) {
    const table = tenantTable(schemaName, 'products');
    const rows = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${table} WHERE id = $1::uuid LIMIT 1`,
        id,
      ),
    );
    if (rows.length === 0) {
      throw new NotFoundException('Product not found');
    }
  }

  private async ensureProductCategoriesTableSynced(
    tx: { $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown> },
    schemaName: string,
  ) {
    const table = tenantTable(schemaName, 'product_categories');
    try {
      await tx.$executeRawUnsafe(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`,
      );
    } catch {
      // Ignore if concurrent or already present
    }
  }

  private async ensureProductsTableSynced(
    tx: { $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown> },
    schemaName: string,
  ) {
    const products = tenantTable(schemaName, 'products');
    const productBranches = tenantTable(schemaName, 'product_branches');
    const branches = tenantTable(schemaName, 'branches');
    try {
      await tx.$executeRawUnsafe(
        `ALTER TABLE ${products} ADD COLUMN IF NOT EXISTS image_url TEXT`,
      );
      await tx.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS ${productBranches} (
          product_id UUID NOT NULL,
          branch_id UUID NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          PRIMARY KEY (product_id, branch_id),
          CONSTRAINT pb_product_fkey FOREIGN KEY (product_id) REFERENCES ${products}(id) ON DELETE CASCADE,
          CONSTRAINT pb_branch_fkey FOREIGN KEY (branch_id) REFERENCES ${branches}(id) ON DELETE CASCADE
        )`,
      );
      await tx.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS idx_pb_product_id ON ${productBranches}(product_id)`,
      );
      await tx.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS idx_pb_branch_id ON ${productBranches}(branch_id)`,
      );
    } catch {
      // Ignore if concurrent or already present
    }
  }
}
