import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { logAudit } from '../utils/audit.util';
import { generateSequentialCode } from '../utils/code-generator.util';
import {
  CreateProductCategoryDto,
  CreateProductDto,
  ListStockMovementsQueryDto,
  StockAdjustmentDto,
  StockInDto,
  UpdateProductCategoryDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

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

  async listProductCategories(schemaName: string) {
    const table = tenantTable(schemaName, 'product_categories');
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe(
        `SELECT id, code, name, description,
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM ${table} ORDER BY name ASC`,
      ),
    );
  }

  async createProductCategory(schemaName: string, dto: CreateProductCategoryDto, userId: string) {
    const table = tenantTable(schemaName, 'product_categories');
    const code = dto.code.toUpperCase();

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${table} WHERE UPPER(code) = $1 LIMIT 1`,
        code,
      );
      if (existing.length > 0) {
        throw new ConflictException('Category code already exists');
      }

      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${table} (code, name, description) VALUES ($1, $2, $3) RETURNING id`,
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

  // --- Products ---

  async listProducts(schemaName: string, categoryId?: string) {
    const products = tenantTable(schemaName, 'products');
    const categories = tenantTable(schemaName, 'product_categories');
    const conditions = categoryId ? 'WHERE p.category_id = $1::uuid' : '';
    const params = categoryId ? [categoryId] : [];

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe(
        `SELECT p.id, p.code, p.name, p.description, p.unit,
                p.selling_price AS "sellingPrice", p.cost_price AS "costPrice",
                p.category_id AS "categoryId", c.name AS "categoryName",
                CASE WHEN p.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                p.created_at AS "createdAt", p.updated_at AS "updatedAt"
         FROM ${products} p
         LEFT JOIN ${categories} c ON p.category_id = c.id
         ${conditions}
         ORDER BY p.name ASC`,
        ...params,
      ),
    );
  }

  async createProduct(schemaName: string, dto: CreateProductDto, userId: string) {
    const products = tenantTable(schemaName, 'products');

    if (dto.categoryId) {
      await this.ensureProductCategoryExists(schemaName, dto.categoryId);
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const code = await generateSequentialCode(tx, products, 'PRD-');
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${products} (category_id, code, name, description, unit, selling_price, cost_price, is_active)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, true)
         RETURNING id`,
        dto.categoryId ?? null,
        code,
        dto.name,
        dto.description ?? null,
        dto.unit ?? null,
        dto.sellingPrice,
        dto.costPrice ?? 0,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'PRODUCT_CREATE',
        entityType: 'product',
        entityId: rows[0].id,
      });

      return rows[0];
    });
  }

  async updateProduct(schemaName: string, id: string, dto: UpdateProductDto, userId: string) {
    const products = tenantTable(schemaName, 'products');
    await this.ensureProductExists(schemaName, id);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${products}
         SET category_id = COALESCE($2::uuid, category_id),
             name = COALESCE($3, name),
             description = COALESCE($4, description),
             unit = COALESCE($5, unit),
             selling_price = COALESCE($6, selling_price),
             cost_price = COALESCE($7, cost_price),
             updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.categoryId ?? null,
        dto.name ?? null,
        dto.description ?? null,
        dto.unit ?? null,
        dto.sellingPrice ?? null,
        dto.costPrice ?? null,
      );

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
    await this.ensureProductExists(schemaName, id);
    const isActive = dto.status === 'ACTIVE';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
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
    return this.applyStockChange(schemaName, {
      branchId: dto.branchId,
      productId: dto.productId,
      quantityChange: dto.quantity,
      movementType: 'STOCK_IN',
      notes: dto.notes,
      userId,
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
}
