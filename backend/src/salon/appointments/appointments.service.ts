import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { logAudit } from '../utils/audit.util';
import { generateSequentialCode } from '../utils/code-generator.util';
import {
  CalendarAppointmentsQueryDto,
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  UpdateAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/appointment.dto';

export interface AppointmentServiceRecord {
  id: string;
  name: string;
  price: number;
  durationMinutes: number | null;
}

export interface AppointmentRecord {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  branchId: string;
  branchName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  services: AppointmentServiceRecord[];
  totalPrice: number;
  totalDuration: number | null;
  createdAt: Date;
}

interface ServiceSnapshot {
  id: string;
  name: string;
  price: string;
  durationMinutes: number | null;
}

type TenantTx = {
  $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>;
};

@Injectable()
export class AppointmentsService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  private normalizeTime(time: string): string {
    return time.length === 5 ? `${time}:00` : time;
  }

  private appointmentStatusCast(schemaName: string, paramIndex: number): string {
    return `$${paramIndex}::text::"${schemaName}".appointment_status`;
  }

  private mapServices(
    raw: Array<{
      id: string;
      name: string;
      price: string | number;
      durationMinutes: number | null;
    }> | null,
  ): AppointmentServiceRecord[] {
    if (!raw || !Array.isArray(raw)) {
      return [];
    }

    return raw.map((service) => ({
      id: service.id,
      name: service.name,
      price: Number(service.price),
      durationMinutes: service.durationMinutes,
    }));
  }

  private mapAppointmentRow(row: {
    id: string;
    code: string;
    customerId: string;
    customerName: string;
    customerPhone: string | null;
    branchId: string;
    branchName: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    status: string;
    notes: string | null;
    services: unknown;
    totalPrice: string | number | null;
    totalDuration: number | null;
    createdAt: Date;
  }): AppointmentRecord {
    const services = this.mapServices(row.services as AppointmentServiceRecord[] | null);
    const totalPrice =
      row.totalPrice != null
        ? Number(row.totalPrice)
        : services.reduce((sum, service) => sum + service.price, 0);
    const totalDuration =
      row.totalDuration != null
        ? row.totalDuration
        : services.reduce((sum, service) => sum + (service.durationMinutes ?? 0), 0) || null;

    return {
      id: row.id,
      code: row.code,
      customerId: row.customerId,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      branchId: row.branchId,
      branchName: row.branchName,
      appointmentDate: row.appointmentDate,
      startTime: row.startTime,
      endTime: row.endTime,
      status: row.status,
      notes: row.notes,
      services,
      totalPrice,
      totalDuration,
      createdAt: row.createdAt,
    };
  }

  private appointmentSelectSql(schemaName: string): string {
    const appointments = tenantTable(schemaName, 'appointments');
    const customers = tenantTable(schemaName, 'customers');
    const branches = tenantTable(schemaName, 'branches');
    const appointmentServices = tenantTable(schemaName, 'appointment_services');

    return `
      SELECT a.id, a.code,
             a.customer_id AS "customerId", c.name AS "customerName", c.phone AS "customerPhone",
             a.branch_id AS "branchId", b.name AS "branchName",
             a.appointment_date::text AS "appointmentDate",
             to_char(a.start_time, 'HH24:MI') AS "startTime",
             to_char(a.end_time, 'HH24:MI') AS "endTime",
             a.status::text AS status,
             a.notes,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', aps.service_id,
                   'name', aps.service_name,
                   'price', aps.price,
                   'durationMinutes', aps.duration_minutes
                 )
                 ORDER BY aps.service_name
               ) FILTER (WHERE aps.service_id IS NOT NULL),
               '[]'::json
             ) AS services,
             COALESCE(SUM(aps.price), 0)::float AS "totalPrice",
             NULLIF(SUM(COALESCE(aps.duration_minutes, 0)), 0)::int AS "totalDuration",
             a.created_at AS "createdAt"
      FROM ${appointments} a
      INNER JOIN ${customers} c ON a.customer_id = c.id
      INNER JOIN ${branches} b ON a.branch_id = b.id
      LEFT JOIN ${appointmentServices} aps ON aps.appointment_id = a.id
    `;
  }

  private buildListConditions(
    schemaName: string,
    query: ListAppointmentsQueryDto | CalendarAppointmentsQueryDto,
    params: unknown[],
  ): string[] {
    const conditions: string[] = ['1=1'];
    let idx = params.length + 1;

    if ('startDate' in query && query.startDate) {
      conditions.push(`a.appointment_date >= $${idx++}::date`);
      params.push(query.startDate);
    }
    if ('endDate' in query && query.endDate) {
      conditions.push(`a.appointment_date <= $${idx++}::date`);
      params.push(query.endDate);
    }
    if (query.branchId) {
      conditions.push(`a.branch_id = $${idx++}::uuid`);
      params.push(query.branchId);
    }
    if ('customerId' in query && query.customerId) {
      conditions.push(`a.customer_id = $${idx++}::uuid`);
      params.push(query.customerId);
    }
    if ('status' in query && query.status) {
      conditions.push(`a.status = ${this.appointmentStatusCast(schemaName, idx++)}`);
      params.push(query.status);
    }

    return conditions;
  }

  private async fetchServiceSnapshots(
    tx: TenantTx,
    schemaName: string,
    serviceIds: string[],
  ): Promise<ServiceSnapshot[]> {
    const services = tenantTable(schemaName, 'services');
    const placeholders = serviceIds.map((_, index) => `$${index + 1}::uuid`).join(', ');
    const rows = await tx.$queryRawUnsafe<ServiceSnapshot[]>(
      `SELECT id, name, price::text, duration_minutes AS "durationMinutes"
       FROM ${services}
       WHERE id IN (${placeholders}) AND is_active = true`,
      ...serviceIds,
    );

    if (rows.length !== serviceIds.length) {
      throw new BadRequestException('One or more services are invalid or inactive');
    }

    const byId = new Map(rows.map((row) => [row.id, row]));
    return serviceIds.map((id) => byId.get(id)!);
  }

  private async insertAppointmentServices(
    tx: TenantTx,
    schemaName: string,
    appointmentId: string,
    snapshots: ServiceSnapshot[],
  ): Promise<void> {
    const appointmentServices = tenantTable(schemaName, 'appointment_services');

    for (const service of snapshots) {
      await tx.$queryRawUnsafe(
        `INSERT INTO ${appointmentServices}
           (appointment_id, service_id, service_name, price, duration_minutes)
         VALUES ($1::uuid, $2::uuid, $3, $4::numeric, $5)`,
        appointmentId,
        service.id,
        service.name,
        service.price,
        service.durationMinutes,
      );
    }
  }

  private async assertEntityExists(
    tx: TenantTx,
    schemaName: string,
    table: string,
    id: string,
    label: string,
  ): Promise<void> {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM ${table} WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    if (rows.length === 0) {
      throw new NotFoundException(`${label} not found`);
    }
  }

  private appointmentFromClause(schemaName: string): string {
    const appointments = tenantTable(schemaName, 'appointments');
    const customers = tenantTable(schemaName, 'customers');
    const branches = tenantTable(schemaName, 'branches');

    return `
      FROM ${appointments} a
      INNER JOIN ${customers} c ON a.customer_id = c.id
      INNER JOIN ${branches} b ON a.branch_id = b.id
      LEFT JOIN ${tenantTable(schemaName, 'appointment_services')} aps ON aps.appointment_id = a.id`;
  }

  private async fetchAppointments(
    schemaName: string,
    query: ListAppointmentsQueryDto | CalendarAppointmentsQueryDto,
    pagination?: { limit: number; offset: number },
  ): Promise<AppointmentRecord[]> {
    const params: unknown[] = [];
    const conditions = this.buildListConditions(schemaName, query, params);
    let idx = params.length + 1;
    const paginationClause = pagination ? ` LIMIT $${idx++} OFFSET $${idx++}` : '';
    const paginationParams = pagination ? [pagination.limit, pagination.offset] : [];

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          code: string;
          customerId: string;
          customerName: string;
          customerPhone: string | null;
          branchId: string;
          branchName: string;
          appointmentDate: string;
          startTime: string;
          endTime: string;
          status: string;
          notes: string | null;
          services: unknown;
          totalPrice: string | number | null;
          totalDuration: number | null;
          createdAt: Date;
        }>
      >(
        `${this.appointmentSelectSql(schemaName)}
         WHERE ${conditions.join(' AND ')}
         GROUP BY a.id, c.name, c.phone, b.name
         ORDER BY a.appointment_date ASC, a.start_time ASC${paginationClause}`,
        ...params,
        ...paginationParams,
      );

      return rows.map((row) => this.mapAppointmentRow(row));
    });
  }

  async list(schemaName: string, query: ListAppointmentsQueryDto) {
    const { page, limit, offset } = resolvePagination(query.page, query.limit);
    const params: unknown[] = [];
    const conditions = this.buildListConditions(schemaName, query, params);
    const whereClause = conditions.join(' AND ');

    const total = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(DISTINCT a.id)::bigint AS count ${this.appointmentFromClause(schemaName)} WHERE ${whereClause}`,
        ...params,
      );
      return Number(countRows[0]?.count ?? 0);
    });

    const data = await this.fetchAppointments(schemaName, query, { limit, offset });
    return buildPaginatedResponse(data, total, page, limit);
  }

  async calendar(
    schemaName: string,
    query: CalendarAppointmentsQueryDto,
  ): Promise<Array<{ date: string; appointments: AppointmentRecord[] }>> {
    const appointments = await this.fetchAppointments(schemaName, query);
    const grouped = new Map<string, AppointmentRecord[]>();

    for (const appointment of appointments) {
      const existing = grouped.get(appointment.appointmentDate) ?? [];
      existing.push(appointment);
      grouped.set(appointment.appointmentDate, existing);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, appointments: items }));
  }

  async findById(schemaName: string, id: string): Promise<AppointmentRecord> {
    const appointment = await this.tenantSchemaService.withTenantSchema(
      schemaName,
      async ({ tx }) => {
        const rows = await tx.$queryRawUnsafe<
          Array<{
            id: string;
            code: string;
            customerId: string;
            customerName: string;
            customerPhone: string | null;
            branchId: string;
            branchName: string;
            appointmentDate: string;
            startTime: string;
            endTime: string;
            status: string;
            notes: string | null;
            services: unknown;
            totalPrice: string | number | null;
            totalDuration: number | null;
            createdAt: Date;
          }>
        >(
          `${this.appointmentSelectSql(schemaName)}
           WHERE a.id = $1::uuid
           GROUP BY a.id, c.name, c.phone, b.name
           LIMIT 1`,
          id,
        );
        return rows[0] ?? null;
      },
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return this.mapAppointmentRow(appointment);
  }

  async create(
    schemaName: string,
    dto: CreateAppointmentDto,
    userId: string,
  ): Promise<AppointmentRecord> {
    const appointments = tenantTable(schemaName, 'appointments');
    const customers = tenantTable(schemaName, 'customers');
    const branches = tenantTable(schemaName, 'branches');
    const startTime = this.normalizeTime(dto.startTime);
    const endTime = this.normalizeTime(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const appointmentId = await this.tenantSchemaService.withTenantSchema(
      schemaName,
      async ({ tx }) => {
        await this.assertEntityExists(tx, schemaName, customers, dto.customerId, 'Customer');
        await this.assertEntityExists(tx, schemaName, branches, dto.branchId, 'Branch');

        const snapshots = await this.fetchServiceSnapshots(tx, schemaName, dto.serviceIds);
        const code = await generateSequentialCode(tx, appointments, 'APT-');

        const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO ${appointments}
             (code, customer_id, branch_id, appointment_date, start_time, end_time, notes, created_by)
           VALUES ($1, $2::uuid, $3::uuid, $4::date, $5::time, $6::time, $7, $8::uuid)
           RETURNING id`,
          code,
          dto.customerId,
          dto.branchId,
          dto.appointmentDate,
          startTime,
          endTime,
          dto.notes ?? null,
          userId,
        );

        const id = rows[0].id;
        await this.insertAppointmentServices(tx, schemaName, id, snapshots);

        await logAudit(tx, schemaName, {
          userId,
          action: 'APPOINTMENT_CREATE',
          entityType: 'appointment',
          entityId: id,
          details: {
            customerId: dto.customerId,
            branchId: dto.branchId,
            appointmentDate: dto.appointmentDate,
            serviceIds: dto.serviceIds,
          },
        });

        return id;
      },
    );

    return this.findById(schemaName, appointmentId);
  }

  async update(
    schemaName: string,
    id: string,
    dto: UpdateAppointmentDto,
    userId: string,
  ): Promise<AppointmentRecord> {
    const appointments = tenantTable(schemaName, 'appointments');
    const customers = tenantTable(schemaName, 'customers');
    const branches = tenantTable(schemaName, 'branches');
    const appointmentServices = tenantTable(schemaName, 'appointment_services');

    await this.findById(schemaName, id);

    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      if (dto.customerId) {
        await this.assertEntityExists(tx, schemaName, customers, dto.customerId, 'Customer');
      }
      if (dto.branchId) {
        await this.assertEntityExists(tx, schemaName, branches, dto.branchId, 'Branch');
      }

      const startTime = dto.startTime ? this.normalizeTime(dto.startTime) : null;
      const endTime = dto.endTime ? this.normalizeTime(dto.endTime) : null;

      if (startTime && endTime && startTime >= endTime) {
        throw new BadRequestException('endTime must be after startTime');
      }

      await tx.$queryRawUnsafe(
        `UPDATE ${appointments}
         SET customer_id = COALESCE($2::uuid, customer_id),
             branch_id = COALESCE($3::uuid, branch_id),
             appointment_date = COALESCE($4::date, appointment_date),
             start_time = COALESCE($5::time, start_time),
             end_time = COALESCE($6::time, end_time),
             notes = COALESCE($7, notes),
             updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.customerId ?? null,
        dto.branchId ?? null,
        dto.appointmentDate ?? null,
        startTime,
        endTime,
        dto.notes ?? null,
      );

      if (dto.serviceIds) {
        const snapshots = await this.fetchServiceSnapshots(tx, schemaName, dto.serviceIds);
        await tx.$queryRawUnsafe(
          `DELETE FROM ${appointmentServices} WHERE appointment_id = $1::uuid`,
          id,
        );
        await this.insertAppointmentServices(tx, schemaName, id, snapshots);
      }

      await logAudit(tx, schemaName, {
        userId,
        action: 'APPOINTMENT_UPDATE',
        entityType: 'appointment',
        entityId: id,
        details: dto as Record<string, unknown>,
      });
    });

    return this.findById(schemaName, id);
  }

  async updateStatus(
    schemaName: string,
    id: string,
    dto: UpdateAppointmentStatusDto,
    userId: string,
  ): Promise<AppointmentRecord> {
    const appointments = tenantTable(schemaName, 'appointments');
    await this.findById(schemaName, id);

    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${appointments}
         SET status = ${this.appointmentStatusCast(schemaName, 2)}, updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.status,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'APPOINTMENT_STATUS_UPDATE',
        entityType: 'appointment',
        entityId: id,
        details: { status: dto.status },
      });
    });

    return this.findById(schemaName, id);
  }

  async cancel(schemaName: string, id: string, userId: string): Promise<AppointmentRecord> {
    return this.updateStatus(schemaName, id, { status: 'CANCELLED' }, userId);
  }
}
