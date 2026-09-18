import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { EmployeesService } from '../employees/employees.service';
import { InventoryService } from '../inventory/inventory.service';
import { logAudit } from '../utils/audit.util';
import { normalizeSaleAssignments } from '../sales/sale-assignment.util';
import { CreateSaleDto, SaleEmployeeDto } from './dto/pos.dto';

@Injectable()
export class PosService {
  constructor(
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly inventoryService: InventoryService,
    private readonly employeesService: EmployeesService,
  ) {}

  /** Tenant enums live in each schema; unqualified casts resolve to public and fail. */
  private tenantEnumCast(schemaName: string, enumName: string, paramIndex: number): string {
    return `$${paramIndex}::text::"${schemaName}".${enumName}`;
  }

  getPerformers(schemaName: string, user: AuthenticatedUser, branchId?: string) {
    return this.employeesService.listPosPerformers(schemaName, user, branchId);
  }

  async createSale(schemaName: string, dto: CreateSaleDto, user: AuthenticatedUser) {
    const cashierUserId = user.id;

    if (dto.services.length === 0 && dto.products.length === 0) {
      throw new BadRequestException('Sale must include at least one service or product');
    }

    const paymentTotal = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    if (paymentTotal <= 0) {
      throw new BadRequestException('At least one payment is required');
    }

    const sales = tenantTable(schemaName, 'sales');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const saleEmployees = tenantTable(schemaName, 'sale_employees');
    const payments = tenantTable(schemaName, 'payments');
    const services = tenantTable(schemaName, 'services');
    const products = tenantTable(schemaName, 'products');
    const employees = tenantTable(schemaName, 'employees');
    const branches = tenantTable(schemaName, 'branches');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const branch = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${branches} WHERE id = $1::uuid AND status = 'ACTIVE' LIMIT 1`,
        dto.branchId,
      );
      if (branch.length === 0) {
        throw new NotFoundException('Active branch not found');
      }

      // Ensure performers exist (auto-provision solo owner when needed)
      if (dto.services.length > 0 || (dto.employees && dto.employees.length > 0)) {
        await this.employeesService.listPosPerformers(schemaName, user, dto.branchId);
      }

      const branchEmployees = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${employees}
         WHERE status = 'ACTIVE' AND branch_id = $1::uuid`,
        dto.branchId,
      );
      const branchEmployeeIds = new Set(branchEmployees.map((e) => e.id));

      if (dto.services.length > 0 && branchEmployeeIds.size === 0) {
        throw new BadRequestException(
          'No active employees available for this branch. Cannot complete a service sale.',
        );
      }

      const soleEmployeeId = branchEmployeeIds.size === 1 ? [...branchEmployeeIds][0] : null;

      let subtotal = 0;
      const lineItems: Array<{
        itemType: 'service' | 'product';
        serviceId?: string;
        productId?: string;
        employeeId?: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        total: number;
      }> = [];

      for (const item of dto.services) {
        const svc = await tx.$queryRawUnsafe<
          Array<{ id: string; price: string; is_active: boolean }>
        >(
          `SELECT id, price::text, is_active FROM ${services} WHERE id = $1::uuid LIMIT 1`,
          item.serviceId,
        );
        if (svc.length === 0 || !svc[0].is_active) {
          throw new NotFoundException(`Service not found or inactive: ${item.serviceId}`);
        }

        let performerId = item.employeeId;
        if (!performerId) {
          throw new BadRequestException(
            `Each service must have a performer assigned (service: ${item.serviceId})`,
          );
        }

        if (!branchEmployeeIds.has(performerId)) {
          throw new BadRequestException(
            `Employee is not an active member of the selected branch: ${performerId}`,
          );
        }

        const unitPrice = Number(svc[0].price);
        const discount = item.discount ?? 0;
        const total = unitPrice - discount;
        subtotal += total;

        lineItems.push({
          itemType: 'service',
          serviceId: item.serviceId,
          employeeId: performerId,
          quantity: 1,
          unitPrice,
          discount,
          total,
        });
      }

