import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { logAudit } from '../utils/audit.util';
import {
  CreateSupplierDto,
  ListSuppliersQueryDto,
  UpdateSupplierDto,
  UpdateSupplierStatusDto,
} from './dto/supplier.dto';
import {
  CancelGrnDto,
  CreateGrnDto,
  ListGrnsQueryDto,
  ReceiveGrnDto,
  UpdateGrnDto,
} from './dto/grn.dto';
import {
  CreateSupplierPaymentDto,
  ListSupplierPaymentsQueryDto,
  UpdateChequeStatusDto,
} from './dto/supplier-payment.dto';
import { ListSupplierOutstandingQueryDto } from './dto/supplier-outstanding.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  // =========================================================================
  // 1. SUPPLIERS
  // =========================================================================

  async listSuppliers(schemaName: string, query?: ListSuppliersQueryDto) {
    const suppliers = tenantTable(schemaName, 'suppliers');
    const grns = tenantTable(schemaName, 'grns');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (query?.status && query.status !== 'all') {
      const isActive = query.status === 'ACTIVE';
      conditions.push(`s.is_active = $${idx++}`);
      params.push(isActive);
    }

    if (query?.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(s.name) LIKE $${idx} OR LOWER(COALESCE(s.contact_person, '')) LIKE $${idx} OR LOWER(COALESCE(s.phone, '')) LIKE $${idx} OR LOWER(COALESCE(s.email, '')) LIKE $${idx})`,
      );
      params.push(term);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const isPaginated = query?.page !== undefined || query?.limit !== undefined;

      if (!isPaginated && (query?.all === true || query?.all === 'true' || !query)) {
        const rows = await tx.$queryRawUnsafe<Array<any>>(
          `SELECT s.id, s.name, s.contact_person AS "contactPerson", s.phone, s.email,
                  s.address, s.notes, s.is_active AS "isActive",
                  CASE WHEN s.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                  s.created_at AS "createdAt", s.updated_at AS "updatedAt",
                  COALESCE(g.total_purchases, 0)::numeric AS "totalPurchases",
                  COALESCE(g.total_paid, 0)::numeric AS "totalPaid",
                  COALESCE(g.total_outstanding, 0)::numeric AS "currentOutstanding",
                  COALESCE(g.grns_count, 0)::int AS "grnsCount"
           FROM ${suppliers} s
           LEFT JOIN (
             SELECT supplier_id,
                    SUM(total_amount) AS total_purchases,
                    SUM(paid_amount) AS total_paid,
                    SUM(outstanding_amount) AS total_outstanding,
                    COUNT(*) AS grns_count
             FROM ${grns}
             WHERE grn_status = 'RECEIVED'
             GROUP BY supplier_id
           ) g ON g.supplier_id = s.id
           ${whereClause}
           ORDER BY s.name ASC`,
          ...params,
        );

        return rows.map((r) => ({
          ...r,
          totalPurchases: Number(r.totalPurchases),
          totalPaid: Number(r.totalPaid),
          currentOutstanding: Number(r.currentOutstanding),
          grnsCount: Number(r.grnsCount),
        }));
      }

      // Paginated
      const countResult = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count
         FROM ${suppliers} s
         ${whereClause}`,
        ...params,
      );
      const total = Number(countResult[0]?.count ?? 0);
      const { page, limit, offset } = resolvePagination(query?.page, query?.limit);

      const rows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT s.id, s.name, s.contact_person AS "contactPerson", s.phone, s.email,
                s.address, s.notes, s.is_active AS "isActive",
                CASE WHEN s.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                s.created_at AS "createdAt", s.updated_at AS "updatedAt",
                COALESCE(g.total_purchases, 0)::numeric AS "totalPurchases",
                COALESCE(g.total_paid, 0)::numeric AS "totalPaid",
                COALESCE(g.total_outstanding, 0)::numeric AS "currentOutstanding",
                COALESCE(g.grns_count, 0)::int AS "grnsCount"
         FROM ${suppliers} s
         LEFT JOIN (
           SELECT supplier_id,
                  SUM(total_amount) AS total_purchases,
                  SUM(paid_amount) AS total_paid,
                  SUM(outstanding_amount) AS total_outstanding,
                  COUNT(*) AS grns_count
           FROM ${grns}
           WHERE grn_status = 'RECEIVED'
           GROUP BY supplier_id
         ) g ON g.supplier_id = s.id
         ${whereClause}
         ORDER BY s.name ASC
         LIMIT $${idx++} OFFSET $${idx++}`,
        ...params,
        limit,
        offset,
      );

      const data = rows.map((r) => ({
        ...r,
        totalPurchases: Number(r.totalPurchases),
        totalPaid: Number(r.totalPaid),
        currentOutstanding: Number(r.currentOutstanding),
        grnsCount: Number(r.grnsCount),
      }));

      return buildPaginatedResponse(data, total, page, limit);
    });
  }

  async getSupplier(schemaName: string, id: string) {
    const suppliers = tenantTable(schemaName, 'suppliers');
    const grns = tenantTable(schemaName, 'grns');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT s.id, s.name, s.contact_person AS "contactPerson", s.phone, s.email,
                s.address, s.notes, s.is_active AS "isActive",
                CASE WHEN s.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
                s.created_at AS "createdAt", s.updated_at AS "updatedAt",
                COALESCE(g.total_purchases, 0)::numeric AS "totalPurchases",
                COALESCE(g.total_paid, 0)::numeric AS "totalPaid",
                COALESCE(g.total_outstanding, 0)::numeric AS "currentOutstanding",
                COALESCE(g.grns_count, 0)::int AS "grnsCount"
         FROM ${suppliers} s
         LEFT JOIN (
           SELECT supplier_id,
                  SUM(total_amount) AS total_purchases,
                  SUM(paid_amount) AS total_paid,
                  SUM(outstanding_amount) AS total_outstanding,
                  COUNT(*) AS grns_count
           FROM ${grns}
           WHERE grn_status = 'RECEIVED'
           GROUP BY supplier_id
         ) g ON g.supplier_id = s.id
         WHERE s.id = $1::uuid
         LIMIT 1`,
        id,
      );

      if (rows.length === 0) {
        throw new NotFoundException('Supplier not found');
      }

      const r = rows[0];
      return {
        ...r,
        totalPurchases: Number(r.totalPurchases),
        totalPaid: Number(r.totalPaid),
        currentOutstanding: Number(r.currentOutstanding),
        grnsCount: Number(r.grnsCount),
      };
    });
  }

  async createSupplier(schemaName: string, dto: CreateSupplierDto, userId: string) {
    const suppliers = tenantTable(schemaName, 'suppliers');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<Array<any>>(
        `INSERT INTO ${suppliers}
           (name, contact_person, phone, email, address, notes, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, contact_person AS "contactPerson", phone, email, address, notes, is_active AS "isActive", created_at AS "createdAt"`,
        dto.name.trim(),
        dto.contactPerson?.trim() ?? null,
        dto.phone?.trim() ?? null,
        dto.email?.trim()?.toLowerCase() ?? null,
        dto.address?.trim() ?? null,
        dto.notes?.trim() ?? null,
        dto.isActive ?? true,
      );

      const supplier = rows[0];

      await logAudit(tx, schemaName, {
        userId,
        action: 'SUPPLIER_CREATE',
        entityType: 'supplier',
        entityId: supplier.id,
        details: { name: supplier.name },
      });

      return supplier;
    });
  }

  async updateSupplier(schemaName: string, id: string, dto: UpdateSupplierDto, userId: string) {
    await this.ensureSupplierExists(schemaName, id);
    const suppliers = tenantTable(schemaName, 'suppliers');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const sets: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [id];
      let idx = 2;

      if (dto.name !== undefined) {
        sets.push(`name = $${idx++}`);
        params.push(dto.name.trim());
      }
      if (dto.contactPerson !== undefined) {
        sets.push(`contact_person = $${idx++}`);
        params.push(dto.contactPerson ? dto.contactPerson.trim() : null);
      }
      if (dto.phone !== undefined) {
        sets.push(`phone = $${idx++}`);
        params.push(dto.phone ? dto.phone.trim() : null);
      }
      if (dto.email !== undefined) {
        sets.push(`email = $${idx++}`);
        params.push(dto.email ? dto.email.trim().toLowerCase() : null);
      }
      if (dto.address !== undefined) {
        sets.push(`address = $${idx++}`);
        params.push(dto.address ? dto.address.trim() : null);
      }
      if (dto.notes !== undefined) {
        sets.push(`notes = $${idx++}`);
        params.push(dto.notes ? dto.notes.trim() : null);
      }
      if (dto.isActive !== undefined) {
        sets.push(`is_active = $${idx++}`);
        params.push(dto.isActive);
      }

      const rows = await tx.$queryRawUnsafe<Array<any>>(
        `UPDATE ${suppliers}
         SET ${sets.join(', ')}
         WHERE id = $1::uuid
         RETURNING id, name, contact_person AS "contactPerson", phone, email, address, notes, is_active AS "isActive", updated_at AS "updatedAt"`,
        ...params,
      );

      const supplier = rows[0];

      await logAudit(tx, schemaName, {
        userId,
        action: 'SUPPLIER_UPDATE',
        entityType: 'supplier',
        entityId: id,
        details: { name: supplier.name },
      });

      return supplier;
    });
  }

  async updateSupplierStatus(schemaName: string, id: string, dto: UpdateSupplierStatusDto, userId: string) {
    await this.ensureSupplierExists(schemaName, id);
    const suppliers = tenantTable(schemaName, 'suppliers');
    const isActive = dto.status === 'ACTIVE';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${suppliers} SET is_active = $2, updated_at = NOW() WHERE id = $1::uuid`,
        id,
        isActive,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'SUPPLIER_STATUS_UPDATE',
        entityType: 'supplier',
        entityId: id,
        details: { status: dto.status },
      });

      return { id, status: dto.status, isActive };
    });
  }

  async deleteSupplier(schemaName: string, id: string, userId: string) {
    await this.ensureSupplierExists(schemaName, id);
    const suppliers = tenantTable(schemaName, 'suppliers');
    const grns = tenantTable(schemaName, 'grns');
    const payments = tenantTable(schemaName, 'supplier_payments');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const [grnCount, paymentCount] = await Promise.all([
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${grns} WHERE supplier_id = $1::uuid`,
          id,
        ),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${payments} WHERE supplier_id = $1::uuid`,
          id,
        ),
      ]);

      if (Number(grnCount[0]?.count ?? 0) > 0 || Number(paymentCount[0]?.count ?? 0) > 0) {
        throw new BadRequestException(
          'Cannot delete supplier with linked GRN purchases or payment history. Please deactivate the supplier instead.',
        );
      }

      await tx.$queryRawUnsafe(`DELETE FROM ${suppliers} WHERE id = $1::uuid`, id);

      await logAudit(tx, schemaName, {
        userId,
        action: 'SUPPLIER_DELETE',
        entityType: 'supplier',
        entityId: id,
      });

      return { id, success: true };
    });
  }

  // =========================================================================
  // 2. GRN / PURCHASES
  // =========================================================================

  async listGrns(schemaName: string, query?: ListGrnsQueryDto) {
    const grns = tenantTable(schemaName, 'grns');
    const suppliers = tenantTable(schemaName, 'suppliers');
    const branches = tenantTable(schemaName, 'branches');
    const users = tenantTable(schemaName, 'users');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (query?.supplierId) {
      conditions.push(`g.supplier_id = $${idx++}::uuid`);
      params.push(query.supplierId);
    }

    if (query?.branchId) {
      conditions.push(`g.branch_id = $${idx++}::uuid`);
      params.push(query.branchId);
    }

    if (query?.grnStatus && query.grnStatus !== 'all') {
      conditions.push(`g.grn_status = $${idx++}::text::"${schemaName}".grn_status`);
      params.push(query.grnStatus);
    }

    if (query?.paymentStatus && query.paymentStatus !== 'all') {
      conditions.push(`g.payment_status = $${idx++}::text::"${schemaName}".grn_payment_status`);
      params.push(query.paymentStatus);
    }

    if (query?.startDate) {
      conditions.push(`g.grn_date >= $${idx++}::date`);
      params.push(query.startDate.slice(0, 10));
    }

    if (query?.endDate) {
      conditions.push(`g.grn_date <= $${idx++}::date`);
      params.push(query.endDate.slice(0, 10));
    }

    if (query?.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(g.grn_number) LIKE $${idx} OR LOWER(COALESCE(g.supplier_invoice_number, '')) LIKE $${idx} OR LOWER(s.name) LIKE $${idx})`,
      );
      params.push(term);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countResult = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count
         FROM ${grns} g
         INNER JOIN ${suppliers} s ON g.supplier_id = s.id
         ${whereClause}`,
        ...params,
      );
      const total = Number(countResult[0]?.count ?? 0);
      const { page, limit, offset } = resolvePagination(query?.page, query?.limit);

      const rows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT g.id, g.grn_number AS "grnNumber", g.supplier_id AS "supplierId", s.name AS "supplierName",
                g.branch_id AS "branchId", b.name AS "branchName",
                g.supplier_invoice_number AS "supplierInvoiceNumber",
                g.grn_date AS "grnDate", g.due_date AS "dueDate",
                g.subtotal::numeric AS "subtotal", g.discount_amount::numeric AS "discountAmount",
                g.total_amount::numeric AS "totalAmount", g.paid_amount::numeric AS "paidAmount",
                g.outstanding_amount::numeric AS "outstandingAmount",
                g.payment_status AS "paymentStatus", g.grn_status AS "grnStatus",
                g.notes, g.received_at AS "receivedAt", g.cancelled_at AS "cancelledAt",
                g.created_by AS "createdBy", u.name AS "createdByName",
                g.created_at AS "createdAt", g.updated_at AS "updatedAt",
                (SELECT COUNT(*)::int FROM "${schemaName}".grn_items gi WHERE gi.grn_id = g.id) AS "itemsCount"
         FROM ${grns} g
         INNER JOIN ${suppliers} s ON g.supplier_id = s.id
         INNER JOIN ${branches} b ON g.branch_id = b.id
         LEFT JOIN ${users} u ON g.created_by = u.id
         ${whereClause}
         ORDER BY g.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        ...params,
        limit,
        offset,
      );

      const data = rows.map((r) => ({
        ...r,
        subtotal: Number(r.subtotal),
        discountAmount: Number(r.discountAmount),
        totalAmount: Number(r.totalAmount),
        paidAmount: Number(r.paidAmount),
        outstandingAmount: Number(r.outstandingAmount),
        itemsCount: Number(r.itemsCount),
      }));

      return buildPaginatedResponse(data, total, page, limit);
    });
  }

  async getGrn(schemaName: string, id: string) {
    const grns = tenantTable(schemaName, 'grns');
    const grnItems = tenantTable(schemaName, 'grn_items');
    const suppliers = tenantTable(schemaName, 'suppliers');
    const branches = tenantTable(schemaName, 'branches');
    const products = tenantTable(schemaName, 'products');
    const users = tenantTable(schemaName, 'users');
    const allocations = tenantTable(schemaName, 'supplier_payment_allocations');
    const payments = tenantTable(schemaName, 'supplier_payments');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const grnRows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT g.id, g.grn_number AS "grnNumber", g.supplier_id AS "supplierId", s.name AS "supplierName",
                s.phone AS "supplierPhone", s.email AS "supplierEmail", s.address AS "supplierAddress",
                g.branch_id AS "branchId", b.name AS "branchName",
                g.supplier_invoice_number AS "supplierInvoiceNumber",
                g.grn_date AS "grnDate", g.due_date AS "dueDate",
                g.subtotal::numeric AS "subtotal", g.discount_amount::numeric AS "discountAmount",
                g.total_amount::numeric AS "totalAmount", g.paid_amount::numeric AS "paidAmount",
                g.outstanding_amount::numeric AS "outstandingAmount",
                g.payment_status AS "paymentStatus", g.grn_status AS "grnStatus",
                g.notes, g.received_at AS "receivedAt", g.cancelled_at AS "cancelledAt",
                g.created_by AS "createdBy", u.name AS "createdByName",
                g.created_at AS "createdAt", g.updated_at AS "updatedAt"
         FROM ${grns} g
         INNER JOIN ${suppliers} s ON g.supplier_id = s.id
         INNER JOIN ${branches} b ON g.branch_id = b.id
         LEFT JOIN ${users} u ON g.created_by = u.id
         WHERE g.id = $1::uuid
         LIMIT 1`,
        id,
      );

      if (grnRows.length === 0) {
        throw new NotFoundException('GRN not found');
      }

      const grn = grnRows[0];

      const itemRows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT gi.id, gi.product_id AS "productId", p.name AS "productName", p.code AS "productCode",
                gi.quantity::numeric AS "quantity", gi.unit_cost::numeric AS "unitCost", gi.line_total::numeric AS "lineTotal"
         FROM ${grnItems} gi
         INNER JOIN ${products} p ON gi.product_id = p.id
         WHERE gi.grn_id = $1::uuid
         ORDER BY gi.created_at ASC`,
        id,
      );

      const allocationRows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT spa.id, spa.allocated_amount::numeric AS "allocatedAmount", spa.created_at AS "createdAt",
                sp.id AS "paymentId", sp.payment_date AS "paymentDate", sp.amount::numeric AS "paymentTotalAmount",
                sp.payment_method AS "paymentMethod", sp.reference_number AS "referenceNumber",
                sp.bank_name AS "bankName", sp.cheque_number AS "chequeNumber", sp.cheque_date AS "chequeDate",
                sp.cheque_status AS "chequeStatus", sp.cleared_at AS "clearedAt"
         FROM ${allocations} spa
         INNER JOIN ${payments} sp ON spa.payment_id = sp.id
         WHERE spa.grn_id = $1::uuid
         ORDER BY sp.payment_date DESC, spa.created_at DESC`,
        id,
      );

      return {
        ...grn,
        subtotal: Number(grn.subtotal),
        discountAmount: Number(grn.discountAmount),
        totalAmount: Number(grn.totalAmount),
        paidAmount: Number(grn.paidAmount),
        outstandingAmount: Number(grn.outstandingAmount),
        items: itemRows.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
          lineTotal: Number(item.lineTotal),
        })),
        allocations: allocationRows.map((a) => ({
          ...a,
          allocatedAmount: Number(a.allocatedAmount),
          paymentTotalAmount: Number(a.paymentTotalAmount),
        })),
      };
    });
  }

  async createGrn(schemaName: string, dto: CreateGrnDto, userId: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required for GRN');
    }

    await this.ensureSupplierExists(schemaName, dto.supplierId);
    await this.ensureBranchExists(schemaName, dto.branchId);

    const grns = tenantTable(schemaName, 'grns');
    const grnItems = tenantTable(schemaName, 'grn_items');
    const payments = tenantTable(schemaName, 'supplier_payments');
    const allocations = tenantTable(schemaName, 'supplier_payment_allocations');

    const grnStatus = dto.status ?? 'DRAFT';
    const isReceiveNow = grnStatus === 'RECEIVED';

    // Calculate totals
    let subtotal = 0;
    const computedItems = dto.items.map((item) => {
      const qty = Number(item.quantity);
      const cost = Number(item.unitCost);
      const lineTotal = Math.round(qty * cost * 100) / 100;
      subtotal += lineTotal;
      return {
        productId: item.productId,
        quantity: qty,
        unitCost: cost,
        lineTotal,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;
    const discountAmount = Math.max(0, Number(dto.discountAmount || 0));
    const totalAmount = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    const grnDate = dto.grnDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const dueDate = dto.dueDate?.slice(0, 10) ?? null;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      // Validate all products exist
      for (const item of computedItems) {
        await this.ensureProductExistsInTx(tx, schemaName, item.productId);
      }

      // Generate GRN Number (e.g. GRN-000001)
      const grnNumber = await this.generateGrnNumber(tx, grns);

      // Handle Initial Payment details
      let paidAmount = 0;
      let outstandingAmount = totalAmount;
      let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';

      const paymentMethod = dto.paymentMethod ?? 'CREDIT';
      const isCredit = paymentMethod === 'CREDIT';

      // Insert GRN
      const grnRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${grns}
           (grn_number, supplier_id, branch_id, supplier_invoice_number, grn_date, due_date,
            notes, subtotal, discount_amount, total_amount, paid_amount, outstanding_amount,
            payment_status, grn_status, received_at, created_by)
         VALUES (
           $1, $2::uuid, $3::uuid, $4, $5::date, $6::date,
           $7, $8::numeric, $9::numeric, $10::numeric, $11::numeric, $12::numeric,
           $13::text::"${schemaName}".grn_payment_status,
           $14::text::"${schemaName}".grn_status,
           $15, $16::uuid
         )
         RETURNING id`,
        grnNumber,
        dto.supplierId,
        dto.branchId,
        dto.supplierInvoiceNumber?.trim() ?? null,
        grnDate,
        dueDate,
        dto.notes?.trim() ?? null,
        subtotal,
        discountAmount,
        totalAmount,
        paidAmount,
        outstandingAmount,
        paymentStatus,
        grnStatus,
        isReceiveNow ? new Date() : null,
        userId,
      );

      const grnId = grnRows[0].id;

      // Insert GRN Items
      for (const item of computedItems) {
        await tx.$queryRawUnsafe(
          `INSERT INTO ${grnItems} (grn_id, product_id, quantity, unit_cost, line_total)
           VALUES ($1::uuid, $2::uuid, $3::numeric, $4::numeric, $5::numeric)`,
          grnId,
          item.productId,
          item.quantity,
          item.unitCost,
          item.lineTotal,
        );
      }

      // If RECEIVED on creation, post stock and handle initial payment
      if (isReceiveNow) {
        for (const item of computedItems) {
          await this.applyStockChangeInTx(tx, schemaName, {
            branchId: dto.branchId,
            productId: item.productId,
            quantityChange: item.quantity,
            movementType: 'STOCK_IN',
            notes: `GRN: ${grnNumber}`,
            userId,
            referenceType: 'GRN',
            referenceId: grnId,
          });
        }

        // Process payment if not CREDIT and totalAmount > 0
        if (!isCredit && totalAmount > 0) {
          const rawPaid = dto.paidAmount !== undefined && dto.paidAmount !== null
            ? Number(dto.paidAmount)
            : totalAmount;
          const initialPaid = Math.min(Math.max(0, rawPaid), totalAmount);

          if (initialPaid > 0) {
            const isCheque = paymentMethod === 'CHEQUE';
            const chequeStatus = isCheque ? 'PENDING' : 'CLEARED';

            const paymentRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
              `INSERT INTO ${payments}
                 (supplier_id, payment_date, amount, payment_method, reference_number,
                  bank_name, cheque_number, cheque_date, cheque_status, cleared_at, notes, created_by)
               VALUES (
                 $1::uuid, $2::date, $3::numeric,
                 $4::text::"${schemaName}".supplier_payment_method,
                 $5, $6, $7, $8::date,
                 $9::text::"${schemaName}".supplier_cheque_status,
                 $10, $11, $12::uuid
               )
               RETURNING id`,
              dto.supplierId,
              grnDate,
              initialPaid,
              paymentMethod,
              dto.referenceNumber?.trim() ?? null,
              dto.bankName?.trim() ?? null,
              dto.chequeNumber?.trim() ?? null,
              dto.chequeDate?.slice(0, 10) ?? null,
              chequeStatus,
              isCheque ? null : new Date(),
              dto.notes ? `Initial payment on GRN ${grnNumber}` : 'Initial payment on GRN receipt',
              userId,
            );

            const paymentId = paymentRows[0].id;

            // Create allocation
            await tx.$queryRawUnsafe(
              `INSERT INTO ${allocations} (payment_id, grn_id, allocated_amount)
               VALUES ($1::uuid, $2::uuid, $3::numeric)`,
              paymentId,
              grnId,
              initialPaid,
            );

            // If CLEARED (Cash / Bank Transfer), update GRN paid & outstanding
            if (!isCheque) {
              paidAmount = initialPaid;
              outstandingAmount = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);
              paymentStatus = paidAmount >= totalAmount ? 'PAID' : (paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

              await tx.$queryRawUnsafe(
                `UPDATE ${grns}
                 SET paid_amount = $2::numeric, outstanding_amount = $3::numeric,
                     payment_status = $4::text::"${schemaName}".grn_payment_status, updated_at = NOW()
                 WHERE id = $1::uuid`,
                grnId,
              );
            }

            // Sync with expenses module
            await this.syncSupplierPaymentExpenseInTx(tx, schemaName, paymentId, userId);
          }
        }
      }

      await logAudit(tx, schemaName, {
        userId,
        action: isReceiveNow ? 'GRN_CREATE_AND_RECEIVE' : 'GRN_CREATE_DRAFT',
        entityType: 'grn',
        entityId: grnId,
        details: {
          grnNumber,
          totalAmount,
          grnStatus,
          paymentStatus,
        },
      });

      return {
        id: grnId,
        grnNumber,
        grnStatus,
        totalAmount,
        paidAmount,
        outstandingAmount,
        paymentStatus,
      };
    });
  }

  async updateGrn(schemaName: string, id: string, dto: UpdateGrnDto, userId: string) {
    const grns = tenantTable(schemaName, 'grns');
    const grnItems = tenantTable(schemaName, 'grn_items');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const existingRows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT id, grn_number AS "grnNumber", grn_status AS "grnStatus", total_amount AS "totalAmount",
                supplier_id AS "supplierId", branch_id AS "branchId"
         FROM ${grns} WHERE id = $1::uuid LIMIT 1`,
        id,
      );

      if (existingRows.length === 0) {
        throw new NotFoundException('GRN not found');
      }

      const existing = existingRows[0];
      if (existing.grnStatus !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT GRNs can be edited. This GRN is already ' + existing.grnStatus);
      }

      if (dto.supplierId) {
        await this.ensureSupplierExists(schemaName, dto.supplierId);
      }
      if (dto.branchId) {
        await this.ensureBranchExists(schemaName, dto.branchId);
      }

      // If items provided, replace items and recalculate
      if (dto.items && dto.items.length > 0) {
        let subtotal = 0;
        const computedItems = dto.items.map((item) => {
          const qty = Number(item.quantity);
          const cost = Number(item.unitCost);
          const lineTotal = Math.round(qty * cost * 100) / 100;
          subtotal += lineTotal;
          return {
            productId: item.productId,
            quantity: qty,
            unitCost: cost,
            lineTotal,
          };
        });

        for (const item of computedItems) {
          await this.ensureProductExistsInTx(tx, schemaName, item.productId);
        }

        subtotal = Math.round(subtotal * 100) / 100;
        const discountAmount = Math.max(0, Number(dto.discountAmount ?? 0));
        const totalAmount = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

        await tx.$queryRawUnsafe(`DELETE FROM ${grnItems} WHERE grn_id = $1::uuid`, id);

        for (const item of computedItems) {
          await tx.$queryRawUnsafe(
            `INSERT INTO ${grnItems} (grn_id, product_id, quantity, unit_cost, line_total)
             VALUES ($1::uuid, $2::uuid, $3::numeric, $4::numeric, $5::numeric)`,
            id,
            item.productId,
            item.quantity,
            item.unitCost,
            item.lineTotal,
          );
        }

        await tx.$queryRawUnsafe(
          `UPDATE ${grns}
           SET subtotal = $2::numeric, discount_amount = $3::numeric,
               total_amount = $4::numeric, outstanding_amount = $4::numeric,
               supplier_id = COALESCE($5::uuid, supplier_id),
               branch_id = COALESCE($6::uuid, branch_id),
               supplier_invoice_number = COALESCE($7, supplier_invoice_number),
               grn_date = COALESCE($8::date, grn_date),
               due_date = COALESCE($9::date, due_date),
               notes = COALESCE($10, notes),
               updated_at = NOW()
           WHERE id = $1::uuid`,
          id,
          subtotal,
          discountAmount,
          totalAmount,
          dto.supplierId ?? null,
          dto.branchId ?? null,
          dto.supplierInvoiceNumber?.trim() ?? null,
          dto.grnDate?.slice(0, 10) ?? null,
          dto.dueDate?.slice(0, 10) ?? null,
          dto.notes?.trim() ?? null,
        );
      } else {
        // Just header fields
        await tx.$queryRawUnsafe(
          `UPDATE ${grns}
           SET supplier_id = COALESCE($2::uuid, supplier_id),
               branch_id = COALESCE($3::uuid, branch_id),
               supplier_invoice_number = COALESCE($4, supplier_invoice_number),
               grn_date = COALESCE($5::date, grn_date),
               due_date = COALESCE($6::date, due_date),
               notes = COALESCE($7, notes),
               updated_at = NOW()
           WHERE id = $1::uuid`,
          id,
          dto.supplierId ?? null,
          dto.branchId ?? null,
          dto.supplierInvoiceNumber?.trim() ?? null,
          dto.grnDate?.slice(0, 10) ?? null,
          dto.dueDate?.slice(0, 10) ?? null,
          dto.notes?.trim() ?? null,
        );
      }

      await logAudit(tx, schemaName, {
        userId,
        action: 'GRN_UPDATE',
        entityType: 'grn',
        entityId: id,
        details: { grnNumber: existing.grnNumber },
      });

      return { id, success: true };
    });
  }

  async receiveGrn(schemaName: string, id: string, dto: ReceiveGrnDto, userId: string) {
    const grns = tenantTable(schemaName, 'grns');
    const grnItems = tenantTable(schemaName, 'grn_items');
    const payments = tenantTable(schemaName, 'supplier_payments');
    const allocations = tenantTable(schemaName, 'supplier_payment_allocations');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const grnRows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT g.id, g.grn_number AS "grnNumber", g.supplier_id AS "supplierId", g.branch_id AS "branchId",
                g.grn_status AS "grnStatus", g.total_amount::numeric AS "totalAmount",
                g.paid_amount::numeric AS "paidAmount", g.outstanding_amount::numeric AS "outstandingAmount",
                g.grn_date AS "grnDate"
         FROM ${grns} g WHERE g.id = $1::uuid LIMIT 1`,
        id,
      );

      if (grnRows.length === 0) {
        throw new NotFoundException('GRN not found');
      }

      const grn = grnRows[0];
      if (grn.grnStatus !== 'DRAFT') {
        throw new BadRequestException(`Cannot receive GRN: current status is ${grn.grnStatus}`);
      }

      const totalAmount = Number(grn.totalAmount);

      // 1. Fetch items
      const items = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT product_id AS "productId", quantity::numeric AS "quantity"
         FROM ${grnItems} WHERE grn_id = $1::uuid`,
        id,
      );

      if (items.length === 0) {
        throw new BadRequestException('GRN has no items to receive');
      }

      // 2. Increment stock exactly once and record stock movement
      for (const item of items) {
        await this.applyStockChangeInTx(tx, schemaName, {
          branchId: grn.branchId,
          productId: item.productId,
          quantityChange: Number(item.quantity),
          movementType: 'STOCK_IN',
          notes: `GRN: ${grn.grnNumber}`,
          userId,
          referenceType: 'GRN',
          referenceId: grn.id,
        });
      }

      // 3. Process optional payment on receive
      let paidAmount = 0;
      let outstandingAmount = totalAmount;
      let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';

      const paymentMethod = dto.paymentMethod ?? 'CREDIT';
      const isCredit = paymentMethod === 'CREDIT';

      if (!isCredit && totalAmount > 0) {
        const rawPaid = dto.paidAmount !== undefined && dto.paidAmount !== null
          ? Number(dto.paidAmount)
          : totalAmount;
        const initialPaid = Math.min(Math.max(0, rawPaid), totalAmount);

        if (initialPaid > 0) {
          const isCheque = paymentMethod === 'CHEQUE';
          const chequeStatus = isCheque ? 'PENDING' : 'CLEARED';

          const paymentRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
            `INSERT INTO ${payments}
               (supplier_id, payment_date, amount, payment_method, reference_number,
                bank_name, cheque_number, cheque_date, cheque_status, cleared_at, notes, created_by)
             VALUES (
               $1::uuid, $2::date, $3::numeric,
               $4::text::"${schemaName}".supplier_payment_method,
               $5, $6, $7, $8::date,
               $9::text::"${schemaName}".supplier_cheque_status,
               $10, $11, $12::uuid
             )
             RETURNING id`,
            grn.supplierId,
            grn.grnDate,
            initialPaid,
            paymentMethod,
            dto.referenceNumber?.trim() ?? null,
            dto.bankName?.trim() ?? null,
            dto.chequeNumber?.trim() ?? null,
            dto.chequeDate?.slice(0, 10) ?? null,
            chequeStatus,
            isCheque ? null : new Date(),
            dto.notes ? `Payment on GRN ${grn.grnNumber}: ${dto.notes}` : `Payment on receipt of GRN ${grn.grnNumber}`,
            userId,
          );

          const paymentId = paymentRows[0].id;

          await tx.$queryRawUnsafe(
            `INSERT INTO ${allocations} (payment_id, grn_id, allocated_amount)
             VALUES ($1::uuid, $2::uuid, $3::numeric)`,
            paymentId,
            grn.id,
            initialPaid,
          );

          if (!isCheque) {
            paidAmount = initialPaid;
            outstandingAmount = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);
            paymentStatus = paidAmount >= totalAmount ? 'PAID' : (paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID');
          }

          // Sync with expenses module
          await this.syncSupplierPaymentExpenseInTx(tx, schemaName, paymentId, userId);
        }
      }

      // 4. Update GRN status to RECEIVED
      await tx.$queryRawUnsafe(
        `UPDATE ${grns}
         SET grn_status = 'RECEIVED'::"${schemaName}".grn_status,
             received_at = NOW(),
             paid_amount = $2::numeric,
             outstanding_amount = $3::numeric,
             payment_status = $4::text::"${schemaName}".grn_payment_status,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        paidAmount,
        outstandingAmount,
        paymentStatus,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'GRN_RECEIVE',
        entityType: 'grn',
        entityId: id,
        details: {
          grnNumber: grn.grnNumber,
          totalAmount,
          paidAmount,
          outstandingAmount,
          paymentStatus,
        },
      });

      return {
        id,
        grnNumber: grn.grnNumber,
        grnStatus: 'RECEIVED',
        paidAmount,
        outstandingAmount,
        paymentStatus,
      };
    });
  }

  async cancelGrn(schemaName: string, id: string, dto: CancelGrnDto, userId: string) {
    const grns = tenantTable(schemaName, 'grns');
    const grnItems = tenantTable(schemaName, 'grn_items');
    const allocations = tenantTable(schemaName, 'supplier_payment_allocations');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const grnRows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT g.id, g.grn_number AS "grnNumber", g.branch_id AS "branchId",
                g.grn_status AS "grnStatus", g.paid_amount::numeric AS "paidAmount"
         FROM ${grns} g WHERE g.id = $1::uuid LIMIT 1`,
        id,
      );

      if (grnRows.length === 0) {
        throw new NotFoundException('GRN not found');
      }

      const grn = grnRows[0];
      if (grn.grnStatus === 'CANCELLED') {
        throw new BadRequestException('GRN is already cancelled');
      }

      if (grn.grnStatus === 'RECEIVED') {
        // Check if payment allocations exist
        const allocCount = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${allocations} WHERE grn_id = $1::uuid`,
          id,
        );

        if (Number(allocCount[0]?.count ?? 0) > 0 || Number(grn.paidAmount) > 0) {
          throw new BadRequestException(
            'Cannot cancel a RECEIVED GRN that has linked payment allocations. Remove or adjust payments before cancelling.',
          );
        }

        // Reversal of stock: check sufficient stock
        const items = await tx.$queryRawUnsafe<Array<any>>(
          `SELECT product_id AS "productId", quantity::numeric AS "quantity"
           FROM ${grnItems} WHERE grn_id = $1::uuid`,
          id,
        );

        for (const item of items) {
          await this.applyStockChangeInTx(tx, schemaName, {
            branchId: grn.branchId,
            productId: item.productId,
            quantityChange: -Number(item.quantity),
            movementType: 'OUT',
            notes: `GRN Cancellation: ${grn.grnNumber}`,
            userId,
            referenceType: 'GRN_CANCEL',
            referenceId: grn.id,
          });
        }
      }

      // Update GRN status to CANCELLED
      await tx.$queryRawUnsafe(
        `UPDATE ${grns}
         SET grn_status = 'CANCELLED'::"${schemaName}".grn_status,
             cancelled_at = NOW(),
             notes = CASE WHEN $2::text IS NOT NULL THEN COALESCE(notes, '') || E'\n[Cancelled]: ' || $2::text ELSE notes END,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.reason?.trim() ?? null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'GRN_CANCEL',
        entityType: 'grn',
        entityId: id,
        details: { grnNumber: grn.grnNumber, reason: dto.reason },
      });

      return { id, grnNumber: grn.grnNumber, status: 'CANCELLED' };
    });
  }

  // =========================================================================
  // 3. SUPPLIER PAYMENTS & ALLOCATIONS
  // =========================================================================

  async listSupplierPayments(schemaName: string, query?: ListSupplierPaymentsQueryDto) {
    const payments = tenantTable(schemaName, 'supplier_payments');
    const suppliers = tenantTable(schemaName, 'suppliers');
    const users = tenantTable(schemaName, 'users');
    const allocations = tenantTable(schemaName, 'supplier_payment_allocations');
    const grns = tenantTable(schemaName, 'grns');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (query?.supplierId) {
      conditions.push(`sp.supplier_id = $${idx++}::uuid`);
      params.push(query.supplierId);
    }

    if (query?.paymentMethod && query.paymentMethod !== 'all') {
      conditions.push(`sp.payment_method = $${idx++}::text::"${schemaName}".supplier_payment_method`);
      params.push(query.paymentMethod);
    }

    if (query?.chequeStatus && query.chequeStatus !== 'all') {
      conditions.push(`sp.cheque_status = $${idx++}::text::"${schemaName}".supplier_cheque_status`);
      params.push(query.chequeStatus);
    }

    if (query?.startDate) {
      conditions.push(`sp.payment_date >= $${idx++}::date`);
      params.push(query.startDate.slice(0, 10));
    }

    if (query?.endDate) {
      conditions.push(`sp.payment_date <= $${idx++}::date`);
      params.push(query.endDate.slice(0, 10));
    }

    if (query?.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(s.name) LIKE $${idx} OR LOWER(COALESCE(sp.reference_number, '')) LIKE $${idx} OR LOWER(COALESCE(sp.cheque_number, '')) LIKE $${idx} OR LOWER(COALESCE(sp.bank_name, '')) LIKE $${idx})`,
      );
      params.push(term);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countResult = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count
         FROM ${payments} sp
         INNER JOIN ${suppliers} s ON sp.supplier_id = s.id
         ${whereClause}`,
        ...params,
      );
      const total = Number(countResult[0]?.count ?? 0);
      const { page, limit, offset } = resolvePagination(query?.page, query?.limit);

      const rows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT sp.id, sp.supplier_id AS "supplierId", s.name AS "supplierName",
                sp.payment_date AS "paymentDate", sp.amount::numeric AS "amount",
                sp.payment_method AS "paymentMethod", sp.reference_number AS "referenceNumber",
                sp.bank_name AS "bankName", sp.cheque_number AS "chequeNumber",
                sp.cheque_date AS "chequeDate", sp.cheque_status AS "chequeStatus",
                sp.cleared_at AS "clearedAt", sp.notes,
                sp.created_by AS "createdBy", u.name AS "createdByName",
                sp.created_at AS "createdAt", sp.updated_at AS "updatedAt",
                COALESCE(alloc.allocated_total, 0)::numeric AS "allocatedTotal",
                COALESCE(alloc.grn_numbers, ARRAY[]::varchar[]) AS "allocatedGrnNumbers"
         FROM ${payments} sp
         INNER JOIN ${suppliers} s ON sp.supplier_id = s.id
         LEFT JOIN ${users} u ON sp.created_by = u.id
         LEFT JOIN (
           SELECT spa.payment_id,
                  SUM(spa.allocated_amount) AS allocated_total,
                  ARRAY_AGG(g.grn_number ORDER BY g.grn_date ASC) AS grn_numbers
           FROM ${allocations} spa
           INNER JOIN ${grns} g ON spa.grn_id = g.id
           GROUP BY spa.payment_id
         ) alloc ON alloc.payment_id = sp.id
         ${whereClause}
         ORDER BY sp.payment_date DESC, sp.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        ...params,
        limit,
        offset,
      );

      const data = rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
        allocatedTotal: Number(r.allocatedTotal),
        allocatedGrnNumbers: r.allocatedGrnNumbers ?? [],
      }));

      return buildPaginatedResponse(data, total, page, limit);
    });
  }

  async getSupplierPayment(schemaName: string, id: string) {
    const payments = tenantTable(schemaName, 'supplier_payments');
    const suppliers = tenantTable(schemaName, 'suppliers');
    const users = tenantTable(schemaName, 'users');
    const allocations = tenantTable(schemaName, 'supplier_payment_allocations');
    const grns = tenantTable(schemaName, 'grns');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const paymentRows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT sp.id, sp.supplier_id AS "supplierId", s.name AS "supplierName",
                sp.payment_date AS "paymentDate", sp.amount::numeric AS "amount",
                sp.payment_method AS "paymentMethod", sp.reference_number AS "referenceNumber",
                sp.bank_name AS "bankName", sp.cheque_number AS "chequeNumber",
                sp.cheque_date AS "chequeDate", sp.cheque_status AS "chequeStatus",
                sp.cleared_at AS "clearedAt", sp.notes,
                sp.created_by AS "createdBy", u.name AS "createdByName",
                sp.created_at AS "createdAt", sp.updated_at AS "updatedAt"
         FROM ${payments} sp
         INNER JOIN ${suppliers} s ON sp.supplier_id = s.id
         LEFT JOIN ${users} u ON sp.created_by = u.id
         WHERE sp.id = $1::uuid
         LIMIT 1`,
        id,
      );

      if (paymentRows.length === 0) {
        throw new NotFoundException('Supplier payment not found');
      }

      const payment = paymentRows[0];

      const allocationRows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT spa.id, spa.allocated_amount::numeric AS "allocatedAmount",
                g.id AS "grnId", g.grn_number AS "grnNumber", g.supplier_invoice_number AS "supplierInvoiceNumber",
                g.grn_date AS "grnDate", g.total_amount::numeric AS "grnTotalAmount",
                g.paid_amount::numeric AS "grnPaidAmount", g.outstanding_amount::numeric AS "grnOutstandingAmount",
                g.payment_status AS "grnPaymentStatus"
         FROM ${allocations} spa
         INNER JOIN ${grns} g ON spa.grn_id = g.id
         WHERE spa.payment_id = $1::uuid
         ORDER BY g.grn_date ASC`,
        id,
      );

      return {
        ...payment,
        amount: Number(payment.amount),
        allocations: allocationRows.map((a) => ({
          ...a,
          allocatedAmount: Number(a.allocatedAmount),
          grnTotalAmount: Number(a.grnTotalAmount),
          grnPaidAmount: Number(a.grnPaidAmount),
          grnOutstandingAmount: Number(a.grnOutstandingAmount),
        })),
      };
    });
  }

  async createSupplierPayment(schemaName: string, dto: CreateSupplierPaymentDto, userId: string) {
    if (Number(dto.amount) <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    await this.ensureSupplierExists(schemaName, dto.supplierId);

    const payments = tenantTable(schemaName, 'supplier_payments');
    const allocations = tenantTable(schemaName, 'supplier_payment_allocations');
    const grns = tenantTable(schemaName, 'grns');

    const paymentAmount = Math.round(Number(dto.amount) * 100) / 100;
    const paymentDate = dto.paymentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const isCheque = dto.paymentMethod === 'CHEQUE';
    const chequeStatus = isCheque ? 'PENDING' : 'CLEARED';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      // 1. Determine allocations
      let targetAllocations: Array<{ grnId: string; allocatedAmount: number }> = [];

      if (dto.allocations && dto.allocations.length > 0) {
        let totalAllocated = 0;
        for (const alloc of dto.allocations) {
          const allocAmt = Math.round(Number(alloc.allocatedAmount) * 100) / 100;
          if (allocAmt <= 0) continue;

          // Fetch GRN to validate
          const grnRows = await tx.$queryRawUnsafe<Array<any>>(
            `SELECT id, supplier_id AS "supplierId", grn_status AS "grnStatus",
                    outstanding_amount::numeric AS "outstandingAmount", grn_number AS "grnNumber"
             FROM ${grns} WHERE id = $1::uuid LIMIT 1`,
            alloc.grnId,
          );

          if (grnRows.length === 0) {
            throw new NotFoundException(`GRN with ID ${alloc.grnId} not found`);
          }

          const grn = grnRows[0];
          if (grn.supplierId !== dto.supplierId) {
            throw new BadRequestException(`GRN ${grn.grnNumber} does not belong to the selected supplier`);
          }
          if (grn.grnStatus !== 'RECEIVED') {
            throw new BadRequestException(`GRN ${grn.grnNumber} is in status ${grn.grnStatus}. Only RECEIVED GRNs can be allocated.`);
          }

          const outstanding = Number(grn.outstandingAmount);
          if (allocAmt > outstanding) {
            throw new BadRequestException(
              `Allocated amount (${allocAmt}) exceeds outstanding balance (${outstanding}) for GRN ${grn.grnNumber}`,
            );
          }

          totalAllocated += allocAmt;
          targetAllocations.push({ grnId: alloc.grnId, allocatedAmount: allocAmt });
        }

        totalAllocated = Math.round(totalAllocated * 100) / 100;
        if (totalAllocated > paymentAmount) {
          throw new BadRequestException(
            `Total allocated amount (${totalAllocated}) exceeds payment amount (${paymentAmount})`,
          );
        }
      } else {
        // Auto-allocate FIFO to oldest open RECEIVED GRNs
        const openGrns = await tx.$queryRawUnsafe<Array<any>>(
          `SELECT id, outstanding_amount::numeric AS "outstandingAmount"
           FROM ${grns}
           WHERE supplier_id = $1::uuid AND grn_status = 'RECEIVED' AND outstanding_amount > 0
           ORDER BY grn_date ASC, created_at ASC`,
          dto.supplierId,
        );

        let remainingToAllocate = paymentAmount;
        for (const grn of openGrns) {
          if (remainingToAllocate <= 0) break;
          const outstanding = Number(grn.outstandingAmount);
          const allocAmt = Math.min(remainingToAllocate, outstanding);
          targetAllocations.push({ grnId: grn.id, allocatedAmount: allocAmt });
          remainingToAllocate = Math.round((remainingToAllocate - allocAmt) * 100) / 100;
        }
      }

      // 2. Create supplier payment record
      const paymentRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${payments}
           (supplier_id, payment_date, amount, payment_method, reference_number,
            bank_name, cheque_number, cheque_date, cheque_status, cleared_at, notes, created_by)
         VALUES (
           $1::uuid, $2::date, $3::numeric,
           $4::text::"${schemaName}".supplier_payment_method,
           $5, $6, $7, $8::date,
           $9::text::"${schemaName}".supplier_cheque_status,
           $10, $11, $12::uuid
         )
         RETURNING id`,
        dto.supplierId,
        paymentDate,
        paymentAmount,
        dto.paymentMethod,
        dto.referenceNumber?.trim() ?? null,
        dto.bankName?.trim() ?? null,
        dto.chequeNumber?.trim() ?? null,
        dto.chequeDate?.slice(0, 10) ?? null,
        chequeStatus,
        isCheque ? null : new Date(),
        dto.notes?.trim() ?? null,
        userId,
      );

      const paymentId = paymentRows[0].id;

      // 3. Insert allocations & update GRNs if payment is CLEARED
      for (const alloc of targetAllocations) {
        await tx.$queryRawUnsafe(
          `INSERT INTO ${allocations} (payment_id, grn_id, allocated_amount)
           VALUES ($1::uuid, $2::uuid, $3::numeric)`,
          paymentId,
          alloc.grnId,
          alloc.allocatedAmount,
        );

        if (!isCheque) {
          // Cleared immediately: reduce GRN outstanding
          await this.recalculateGrnPaymentStatus(tx, schemaName, alloc.grnId);
        }
      }

      // Sync with expenses module
      await this.syncSupplierPaymentExpenseInTx(tx, schemaName, paymentId, userId);

      await logAudit(tx, schemaName, {
        userId,
        action: 'SUPPLIER_PAYMENT_CREATE',
        entityType: 'supplier_payment',
        entityId: paymentId,
        details: {
          amount: paymentAmount,
          method: dto.paymentMethod,
          chequeStatus,
          allocationsCount: targetAllocations.length,
        },
      });

      return {
        id: paymentId,
        amount: paymentAmount,
        paymentMethod: dto.paymentMethod,
        chequeStatus,
        allocatedCount: targetAllocations.length,
      };
    });
  }

  async updateChequeStatus(
    schemaName: string,
    paymentId: string,
    dto: UpdateChequeStatusDto,
    userId: string,
  ) {
    const payments = tenantTable(schemaName, 'supplier_payments');
    const allocations = tenantTable(schemaName, 'supplier_payment_allocations');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const paymentRows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT id, payment_method AS "paymentMethod", cheque_status AS "chequeStatus", amount::numeric AS "amount"
         FROM ${payments} WHERE id = $1::uuid LIMIT 1`,
        paymentId,
      );

      if (paymentRows.length === 0) {
        throw new NotFoundException('Supplier payment not found');
      }

      const payment = paymentRows[0];
      if (payment.paymentMethod !== 'CHEQUE') {
        throw new BadRequestException('Status can only be updated for CHEQUE payments');
      }

      const currentStatus = payment.chequeStatus;
      const nextStatus = dto.status;

      if (currentStatus === nextStatus) {
        return { id: paymentId, status: nextStatus, unchanged: true };
      }

      // Fetch linked allocations
      const allocRows = await tx.$queryRawUnsafe<Array<{ grn_id: string }>>(
        `SELECT grn_id FROM ${allocations} WHERE payment_id = $1::uuid`,
        paymentId,
      );

      const clearedAt = nextStatus === 'CLEARED' ? (dto.clearedAt ? new Date(dto.clearedAt) : new Date()) : null;

      // Update payment record
      await tx.$queryRawUnsafe(
        `UPDATE ${payments}
         SET cheque_status = $2::text::"${schemaName}".supplier_cheque_status,
             cleared_at = $3,
             notes = CASE WHEN $4::text IS NOT NULL THEN COALESCE(notes, '') || E'\n' || $4::text ELSE notes END,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        paymentId,
        nextStatus,
        clearedAt,
        dto.notes?.trim() ?? null,
      );

      // Recalculate each affected GRN's confirmed paid amount and outstanding balance
      for (const alloc of allocRows) {
        await this.recalculateGrnPaymentStatus(tx, schemaName, alloc.grn_id);
      }

      // Sync with expenses module
      await this.syncSupplierPaymentExpenseInTx(tx, schemaName, paymentId, userId);

      await logAudit(tx, schemaName, {
        userId,
        action: 'SUPPLIER_CHEQUE_STATUS_UPDATE',
        entityType: 'supplier_payment',
        entityId: paymentId,
        details: { fromStatus: currentStatus, toStatus: nextStatus },
      });

      return { id: paymentId, status: nextStatus, clearedAt };
    });
  }

  // =========================================================================
  // 4. SUPPLIER OUTSTANDING & REPORT SUMMARY
  // =========================================================================

  async listSupplierOutstanding(schemaName: string, query?: ListSupplierOutstandingQueryDto) {
    const grns = tenantTable(schemaName, 'grns');
    const suppliers = tenantTable(schemaName, 'suppliers');
    const branches = tenantTable(schemaName, 'branches');

    const conditions: string[] = ["g.grn_status = 'RECEIVED'"];
    const params: unknown[] = [];
    let idx = 1;

    if (query?.supplierId) {
      conditions.push(`g.supplier_id = $${idx++}::uuid`);
      params.push(query.supplierId);
    }

    if (query?.paymentStatus === 'OPEN') {
      conditions.push(`g.outstanding_amount > 0`);
    } else if (query?.paymentStatus && query.paymentStatus !== 'all') {
      conditions.push(`g.payment_status = $${idx++}::text::"${schemaName}".grn_payment_status`);
      params.push(query.paymentStatus);
    } else {
      // Default open: include outstanding > 0
      conditions.push(`g.outstanding_amount > 0`);
    }

    if (query?.startDate) {
      conditions.push(`g.grn_date >= $${idx++}::date`);
      params.push(query.startDate.slice(0, 10));
    }

    if (query?.endDate) {
      conditions.push(`g.grn_date <= $${idx++}::date`);
      params.push(query.endDate.slice(0, 10));
    }

    if (query?.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(g.grn_number) LIKE $${idx} OR LOWER(COALESCE(g.supplier_invoice_number, '')) LIKE $${idx} OR LOWER(s.name) LIKE $${idx})`,
      );
      params.push(term);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countResult = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count
         FROM ${grns} g
         INNER JOIN ${suppliers} s ON g.supplier_id = s.id
         ${whereClause}`,
        ...params,
      );
      const total = Number(countResult[0]?.count ?? 0);
      const { page, limit, offset } = resolvePagination(query?.page, query?.limit);

      const rows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT g.id, g.grn_number AS "grnNumber", g.supplier_id AS "supplierId", s.name AS "supplierName",
                s.phone AS "supplierPhone", s.email AS "supplierEmail",
                g.branch_id AS "branchId", b.name AS "branchName",
                g.supplier_invoice_number AS "supplierInvoiceNumber",
                g.grn_date AS "grnDate", g.due_date AS "dueDate",
                g.total_amount::numeric AS "totalAmount", g.paid_amount::numeric AS "paidAmount",
                g.outstanding_amount::numeric AS "outstandingAmount",
                g.payment_status AS "paymentStatus",
                CASE WHEN g.due_date IS NOT NULL AND g.due_date < CURRENT_DATE
                     THEN (CURRENT_DATE - g.due_date)::int
                     ELSE 0
                END AS "daysOverdue"
         FROM ${grns} g
         INNER JOIN ${suppliers} s ON g.supplier_id = s.id
         INNER JOIN ${branches} b ON g.branch_id = b.id
         ${whereClause}
         ORDER BY g.due_date ASC NULLS LAST, g.grn_date ASC
         LIMIT $${idx++} OFFSET $${idx++}`,
        ...params,
        limit,
        offset,
      );

      const data = rows.map((r) => ({
        ...r,
        totalAmount: Number(r.totalAmount),
        paidAmount: Number(r.paidAmount),
        outstandingAmount: Number(r.outstandingAmount),
        daysOverdue: Number(r.daysOverdue),
      }));

      return buildPaginatedResponse(data, total, page, limit);
    });
  }

  async getOutstandingSummary(schemaName: string) {
    const grns = tenantTable(schemaName, 'grns');
    const suppliers = tenantTable(schemaName, 'suppliers');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<Array<any>>(
        `SELECT
           COALESCE(SUM(outstanding_amount), 0)::numeric AS "totalOutstanding",
           COALESCE(SUM(CASE WHEN payment_status = 'UNPAID' THEN outstanding_amount ELSE 0 END), 0)::numeric AS "totalUnpaid",
           COALESCE(SUM(CASE WHEN payment_status = 'PARTIALLY_PAID' THEN outstanding_amount ELSE 0 END), 0)::numeric AS "totalPartiallyPaid",
           COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0)::numeric AS "totalFullyPaid",
           COUNT(DISTINCT CASE WHEN outstanding_amount > 0 THEN supplier_id END)::int AS "suppliersWithOutstandingCount",
           COUNT(CASE WHEN outstanding_amount > 0 THEN 1 END)::int AS "openGrnsCount"
         FROM ${grns}
         WHERE grn_status = 'RECEIVED'`,
      );

      const r = rows[0] ?? {};
      return {
        totalOutstanding: Number(r.totalOutstanding ?? 0),
        totalUnpaid: Number(r.totalUnpaid ?? 0),
        totalPartiallyPaid: Number(r.totalPartiallyPaid ?? 0),
        totalFullyPaid: Number(r.totalFullyPaid ?? 0),
        suppliersWithOutstandingCount: Number(r.suppliersWithOutstandingCount ?? 0),
        openGrnsCount: Number(r.openGrnsCount ?? 0),
      };
    });
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  private async generateGrnNumber(
    tx: { $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T> },
    grnsTable: string,
  ): Promise<string> {
    const rows = await tx.$queryRawUnsafe<Array<{ maxNum: string | null }>>(
      `SELECT MAX(
        CASE
          WHEN grn_number ~ '^[A-Za-z]+-[0-9]+$'
            THEN SUBSTRING(grn_number FROM '[0-9]+$')::bigint
          WHEN grn_number ~ '[0-9]+$'
            THEN SUBSTRING(grn_number FROM '[0-9]+$')::bigint
          ELSE NULL
        END
      )::text AS "maxNum" FROM ${grnsTable}`,
    );
    const next = (Number(rows[0]?.maxNum) || 0) + 1;
    return `GRN-${String(next).padStart(6, '0')}`;
  }

  /**
   * Recalculates confirmed paid amount and outstanding balance for a GRN
   * based on all active/cleared payment allocations.
   */
  private async recalculateGrnPaymentStatus(
    tx: { $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T> },
    schemaName: string,
    grnId: string,
  ) {
    const grns = tenantTable(schemaName, 'grns');
    const allocations = tenantTable(schemaName, 'supplier_payment_allocations');
    const payments = tenantTable(schemaName, 'supplier_payments');

    const sumRows = await tx.$queryRawUnsafe<Array<{ confirmedPaid: string }>>(
      `SELECT COALESCE(SUM(spa.allocated_amount), 0)::text AS "confirmedPaid"
       FROM ${allocations} spa
       INNER JOIN ${payments} sp ON spa.payment_id = sp.id
       WHERE spa.grn_id = $1::uuid
         AND (sp.payment_method IN ('CASH', 'BANK_TRANSFER') OR sp.cheque_status = 'CLEARED')`,
      grnId,
    );

    const confirmedPaid = Number(sumRows[0]?.confirmedPaid ?? 0);

    const grnRows = await tx.$queryRawUnsafe<Array<{ total_amount: string }>>(
      `SELECT total_amount::text FROM ${grns} WHERE id = $1::uuid LIMIT 1`,
      grnId,
    );

    if (grnRows.length === 0) return;

    const totalAmount = Number(grnRows[0].total_amount);
    const paidAmount = Math.min(confirmedPaid, totalAmount);
    const outstandingAmount = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);

    let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';
    if (paidAmount >= totalAmount && totalAmount > 0) {
      paymentStatus = 'PAID';
    } else if (paidAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    await tx.$queryRawUnsafe(
      `UPDATE ${grns}
       SET paid_amount = $2::numeric, outstanding_amount = $3::numeric,
           payment_status = $4::text::"${schemaName}".grn_payment_status, updated_at = NOW()
       WHERE id = $1::uuid`,
      grnId,
      paidAmount,
      outstandingAmount,
      paymentStatus,
    );
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

    const legacyMap: Record<string, string> = {
      STOCK_IN: 'IN',
      SALE: 'OUT',
      DAMAGE: 'OUT',
      TRANSFER: 'ADJUSTMENT',
    };
    const dbMovementType = legacyMap[data.movementType] ?? data.movementType;

    await tx.$queryRawUnsafe(
      `INSERT INTO ${movements}
         (branch_id, product_id, type, quantity, notes, reference_type, reference_id, created_by)
       VALUES ($1::uuid, $2::uuid, $3::text::"${schemaName}".stock_movement_type, $4::numeric, $5, $6, $7::uuid, $8::uuid)`,
      data.branchId,
      data.productId,
      dbMovementType,
      Math.abs(data.quantityChange),
      data.notes ?? null,
      data.referenceType ?? null,
      data.referenceId ?? null,
      data.userId,
    );
  }

  private async ensureSupplierExists(schemaName: string, supplierId: string) {
    const suppliers = tenantTable(schemaName, 'suppliers');
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${suppliers} WHERE id = $1::uuid LIMIT 1`,
        supplierId,
      );
      if (rows.length === 0) {
        throw new NotFoundException('Supplier not found');
      }
    });
  }

  private async ensureBranchExists(schemaName: string, branchId: string) {
    const branches = tenantTable(schemaName, 'branches');
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${branches} WHERE id = $1::uuid LIMIT 1`,
        branchId,
      );
      if (rows.length === 0) {
        throw new NotFoundException('Branch not found');
      }
    });
  }

  private async ensureProductExistsInTx(
    tx: { $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T> },
    schemaName: string,
    productId: string,
  ) {
    const products = tenantTable(schemaName, 'products');
    const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM ${products} WHERE id = $1::uuid LIMIT 1`,
      productId,
    );
    if (rows.length === 0) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
  }

  /**
   * Synchronizes a supplier payment record with the expenses table within a transaction.
   * - CASH / BANK_TRANSFER / CHEQUE CLEARED => Creates or sets ACTIVE expense
   * - CHEQUE BOUNCED => Sets linked expense to VOID
   * - CHEQUE PENDING => Does not create an active expense (sets VOID if previously existed)
   */
  async syncSupplierPaymentExpenseInTx(
    tx: { $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T> },
    schemaName: string,
    paymentId: string,
    userId: string,
  ): Promise<void> {
    const payments = tenantTable(schemaName, 'supplier_payments');
    const allocations = tenantTable(schemaName, 'supplier_payment_allocations');
    const grns = tenantTable(schemaName, 'grns');
    const suppliers = tenantTable(schemaName, 'suppliers');
    const expenses = tenantTable(schemaName, 'expenses');
    const categories = tenantTable(schemaName, 'expense_categories');
    const branches = tenantTable(schemaName, 'branches');

    // 1. Fetch payment details
    const paymentRows = await tx.$queryRawUnsafe<Array<any>>(
      `SELECT sp.id, sp.supplier_id AS "supplierId", sp.payment_date AS "paymentDate",
              sp.amount::numeric AS "amount", sp.payment_method AS "paymentMethod",
              sp.reference_number AS "referenceNumber", sp.cheque_number AS "chequeNumber",
              sp.cheque_status AS "chequeStatus", sp.notes, sp.created_by AS "createdBy",
              s.name AS "supplierName"
       FROM ${payments} sp
       INNER JOIN ${suppliers} s ON sp.supplier_id = s.id
       WHERE sp.id = $1::uuid
       LIMIT 1`,
      paymentId,
    );

    if (paymentRows.length === 0) return;
    const payment = paymentRows[0];
    const paymentAmount = Number(payment.amount);
    const paymentMethod = String(payment.paymentMethod);
    const chequeStatus = String(payment.chequeStatus);
    const supplierName = payment.supplierName ?? 'Supplier';

    // 2. Determine target expense status
    const isConfirmed =
      paymentMethod === 'CASH' ||
      paymentMethod === 'BANK_TRANSFER' ||
      (paymentMethod === 'CHEQUE' && chequeStatus === 'CLEARED');
    const isBounced = paymentMethod === 'CHEQUE' && chequeStatus === 'BOUNCED';
    const isPending = paymentMethod === 'CHEQUE' && chequeStatus === 'PENDING';

    // 3. Fetch existing linked expense
    const existingExpense = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
      `SELECT id, status::text AS status FROM ${expenses} WHERE supplier_payment_id = $1::uuid LIMIT 1`,
      paymentId,
    );

    if (existingExpense.length > 0) {
      const expId = existingExpense[0].id;
      if (isConfirmed) {
        // Reactivate / update existing expense
        await tx.$queryRawUnsafe(
          `UPDATE ${expenses}
           SET amount = $2::numeric,
               expense_date = $3::date,
               payment_method = $4,
               status = 'ACTIVE'::"${schemaName}".expense_status,
               notes = $5,
               updated_at = NOW()
           WHERE id = $1::uuid`,
          expId,
          paymentAmount,
          payment.paymentDate,
          paymentMethod,
          this.buildSupplierPaymentExpenseNotes(supplierName, payment.referenceNumber, payment.chequeNumber, payment.notes),
        );
      } else if (isBounced || isPending) {
        // Void the expense
        await tx.$queryRawUnsafe(
          `UPDATE ${expenses}
           SET status = 'VOID'::"${schemaName}".expense_status,
               updated_at = NOW()
           WHERE id = $1::uuid`,
          expId,
        );
      }
      return;
    }

    // If no existing expense and not confirmed (e.g. pending cheque or bounced cheque from the start), do nothing
    if (!isConfirmed) {
      return;
    }

    // 4. Ensure SUPPLIER_PAYMENT category exists
    const categoryRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM ${categories} WHERE code = 'SUPPLIER_PAYMENT' LIMIT 1`,
    );
    let categoryId: string;
    if (categoryRows.length > 0) {
      categoryId = categoryRows[0].id;
    } else {
      const insertedCat = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${categories} (code, name, description)
         VALUES ('SUPPLIER_PAYMENT', 'Supplier Payments', 'Payments made to suppliers for stock purchases')
         RETURNING id`,
      );
      categoryId = insertedCat[0].id;
    }

    // 5. Determine branchId (from allocated GRN or first branch)
    const branchRows = await tx.$queryRawUnsafe<Array<{ branch_id: string }>>(
      `SELECT g.branch_id
       FROM ${allocations} spa
       INNER JOIN ${grns} g ON spa.grn_id = g.id
       WHERE spa.payment_id = $1::uuid
       LIMIT 1`,
      paymentId,
    );
    let branchId: string;
    if (branchRows.length > 0 && branchRows[0].branch_id) {
      branchId = branchRows[0].branch_id;
    } else {
      const defaultBranch = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${branches} ORDER BY created_at ASC LIMIT 1`,
      );
      if (defaultBranch.length === 0) {
        throw new BadRequestException('Cannot create supplier payment expense: no branch exists for tenant');
      }
      branchId = defaultBranch[0].id;
    }

    // 6. Generate sequential expense code
    const expCodeRows = await tx.$queryRawUnsafe<Array<{ maxNum: string | null }>>(
      `SELECT MAX(
        CASE
          WHEN code ~ '^[A-Za-z]+-[0-9]+$'
            THEN SUBSTRING(code FROM '[0-9]+$')::bigint
          WHEN code ~ '[0-9]+$'
            THEN SUBSTRING(code FROM '[0-9]+$')::bigint
          ELSE NULL
        END
      )::text AS "maxNum" FROM ${expenses}`,
    );
    const nextExpNum = (Number(expCodeRows[0]?.maxNum) || 0) + 1;
    const expCode = `EXP-${String(nextExpNum).padStart(6, '0')}`;

    const expTitle = `Supplier Payment - ${supplierName}`;
    const expNotes = this.buildSupplierPaymentExpenseNotes(
      supplierName,
      payment.referenceNumber,
      payment.chequeNumber,
      payment.notes,
    );

    // 7. Insert active expense record
    await tx.$queryRawUnsafe(
      `INSERT INTO ${expenses}
         (code, branch_id, category_id, title, amount, expense_date, payment_method, notes,
          status, created_by, supplier_payment_id, is_system_generated)
       VALUES (
         $1, $2::uuid, $3::uuid, $4, $5::numeric, $6::date, $7, $8,
         'ACTIVE'::"${schemaName}".expense_status, $9::uuid, $10::uuid, true
       )`,
      expCode,
      branchId,
      categoryId,
      expTitle,
      paymentAmount,
      payment.paymentDate,
      paymentMethod,
      expNotes,
      userId || payment.createdBy,
      paymentId,
    );
  }

  private buildSupplierPaymentExpenseNotes(
    supplierName: string,
    referenceNumber?: string | null,
    chequeNumber?: string | null,
    notes?: string | null,
  ): string {
    const parts = [
      `Supplier: ${supplierName}`,
      referenceNumber ? `Payment Reference: ${referenceNumber}` : null,
      chequeNumber ? `Cheque Number: ${chequeNumber}` : null,
      notes ? `Notes: ${notes}` : null,
    ].filter(Boolean);
    return parts.join('\n');
  }
}

