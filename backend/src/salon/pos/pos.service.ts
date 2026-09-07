import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { InventoryService } from '../inventory/inventory.service';
import { logAudit } from '../utils/audit.util';
import { CreateSaleDto } from './dto/pos.dto';

@Injectable()
export class PosService {
  constructor(
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async createSale(schemaName: string, dto: CreateSaleDto, cashierUserId: string) {
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

      const activeEmployees = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${employees} WHERE status = 'ACTIVE'`,
      );

      if (dto.services.length > 0 && activeEmployees.length === 0) {
        throw new BadRequestException(
          'No active employees available. Cannot complete a service sale.',
        );
      }

      const soleEmployeeId = activeEmployees.length === 1 ? activeEmployees[0].id : null;

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
          if (soleEmployeeId) {
            performerId = soleEmployeeId;
          } else {
            throw new BadRequestException(
              'Each service must have a performer assigned when multiple employees exist',
            );
          }
        }

        const emp = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM ${employees} WHERE id = $1::uuid AND status = 'ACTIVE' LIMIT 1`,
          performerId,
        );
        if (emp.length === 0) {
          throw new BadRequestException(`Employee not found or inactive: ${performerId}`);
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

      const saleNumber = await this.generateSaleNumber(tx, sales);

      const saleRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${sales}
           (branch_id, customer_id, sale_number, subtotal, discount, tax, total, status, created_by, cashier_id)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, 0, $6, 'COMPLETED', $7::uuid, $8::uuid)
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
            `INSERT INTO ${saleItemEmployees} (sale_item_id, employee_id)
             VALUES ($1::uuid, $2::uuid)`,
            itemRows[0].id,
            line.employeeId,
          );
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
        await tx.$queryRawUnsafe(
          `INSERT INTO ${payments} (sale_id, method, amount, status, reference_number)
           VALUES ($1::uuid, $2::payment_method, $3, 'COMPLETED', $4)`,
          saleId,
          payment.method,
          payment.amount,
          payment.referenceNumber ?? null,
        );
      }

      await logAudit(tx, schemaName, {
        userId: cashierUserId,
        action: 'SALE_CREATE',
        entityType: 'sale',
        entityId: saleId,
        details: { saleNumber, total },
      });

      return { id: saleId, saleNumber, subtotal, discount: saleDiscount, total };
    });
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