      for (const item of dto.products) {
        const prod = await tx.$queryRawUnsafe<
          Array<{ id: string; selling_price: string; is_active: boolean }>
        >(
          `SELECT id, selling_price::text, is_active FROM ${products} WHERE id = $1::uuid LIMIT 1`,
          item.productId,
        );
        if (prod.length === 0 || !prod[0].is_active) {
          throw new NotFoundException(`Product not found or inactive: ${item.productId}`);
        }

        const unitPrice = Number(prod[0].selling_price);
        const discount = item.discount ?? 0;
        const total = unitPrice * item.quantity - discount;
        subtotal += total;

        lineItems.push({
          itemType: 'product',
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          discount,
          total,
        });
      }

      const saleDiscount = dto.discount ?? 0;
      const total = Math.max(0, subtotal - saleDiscount);

      if (Math.abs(paymentTotal - total) > 0.01) {
        throw new BadRequestException(
          `Payment total (${paymentTotal}) must equal sale total (${total})`,
        );
      }

      const assignmentInputs = this.resolveAssignmentInputs(dto, lineItems, soleEmployeeId);
      for (const assignment of assignmentInputs) {
        if (!branchEmployeeIds.has(assignment.employeeId)) {
          throw new BadRequestException(
            `Employee is not an active member of the selected branch: ${assignment.employeeId}`,
          );
        }
      }

      const normalizedAssignments =
        assignmentInputs.length > 0
          ? normalizeSaleAssignments(assignmentInputs, total)
          : [];

      const saleNumber = await this.generateSaleNumber(tx, sales);

      const saleRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${sales}
           (branch_id, customer_id, sale_number, subtotal, discount, tax, total, status, created_by, cashier_id, refunded_amount)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, 0, $6, 'COMPLETED', $7::uuid, $8::uuid, 0)
         RETURNING id`,
        dto.branchId,
        dto.customerId ?? null,
        saleNumber,
        subtotal,
        saleDiscount,
        total,
        cashierUserId,
        cashierUserId,
      );

      const saleId = saleRows[0].id;

      const assignmentTypeCast = this.tenantEnumCast(schemaName, 'sale_assignment_type', 3);
      for (const assignment of normalizedAssignments) {
        await tx.$queryRawUnsafe(
          `INSERT INTO ${saleEmployees}
             (sale_id, employee_id, assignment_type, allocation_percentage, commissionable_amount)
           VALUES ($1::uuid, $2::uuid, ${assignmentTypeCast}, $4::numeric, $5::numeric)`,
          saleId,
          assignment.employeeId,
          assignment.assignmentType,
          assignment.allocationPercentage,
          assignment.commissionableAmount,
        );
      }

      const primaryEmployeeId =
        normalizedAssignments.find((a) => a.assignmentType === 'PRIMARY')?.employeeId ??
        normalizedAssignments[0]?.employeeId;

      for (const line of lineItems) {
        const itemRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO ${saleItems}
             (sale_id, item_type, service_id, product_id, quantity, unit_price, discount, total)
           VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5, $6, $7, $8)
           RETURNING id`,
          saleId,
          line.itemType,
          line.serviceId ?? null,
          line.productId ?? null,
          line.quantity,
          line.unitPrice,
          line.discount,
          line.total,
        );

        if (line.itemType === 'service') {
          const lineEmployeeId = line.employeeId ?? primaryEmployeeId;
          if (lineEmployeeId) {
            await tx.$queryRawUnsafe(
              `INSERT INTO ${saleItemEmployees} (sale_item_id, employee_id)
               VALUES ($1::uuid, $2::uuid)`,
              itemRows[0].id,
              lineEmployeeId,
            );
          }
        }

        if (line.itemType === 'product' && line.productId) {
          await this.inventoryService.reduceStockForSale(tx, schemaName, {
            branchId: dto.branchId,
            productId: line.productId,
            quantity: line.quantity,
            saleId,
            userId: cashierUserId,
          });
        }
      }

      for (const payment of dto.payments) {
        const methodCast = this.tenantEnumCast(schemaName, 'payment_method', 2);
        const statusCast = this.tenantEnumCast(schemaName, 'payment_status', 4);
        await tx.$queryRawUnsafe(
          `INSERT INTO ${payments} (sale_id, method, amount, status, reference_number)
           VALUES ($1::uuid, ${methodCast}, $3, ${statusCast}, $5)`,
          saleId,
          payment.method,
          payment.amount,
          'COMPLETED',
          payment.referenceNumber ?? null,
        );
      }

      await logAudit(tx, schemaName, {
        userId: cashierUserId,
        action: 'SALE_CREATE',
        entityType: 'sale',
        entityId: saleId,
        details: {
          saleNumber,
          total,
          employees: normalizedAssignments.map((a) => ({
            employeeId: a.employeeId,
            assignmentType: a.assignmentType,
            allocationPercentage: a.allocationPercentage,
            commissionableAmount: a.commissionableAmount,
          })),
        },
      });

      return {
        id: saleId,
        saleNumber,
        subtotal,
        discount: saleDiscount,
        total,
        employees: normalizedAssignments,
      };
    });
  }

  /**
   * Create a COMPLETED sale using quotation snapshot prices (does not re-read service master prices).
   * Quotation conversion only — normal POS still uses live catalog prices.
   */
  async createSaleFromSnapshot(
    schemaName: string,
    user: AuthenticatedUser,
    input: {
      branchId: string;
      customerId: string;
      discount?: number;
      quotationId?: string;
      services: Array<{
        serviceId: string;
        employeeId: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
      }>;
      products: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
      }>;
      payments: Array<{
        method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
        amount: number;
        referenceNumber?: string;
      }>;
    },
  ) {
    const cashierUserId = user.id;
    if (input.services.length === 0 && input.products.length === 0) {
      throw new BadRequestException('Sale must include at least one service or product');
    }
    const paymentTotal = input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (paymentTotal <= 0) {
      throw new BadRequestException('At least one payment is required');
    }

    const sales = tenantTable(schemaName, 'sales');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const saleEmployees = tenantTable(schemaName, 'sale_employees');
    const payments = tenantTable(schemaName, 'payments');
    const services = tenantTable(schemaName, 'services');
    const products = tenantTable(schemaName, 'products');
    const employees = tenantTable(schemaName, 'employees');
    const branches = tenantTable(schemaName, 'branches');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const branch = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${branches} WHERE id = $1::uuid AND status = 'ACTIVE' LIMIT 1`,
        input.branchId,
      );
      if (branch.length === 0) throw new NotFoundException('Active branch not found');

      await this.employeesService.listPosPerformers(schemaName, user, input.branchId);
      const branchEmployees = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${employees} WHERE status = 'ACTIVE' AND branch_id = $1::uuid`,
        input.branchId,
      );
      const branchEmployeeIds = new Set(branchEmployees.map((e) => e.id));

      let subtotal = 0;
      const lineItems: Array<{
        itemType: 'service' | 'product';
        serviceId?: string;
        productId?: string;
        employeeId?: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        total: number;
      }> = [];

      for (const item of input.services) {
        const svc = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM ${services} WHERE id = $1::uuid LIMIT 1`,
          item.serviceId,
        );
        if (!svc.length) throw new NotFoundException(`Service not found: ${item.serviceId}`);
        if (!branchEmployeeIds.has(item.employeeId)) {
          throw new BadRequestException(`Employee not active on branch: ${item.employeeId}`);
        }
        const discount = item.discount ?? 0;
        const total = item.unitPrice * item.quantity - discount;
        subtotal += total;
        lineItems.push({
          itemType: 'service',
          serviceId: item.serviceId,
          employeeId: item.employeeId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount,
          total,
        });
      }

      for (const item of input.products) {
        const prod = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM ${products} WHERE id = $1::uuid LIMIT 1`,
          item.productId,
        );
        if (!prod.length) throw new NotFoundException(`Product not found: ${item.productId}`);
        const discount = item.discount ?? 0;
        const total = item.unitPrice * item.quantity - discount;
        subtotal += total;
        lineItems.push({
          itemType: 'product',
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount,
          total,
        });
      }

      const saleDiscount = input.discount ?? 0;
      const total = Math.max(0, subtotal - saleDiscount);
      if (Math.abs(paymentTotal - total) > 0.01) {
        throw new BadRequestException(
          `Payment total (${paymentTotal}) must equal sale total (${total})`,
        );
      }

      const assignmentInputs = lineItems
        .map((l) => l.employeeId)
        .filter((id): id is string => Boolean(id))
        .filter((id, i, arr) => arr.indexOf(id) === i)
        .map((employeeId, index) => ({
          employeeId,
          assignmentType: (index === 0 ? 'PRIMARY' : 'ASSISTANT') as 'PRIMARY' | 'ASSISTANT',
        }));

      const normalizedAssignments =
        assignmentInputs.length > 0
          ? normalizeSaleAssignments(assignmentInputs, total)
          : [];

      const saleNumber = await this.generateSaleNumber(tx, sales);
      const saleRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${sales}
           (branch_id, customer_id, sale_number, subtotal, discount, tax, total, status, created_by, cashier_id, refunded_amount)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, 0, $6, 'COMPLETED', $7::uuid, $8::uuid, 0)
         RETURNING id`,
        input.branchId,
        input.customerId,
        saleNumber,
        subtotal,
        saleDiscount,
        total,
        cashierUserId,
        cashierUserId,
      );
      const saleId = saleRows[0].id;

      const assignmentTypeCast = this.tenantEnumCast(schemaName, 'sale_assignment_type', 3);
      for (const assignment of normalizedAssignments) {
        await tx.$queryRawUnsafe(
          `INSERT INTO ${saleEmployees}
             (sale_id, employee_id, assignment_type, allocation_percentage, commissionable_amount)
           VALUES ($1::uuid, $2::uuid, ${assignmentTypeCast}, $4::numeric, $5::numeric)`,
          saleId,
          assignment.employeeId,
          assignment.assignmentType,
          assignment.allocationPercentage,
          assignment.commissionableAmount,
        );
      }

      for (const line of lineItems) {
        const itemRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO ${saleItems}
             (sale_id, item_type, service_id, product_id, quantity, unit_price, discount, total)
           VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5, $6, $7, $8)
           RETURNING id`,
          saleId,
          line.itemType,
          line.serviceId ?? null,
          line.productId ?? null,
          line.quantity,
          line.unitPrice,
          line.discount,
          line.total,
        );
        if (line.itemType === 'service' && line.employeeId) {
          await tx.$queryRawUnsafe(
            `INSERT INTO ${saleItemEmployees} (sale_item_id, employee_id) VALUES ($1::uuid, $2::uuid)`,
            itemRows[0].id,
            line.employeeId,
          );
        }
        if (line.itemType === 'product' && line.productId) {
          await this.inventoryService.reduceStockForSale(tx, schemaName, {
            branchId: input.branchId,
            productId: line.productId,
            quantity: line.quantity,
            saleId,
            userId: cashierUserId,
          });
        }
      }

      for (const payment of input.payments) {
        const methodCast = this.tenantEnumCast(schemaName, 'payment_method', 2);
        const statusCast = this.tenantEnumCast(schemaName, 'payment_status', 4);
        await tx.$queryRawUnsafe(
          `INSERT INTO ${payments} (sale_id, method, amount, status, reference_number)
           VALUES ($1::uuid, ${methodCast}, $3, ${statusCast}, $5)`,
          saleId,
          payment.method,
          payment.amount,
          'COMPLETED',
          payment.referenceNumber ?? null,
        );
      }

      await logAudit(tx, schemaName, {
        userId: cashierUserId,
        action: 'SALE_CREATE',
        entityType: 'sale',
        entityId: saleId,
        details: {
          saleNumber,
          total,
          fromQuotationId: input.quotationId ?? null,
          snapshotPricing: true,
        },
      });

      return { id: saleId, saleNumber, subtotal, discount: saleDiscount, total };
    });
  }

  private resolveAssignmentInputs(
    dto: CreateSaleDto,
    lineItems: Array<{ employeeId?: string }>,
    soleEmployeeId: string | null,
  ): SaleEmployeeDto[] {
    if (dto.employees && dto.employees.length > 0) {
      return dto.employees;
    }

    const fromLines = [
      ...new Set(
        lineItems.map((l) => l.employeeId).filter((id): id is string => Boolean(id)),
      ),
    ];
    if (fromLines.length > 0) {
      return fromLines.map((employeeId, index) => ({
        employeeId,
        assignmentType: index === 0 ? ('PRIMARY' as const) : ('ASSISTANT' as const),
      }));
    }

    if (soleEmployeeId) {
      return [{ employeeId: soleEmployeeId, assignmentType: 'PRIMARY' }];
    }

    // Product-only sale with no employees — allowed with empty assignment
    if (dto.services.length === 0) {
      return [];
    }

    throw new BadRequestException('Assign at least one employee to the sale');
  }

  private async generateSaleNumber(
    tx: { $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T> },
    salesTable: string,
  ): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SALE-${today}-`;

    const result = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM ${salesTable} WHERE sale_number LIKE $1`,
      `${prefix}%`,
    );

    const next = Number(result[0]?.count ?? 0) + 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }
}
