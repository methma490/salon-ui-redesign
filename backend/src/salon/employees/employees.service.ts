import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import sharp from 'sharp';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { StorageService } from '../../common/storage/storage.service';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable, tenantType } from '../../tenant/utils/schema-name.util';
import { logAudit } from '../utils/audit.util';
import { generateSequentialCode } from '../utils/code-generator.util';
import {
  filterPermissionsByFeatures,
  isReservedPlatformRole,
  ROLE_MANAGEMENT_FEATURE,
  roleEligibleForPlan,
} from '../utils/permission-feature.util';
import {
  CreateEmployeeDto,
  ListEmployeesQueryDto,
  UpdateEmployeeDto,
  UpdateEmployeeStatusDto,
} from './dto/employee.dto';

export interface EmployeeRecord {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  designation: string | null;
  branchId: string;
  branchName: string;
  userId: string | null;
  systemRoles: string[];
  status: string;
  basicSalary: number;
  commissionRate: number;
  commissionType: string;
  epfEnabled: boolean;
  etfEnabled: boolean;
  maxAdvancePercentage: number;
  createdAt: Date;
  updatedAt: Date;
  photoUrl: string | null;
}

export interface AssignableRoleOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: Array<{ code: string; name: string }>;
}

type TenantTx = {
  $queryRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
};

@Injectable()
export class EmployeesService {
  constructor(
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly storageService: StorageService,
  ) {}

  async saveEmployeePhoto(file: Express.Multer.File | undefined): Promise<{ photoUrl: string }> {
    if (!file) throw new BadRequestException('Profile image file is required');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Profile image must be JPG, PNG, or WEBP');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Profile image must be 2MB or smaller');
    }

    let buffer: Buffer;
    try {
      buffer = await sharp(file.buffer)
        .rotate()
        .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer();
    } catch {
      throw new BadRequestException('Could not process the profile image. Please choose a valid image.');
    }

    const filename = `employee_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
    const photoUrl = await this.storageService.uploadFile(buffer, 'employees', filename, 'image/webp');
    return { photoUrl };
  }

  private employeeSelectSql(employees: string, branches: string, schemaName: string): string {
    const userRolesTable = tenantTable(schemaName, 'user_roles');
    const rolesTable = tenantTable(schemaName, 'roles');

    return `SELECT e.id, e.code, e.name, e.phone, e.email, e.designation,
                   e.branch_id AS "branchId", b.name AS "branchName",
                   e.user_id AS "userId",
                   COALESCE(
                     (SELECT array_agg(r.code ORDER BY r.code)
                      FROM ${userRolesTable} ur
                      INNER JOIN ${rolesTable} r ON ur.role_id = r.id
                      WHERE ur.user_id = e.user_id),
                     ARRAY[]::text[]
                   ) AS "systemRoles",
                   e.status::text AS status,
                   e.photo_url AS "photoUrl",
                   COALESCE(e.basic_salary, 0)::float AS "basicSalary",
                   COALESCE(e.commission_rate, 0)::float AS "commissionRate",
                   COALESCE(e.commission_type, 'PERCENTAGE_OF_INVOICE_SALES') AS "commissionType",
                   COALESCE(e.epf_enabled, true) AS "epfEnabled",
                   COALESCE(e.etf_enabled, true) AS "etfEnabled",
                   COALESCE(e.max_advance_percentage, 100)::float AS "maxAdvancePercentage",
                   e.created_at AS "createdAt", e.updated_at AS "updatedAt"
            FROM ${employees} e
            INNER JOIN ${branches} b ON e.branch_id = b.id`;
  }

  private async fetchEmployeeByIdTx(
    tx: TenantTx,
    schemaName: string,
    id: string,
  ): Promise<EmployeeRecord | null> {
    const employees = tenantTable(schemaName, 'employees');
    const branches = tenantTable(schemaName, 'branches');
    const rows = (await tx.$queryRawUnsafe(
      `${this.employeeSelectSql(employees, branches, schemaName)} WHERE e.id = $1::uuid LIMIT 1`,
      id,
    )) as EmployeeRecord[];
    return rows[0] ?? null;
  }

  private async loadRolePermissionsMap(
    tx: TenantTx,
    schemaName: string,
  ): Promise<Map<string, string[]>> {
    const rolesTable = tenantTable(schemaName, 'roles');
    const permissionsTable = tenantTable(schemaName, 'permissions');
    const rolePermissionsTable = tenantTable(schemaName, 'role_permissions');

    const rows = (await tx.$queryRawUnsafe(
      `SELECT r.code AS role_code, p.code AS permission_code
       FROM ${rolePermissionsTable} rp
       INNER JOIN ${rolesTable} r ON rp.role_id = r.id
       INNER JOIN ${permissionsTable} p ON rp.permission_id = p.id`,
    )) as Array<{ role_code: string; permission_code: string }>;

    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.role_code) ?? [];
      list.push(row.permission_code);
      map.set(row.role_code, list);
    }
    return map;
  }

  async getAssignableRoles(tenantId: string, schemaName: string): Promise<AssignableRoleOption[]> {
    const subscriptionContext =
      await this.subscriptionsService.getTenantSubscriptionContext(tenantId);
    const enabledFeatures = subscriptionContext.features;

    if (!enabledFeatures.includes(ROLE_MANAGEMENT_FEATURE)) {
      return [];
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rolesTable = tenantTable(schemaName, 'roles');
      const permissionsTable = tenantTable(schemaName, 'permissions');
      const rolePermissionsTable = tenantTable(schemaName, 'role_permissions');

      const roles = (await tx.$queryRawUnsafe(
        `SELECT id, code, name, description, COALESCE(is_system, false) AS "isSystem"
         FROM ${rolesTable}
         WHERE code <> 'SALON_ADMIN'
         ORDER BY is_system DESC, code ASC`,
      )) as Array<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        isSystem: boolean;
      }>;

      const roleCodes = roles.map((role) => role.code);

      const rolePermissions = (await tx.$queryRawUnsafe(
        `SELECT r.code AS role_code, p.code AS permission_code, p.name AS permission_name
         FROM ${rolePermissionsTable} rp
         INNER JOIN ${rolesTable} r ON rp.role_id = r.id
         INNER JOIN ${permissionsTable} p ON rp.permission_id = p.id
         WHERE r.code = ANY($1::text[])
         ORDER BY r.code ASC, p.code ASC`,
        roleCodes,
      )) as Array<{
        role_code: string;
        permission_code: string;
        permission_name: string;
      }>;

      const permissionsByRole = new Map<string, Array<{ code: string; name: string }>>();
      for (const row of rolePermissions) {
        const list = permissionsByRole.get(row.role_code) ?? [];
        list.push({ code: row.permission_code, name: row.permission_name });
        permissionsByRole.set(row.role_code, list);
      }

      const permissionCodesByRole = await this.loadRolePermissionsMap(tx, schemaName);

      return roles
        .filter((role) =>
          roleEligibleForPlan(
            role.code,
            permissionCodesByRole.get(role.code) ?? [],
            enabledFeatures,
          ),
        )
        .map((role) => ({
          ...role,
          permissions: filterPermissionsByFeatures(
            permissionsByRole.get(role.code) ?? [],
            enabledFeatures,
          ),
        }));
    });
  }

  private async createEmployeeUser(
    tx: TenantTx,
    schemaName: string,
    params: {
      name: string;
      email: string;
      phone: string | null;
      password: string;
      roleCode: string;
    },
  ): Promise<string> {
    const usersTable = tenantTable(schemaName, 'users');
    const rolesTable = tenantTable(schemaName, 'roles');
    const userRolesTable = tenantTable(schemaName, 'user_roles');
    const normalizedEmail = params.email.trim().toLowerCase();

    if (isReservedPlatformRole(params.roleCode)) {
      throw new BadRequestException('Cannot assign platform reserved roles to tenant users');
    }

    const existing = (await tx.$queryRawUnsafe(
      `SELECT id FROM ${usersTable} WHERE LOWER(email) = $1 LIMIT 1`,
      normalizedEmail,
    )) as Array<{ id: string }>;

    if (existing.length > 0) {
      throw new ConflictException({
        statusCode: 409,
        code: 'EMAIL_ALREADY_IN_USE',
        message: 'This email is already in use.',
      });
    }

    const passwordHash = await bcrypt.hash(params.password, 12);

    const userRows = (await tx.$queryRawUnsafe(
      `INSERT INTO ${usersTable} (name, email, phone, password_hash, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING id`,
      params.name,
      normalizedEmail,
      params.phone,
      passwordHash,
    )) as Array<{ id: string }>;

    const userId = userRows[0].id;

    const roleRows = (await tx.$queryRawUnsafe(
      `SELECT id FROM ${rolesTable} WHERE code = $1 LIMIT 1`,
      params.roleCode,
    )) as Array<{ id: string }>;

    if (roleRows.length === 0) {
      throw new BadRequestException('Selected role is not available');
    }

    await tx.$queryRawUnsafe(
      `INSERT INTO ${userRolesTable} (user_id, role_id) VALUES ($1::uuid, $2::uuid)`,
      userId,
      roleRows[0].id,
    );

    return userId;
  }

  private async assignUserRole(
    tx: TenantTx,
    schemaName: string,
    targetUserId: string,
    roleCode: string,
  ): Promise<void> {
    const rolesTable = tenantTable(schemaName, 'roles');
    const userRolesTable = tenantTable(schemaName, 'user_roles');
    const userPermissionsTable = tenantTable(schemaName, 'user_permissions');

    if (isReservedPlatformRole(roleCode)) {
      throw new BadRequestException('Cannot assign platform reserved roles in salon context');
    }

    const roleRows = (await tx.$queryRawUnsafe(
      `SELECT id FROM ${rolesTable} WHERE code = $1 LIMIT 1`,
      roleCode,
    )) as Array<{ id: string }>;

    if (roleRows.length === 0) {
      throw new BadRequestException('Selected role is not available');
    }

    await tx.$queryRawUnsafe(
      `DELETE FROM ${userPermissionsTable} WHERE user_id = $1::uuid`,
      targetUserId,
    );

    await tx.$queryRawUnsafe(
      `DELETE FROM ${userRolesTable} WHERE user_id = $1::uuid`,
      targetUserId,
    );

    await tx.$queryRawUnsafe(
      `INSERT INTO ${userRolesTable} (user_id, role_id) VALUES ($1::uuid, $2::uuid)`,
      targetUserId,
      roleRows[0].id,
    );

    const usersTable = tenantTable(schemaName, 'users');
    await tx.$queryRawUnsafe(
      `UPDATE ${usersTable} SET token_version = token_version + 1, updated_at = NOW() WHERE id = $1::uuid`,
      targetUserId,
    );
  }

  async list(schemaName: string, query: ListEmployeesQueryDto) {
    const employees = tenantTable(schemaName, 'employees');
    const branches = tenantTable(schemaName, 'branches');
    const users = tenantTable(schemaName, 'users');
    const userRoles = tenantTable(schemaName, 'user_roles');
    const roles = tenantTable(schemaName, 'roles');
    const { page, limit, offset } = resolvePagination(query.page, query.limit);

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    if (query.branchId) {
      conditions.push(`e.branch_id = $${idx++}::uuid`);
      params.push(query.branchId);
    }
    if (query.status) {
      conditions.push(`e.status::text = $${idx++}`);
      params.push(query.status);
    }
    if (query.search) {
      conditions.push(
        `(e.name ILIKE $${idx} OR e.phone ILIKE $${idx} OR e.email ILIKE $${idx} OR e.designation ILIKE $${idx})`,
      );
      params.push(`%${query.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');
    const baseSql = `${this.employeeSelectSql(employees, branches, schemaName)} WHERE ${whereClause}`;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      // Salon admins are tenant users, but older tenants never got a matching
      // employee row unless they opened POS. Backfill that profile on listing.
      const adminsWithoutEmployee = (await tx.$queryRawUnsafe(
        `SELECT u.id, u.name, u.email, u.phone,
                (SELECT b.id FROM ${branches} b
                 WHERE b.status = 'ACTIVE' ORDER BY b.is_main DESC, b.created_at ASC LIMIT 1) AS branch_id
         FROM ${users} u
         INNER JOIN ${userRoles} ur ON ur.user_id = u.id
         INNER JOIN ${roles} r ON r.id = ur.role_id AND r.code = 'SALON_ADMIN'
         WHERE u.status = 'ACTIVE'
           AND NOT EXISTS (SELECT 1 FROM ${employees} e WHERE e.user_id = u.id)`,
      )) as Array<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        branch_id: string | null;
      }>;

      for (const admin of adminsWithoutEmployee) {
        if (!admin.branch_id) continue;
        const code = await generateSequentialCode(tx, employees, 'EMP-');
        await tx.$queryRawUnsafe(
          `INSERT INTO ${employees}
             (branch_id, user_id, code, name, email, phone, designation, status)
           SELECT $1::uuid, $2::uuid, $3, $4, $5, $6, 'Owner', 'ACTIVE'
           WHERE NOT EXISTS (SELECT 1 FROM ${employees} WHERE user_id = $2::uuid)`,
          admin.branch_id,
          admin.id,
          code,
          admin.name,
          admin.email,
          admin.phone,
        );
      }

      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${employees} e WHERE ${whereClause}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);

      const data = await tx.$queryRawUnsafe<EmployeeRecord[]>(
        `${baseSql}
         ORDER BY e.name ASC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      );

      return buildPaginatedResponse(data, total, page, limit);
    });
  }

  async findById(schemaName: string, id: string): Promise<EmployeeRecord> {
    const employee = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      this.fetchEmployeeByIdTx(tx, schemaName, id),
    );

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async create(
    tenantId: string,
    schemaName: string,
    dto: CreateEmployeeDto,
    userId: string,
  ): Promise<EmployeeRecord> {
    const employees = tenantTable(schemaName, 'employees');
    const branches = tenantTable(schemaName, 'branches');

    if (dto.roleCode) {
      const subscriptionContext =
        await this.subscriptionsService.getTenantSubscriptionContext(tenantId);

      if (!subscriptionContext.features.includes(ROLE_MANAGEMENT_FEATURE)) {
        throw new ForbiddenException('Role management is not included in your subscription plan');
      }

      const email = dto.email?.trim().toLowerCase();
      if (!email) {
        throw new BadRequestException('Email is required when assigning a system role');
      }
      if (!dto.password) {
        throw new BadRequestException('Password is required when assigning a system role');
      }

      const assignableRoles = await this.getAssignableRoles(tenantId, schemaName);
      if (!assignableRoles.some((role) => role.code === dto.roleCode)) {
        throw new BadRequestException(
          'Selected role is not available on your current subscription plan',
        );
      }

      dto.email = email;
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const branch = (await tx.$queryRawUnsafe(
        `SELECT id FROM ${branches} WHERE id = $1::uuid LIMIT 1`,
        dto.branchId,
      )) as Array<{ id: string }>;
      if (branch.length === 0) {
        throw new NotFoundException('Branch not found');
      }

      let linkedUserId = dto.userId ?? null;

      if (dto.roleCode && dto.password && dto.email) {
        linkedUserId = await this.createEmployeeUser(tx, schemaName, {
          name: dto.name,
          email: dto.email,
          phone: dto.phone ?? null,
          password: dto.password,
          roleCode: dto.roleCode,
        });
      }

      const code = await generateSequentialCode(tx, employees, 'EMP-');

      const rows = (await tx.$queryRawUnsafe(
        `INSERT INTO ${employees}
           (branch_id, user_id, code, name, email, phone, designation, status, basic_salary, commission_rate, epf_enabled, etf_enabled, max_advance_percentage, photo_url)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, 'ACTIVE', $8::numeric, $9::numeric, $10::boolean, $11::boolean, $12::numeric, $13)
         RETURNING id`,
        dto.branchId,
        linkedUserId,
        code,
        dto.name,
        dto.email ?? null,
        dto.phone ?? null,
        dto.designation,
        dto.basicSalary ?? 0,
        dto.commissionRate ?? 0,
        dto.epfEnabled ?? true,
        dto.etfEnabled ?? true,
        dto.maxAdvancePercentage ?? 100,
        dto.photoUrl ?? null,
      )) as Array<{ id: string }>;

      await logAudit(tx, schemaName, {
        userId,
        action: 'EMPLOYEE_CREATE',
        entityType: 'employee',
        entityId: rows[0].id,
        details: {
          name: dto.name,
          designation: dto.designation,
          roleCode: dto.roleCode ?? null,
        },
      });

      const created = await this.fetchEmployeeByIdTx(tx, schemaName, rows[0].id);
      if (!created) {
        throw new NotFoundException('Employee not found');
      }

      return created;
    });
  }

  async update(
    tenantId: string,
    schemaName: string,
    id: string,
    dto: UpdateEmployeeDto,
    userId: string,
  ): Promise<EmployeeRecord> {
    const employees = tenantTable(schemaName, 'employees');
    const employee = await this.findById(schemaName, id);

    const isOwner =
      employee.systemRoles?.includes('SALON_ADMIN') ||
      employee.designation?.toLowerCase() === 'owner' ||
      employee.code === 'EMP-0001';
    if (isOwner) {
      throw new BadRequestException(
        'The Salon Admin profile details cannot be updated from the employees page. Please update owner details in Settings.',
      );
    }

    if (dto.roleCode) {
      const subscriptionContext =
        await this.subscriptionsService.getTenantSubscriptionContext(tenantId);

      if (!subscriptionContext.features.includes(ROLE_MANAGEMENT_FEATURE)) {
        throw new ForbiddenException('Role management is not included in your subscription plan');
      }

      const assignableRoles = await this.getAssignableRoles(tenantId, schemaName);
      if (!assignableRoles.some((role) => role.code === dto.roleCode)) {
        throw new BadRequestException(
          'Selected role is not available on your current subscription plan',
        );
      }
    }

    if (dto.branchId) {
      const branches = tenantTable(schemaName, 'branches');
      const branch = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
        tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM ${branches} WHERE id = $1::uuid LIMIT 1`,
          dto.branchId,
        ),
      );
      if (branch.length === 0) {
        throw new NotFoundException('Branch not found');
      }
    }

    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      let linkedUserId = employee.userId;

      const nextEmail = dto.email ?? employee.email;
      const nextName = dto.name ?? employee.name;
      const nextPhone = dto.phone ?? employee.phone;

      if (dto.roleCode) {
        if (linkedUserId) {
          await this.assignUserRole(tx, schemaName, linkedUserId, dto.roleCode);
        } else {
          const email = nextEmail?.trim().toLowerCase();
          if (!email) {
            throw new BadRequestException('Email is required to assign a system role');
          }
          if (!dto.password) {
            throw new BadRequestException(
              'Password is required to create a login for this employee',
            );
          }
          linkedUserId = await this.createEmployeeUser(tx, schemaName, {
            name: nextName,
            email,
            phone: nextPhone ?? null,
            password: dto.password,
            roleCode: dto.roleCode,
          });
        }
      }

      if (dto.photoUrl !== undefined && employee.photoUrl && employee.photoUrl !== dto.photoUrl) {
        try {
          await this.storageService.deleteFile(employee.photoUrl);
        } catch {
          // Non-fatal cleanup
        }
      }

      await tx.$queryRawUnsafe(
        `UPDATE ${employees}
         SET name = COALESCE($2, name),
             phone = COALESCE($3, phone),
             email = COALESCE($4, email),
             designation = COALESCE($5, designation),
             branch_id = COALESCE($6::uuid, branch_id),
             user_id = COALESCE($7::uuid, user_id),
             basic_salary = COALESCE($8::numeric, basic_salary),
             commission_rate = COALESCE($9::numeric, commission_rate),
             epf_enabled = COALESCE($10::boolean, epf_enabled),
             etf_enabled = COALESCE($11::boolean, etf_enabled),
             max_advance_percentage = COALESCE($12::numeric, max_advance_percentage),
             photo_url = CASE WHEN $13::boolean THEN $14 ELSE photo_url END,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.name ?? null,
        dto.phone ?? null,
        dto.email ?? null,
        dto.designation ?? null,
        dto.branchId ?? null,
        linkedUserId,
        dto.basicSalary ?? null,
        dto.commissionRate ?? null,
        dto.epfEnabled ?? null,
        dto.etfEnabled ?? null,
        dto.maxAdvancePercentage ?? null,
        dto.photoUrl !== undefined,
        dto.photoUrl ? dto.photoUrl : null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'EMPLOYEE_UPDATE',
        entityType: 'employee',
        entityId: id,
        details: dto as Record<string, unknown>,
      });
    });

    return this.findById(schemaName, id);
  }

  async updateStatus(
    schemaName: string,
    id: string,
    dto: UpdateEmployeeStatusDto,
    userId: string,
  ): Promise<EmployeeRecord> {
    const employees = tenantTable(schemaName, 'employees');
    const employeeStatusType = tenantType(schemaName, 'employee_status');
    const emp = await this.findById(schemaName, id);

    if (dto.status !== 'ACTIVE') {
      const isOwner =
        emp.systemRoles?.includes('SALON_ADMIN') ||
        emp.designation?.toLowerCase() === 'owner';
      if (isOwner) {
        throw new BadRequestException('The salon owner account cannot be deactivated.');
      }
    }

    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${employees} SET status = $2::text::${employeeStatusType}, updated_at = NOW() WHERE id = $1::uuid`,
        id,
        dto.status,
      );

      if (emp.userId) {
        const usersTable = tenantTable(schemaName, 'users');
        const refreshTokensTable = tenantTable(schemaName, 'refresh_tokens');
        const newUserStatus = dto.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
        await tx.$queryRawUnsafe(
          `UPDATE ${usersTable}
           SET status = $2::user_status, token_version = token_version + 1, updated_at = NOW()
           WHERE id = $1::uuid`,
          emp.userId,
          newUserStatus,
        );

        if (dto.status !== 'ACTIVE') {
          await tx.$queryRawUnsafe(
            `UPDATE ${refreshTokensTable}
             SET revoked_at = NOW()
             WHERE user_id = $1::uuid AND revoked_at IS NULL`,
            emp.userId,
          );
        }
      }

      await logAudit(tx, schemaName, {
        userId,
        action: 'EMPLOYEE_STATUS_UPDATE',
        entityType: 'employee',
        entityId: id,
        details: { status: dto.status },
      });
    });

    return this.findById(schemaName, id);
  }

  async deleteEmployee(
    schemaName: string,
    id: string,
    userId: string,
  ): Promise<{ id: string; success: boolean }> {
    const employees = tenantTable(schemaName, 'employees');
    const saleEmployees = tenantTable(schemaName, 'sale_employees');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const appointments = tenantTable(schemaName, 'appointments');
    const payrollItems = tenantTable(schemaName, 'payroll_items');
    const payrollAdvances = tenantTable(schemaName, 'payroll_advances');
    const userRoles = tenantTable(schemaName, 'user_roles');
    const users = tenantTable(schemaName, 'users');

    const emp = await this.findById(schemaName, id);
    const isOwner =
      emp.systemRoles?.includes('SALON_ADMIN') ||
      emp.designation?.toLowerCase() === 'owner';
    if (isOwner) {
      throw new BadRequestException('The salon owner account cannot be deleted.');
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      // Check sales
      const saleCountRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT (
          (SELECT COUNT(*)::bigint FROM ${saleEmployees} WHERE employee_id = $1::uuid) +
          (SELECT COUNT(*)::bigint FROM ${saleItemEmployees} WHERE employee_id = $1::uuid)
        ) AS count`,
        id,
      );
      if (Number(saleCountRows[0]?.count ?? 0) > 0) {
        throw new BadRequestException(
          'Cannot delete this employee because they have recorded sales transactions. You can deactivate them instead.',
        );
      }

      // Check appointments
      const appointmentRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${appointments} WHERE employee_id = $1::uuid`,
        id,
      );
      if (Number(appointmentRows[0]?.count ?? 0) > 0) {
        throw new BadRequestException(
          'Cannot delete this employee because they are assigned to appointments. You can deactivate them instead.',
        );
      }

      // Check payroll
      const payrollRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT (
          (SELECT COUNT(*)::bigint FROM ${payrollItems} WHERE employee_id = $1::uuid) +
          (SELECT COUNT(*)::bigint FROM ${payrollAdvances} WHERE employee_id = $1::uuid)
        ) AS count`,
        id,
      );
      if (Number(payrollRows[0]?.count ?? 0) > 0) {
        throw new BadRequestException(
          'Cannot delete this employee because they have recorded payroll or advance records. You can deactivate them instead.',
        );
      }

      // If employee has a dedicated login user account, remove user role and user
      if (emp.userId) {
        await tx.$queryRawUnsafe(`DELETE FROM ${userRoles} WHERE user_id = $1::uuid`, emp.userId);
        await tx.$queryRawUnsafe(`DELETE FROM ${users} WHERE id = $1::uuid`, emp.userId);
      }

      await tx.$queryRawUnsafe(`DELETE FROM ${employees} WHERE id = $1::uuid`, id);

      if (emp.photoUrl) {
        try {
          await this.storageService.deleteFile(emp.photoUrl);
        } catch {
          // Non-fatal cleanup
        }
      }

      await logAudit(tx, schemaName, {
        userId,
        action: 'EMPLOYEE_DELETE',
        entityType: 'employee',
        entityId: id,
        details: { name: emp.name, code: emp.code },
      });

      return { id, success: true };
    });
  }

  /**
   * Returns active POS performers. For single-owner salons with no staff records,
   * auto-links or creates an employee profile for the logged-in admin.
   */
  async listPosPerformers(
    schemaName: string,
    user: { id: string; name: string; email: string },
    branchId?: string,
  ): Promise<{ performers: EmployeeRecord[]; autoProvisioned: boolean }> {
    const employees = tenantTable(schemaName, 'employees');
    const branches = tenantTable(schemaName, 'branches');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const active = (await tx.$queryRawUnsafe(
        `${this.employeeSelectSql(employees, branches, schemaName)}
         WHERE e.status = 'ACTIVE'
           ${branchId ? 'AND e.branch_id = $1::uuid' : ''}
         ORDER BY e.name ASC`,
        ...(branchId ? [branchId] : []),
      )) as EmployeeRecord[];

      if (active.length > 0) {
        return { performers: active, autoProvisioned: false };
      }

      const linked = (await tx.$queryRawUnsafe(
        `${this.employeeSelectSql(employees, branches, schemaName)} WHERE e.user_id = $1::uuid LIMIT 1`,
        user.id,
      )) as EmployeeRecord[];

      if (linked.length > 0) {
        await tx.$queryRawUnsafe(
          `UPDATE ${employees} SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1::uuid`,
          linked[0].id,
        );
        const reactivated = await this.fetchEmployeeByIdTx(tx, schemaName, linked[0].id);
        return { performers: reactivated ? [reactivated] : [], autoProvisioned: true };
      }

      let branchRows = branchId
        ? ((await tx.$queryRawUnsafe(
            `SELECT id FROM ${branches} WHERE id = $1::uuid LIMIT 1`,
            branchId,
          )) as Array<{ id: string }>)
        : [];

      if (branchRows.length === 0) {
        branchRows = (await tx.$queryRawUnsafe(
          `SELECT id FROM ${branches} WHERE status = 'ACTIVE' ORDER BY created_at ASC LIMIT 1`,
        )) as Array<{ id: string }>;
      }

      if (branchRows.length === 0) {
        branchRows = (await tx.$queryRawUnsafe(
          `SELECT id FROM ${branches} ORDER BY created_at ASC LIMIT 1`,
        )) as Array<{ id: string }>;
      }

      if (branchRows.length === 0) {
        throw new BadRequestException('Create a branch before selling services.');
      }

      const code = await generateSequentialCode(tx, employees, 'EMP-');
      const rows = (await tx.$queryRawUnsafe(
        `INSERT INTO ${employees}
           (branch_id, user_id, code, name, email, designation, status, basic_salary, epf_enabled, etf_enabled)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, 'Owner', 'ACTIVE', 0, true, true)
         RETURNING id`,
        branchRows[0].id,
        user.id,
        code,
        user.name,
        user.email,
      )) as Array<{ id: string }>;

      await logAudit(tx, schemaName, {
        userId: user.id,
        action: 'EMPLOYEE_AUTO_PROVISION',
        entityType: 'employee',
        entityId: rows[0].id,
        details: { reason: 'pos_single_owner', name: user.name },
      });

      const created = await this.fetchEmployeeByIdTx(tx, schemaName, rows[0].id);
      return { performers: created ? [created] : [], autoProvisioned: true };
    });
  }

  // =========================================================================
  // EMPLOYEE PERFORMANCE ANALYTICS
  // =========================================================================

  private resolvePerformanceRange(query: { from?: string; to?: string; preset?: string }) {
    const today = new Date().toISOString().slice(0, 10);
    const preset = (query.preset ?? 'this_month').toLowerCase();

    if (query.from && query.to) {
      return { from: query.from.slice(0, 10), to: query.to.slice(0, 10) };
    }

    if (preset === 'today') {
      return { from: today, to: today };
    }
    if (preset === 'last_7_days' || preset === '7d' || preset === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { from: d.toISOString().slice(0, 10), to: today };
    }
    if (preset === 'last_30_days' || preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return { from: d.toISOString().slice(0, 10), to: today };
    }
    if (preset === 'last_month') {
      const d = new Date();
      const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const end = new Date(d.getFullYear(), d.getMonth(), 0);
      return {
        from: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`,
        to: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
      };
    }
    if (preset === 'all_time' || preset === 'all') {
      return { from: '2000-01-01', to: today };
    }

    // Default: this month
    const d = new Date();
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    return { from: start, to: today };
  }

  async getPerformance(
    schemaName: string,
    query: {
      from?: string;
      to?: string;
      preset?: string;
      branchId?: string;
      search?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'RESIGNED';
      sortBy?: 'name' | 'servicesDone' | 'salesGenerated' | 'customersServed';
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ) {
    const range = this.resolvePerformanceRange(query);
    const employees = tenantTable(schemaName, 'employees');
    const branches = tenantTable(schemaName, 'branches');
    const sales = tenantTable(schemaName, 'sales');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const services = tenantTable(schemaName, 'services');
    const userRolesTable = tenantTable(schemaName, 'user_roles');
    const rolesTable = tenantTable(schemaName, 'roles');
    const { page, limit, offset } = resolvePagination(query.page, query.limit ?? 20);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const empConditions: string[] = ['1=1'];
      const empParams: unknown[] = [];
      let idx = 1;

      if (query.branchId) {
        empConditions.push(`e.branch_id = $${idx++}::uuid`);
        empParams.push(query.branchId);
      }
      if (query.status) {
        empConditions.push(`e.status::text = $${idx++}`);
        empParams.push(query.status);
      }
      if (query.search?.trim()) {
        empConditions.push(
          `(e.name ILIKE $${idx} OR e.code ILIKE $${idx} OR e.phone ILIKE $${idx} OR e.designation ILIKE $${idx})`,
        );
        empParams.push(`%${query.search.trim()}%`);
        idx++;
      }

      const empWhere = empConditions.join(' AND ');

      // Total employees matching filter
      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count
         FROM ${employees} e
         INNER JOIN ${branches} b ON b.id = e.branch_id
         WHERE ${empWhere}`,
        ...empParams,
      );
      const total = Number(countRows[0]?.count ?? 0);

      // Now query aggregated performance for all matching employees in date range
      const dateStartIdx = idx;
      const perfParams = [...empParams, range.from, range.to];
      idx += 2;

      let orderClause = 'e.name ASC';
      const dir = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
      if (query.sortBy === 'servicesDone') {
        orderClause = `COALESCE(p.services_done, 0) ${dir}, e.name ASC`;
      } else if (query.sortBy === 'salesGenerated') {
        orderClause = `COALESCE(p.sales_generated, 0) ${dir}, e.name ASC`;
      } else if (query.sortBy === 'customersServed') {
        orderClause = `COALESCE(p.customers_served, 0) ${dir}, e.name ASC`;
      } else if (query.sortBy === 'name') {
        orderClause = `e.name ${dir}`;
      }

      const rows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          code: string;
          name: string;
          phone: string | null;
          email: string | null;
          designation: string | null;
          branchId: string;
          branchName: string;
          status: string;
          systemRoles: string[];
          photoUrl: string | null;
          servicesDone: number;
          salesGenerated: number;
          customersServed: number;
          topServiceName: string | null;
          topServiceCount: number;
        }>
      >(
        `WITH emp_perf AS (
           SELECT
             sie.employee_id,
             COUNT(si.id)::int AS services_done,
             COALESCE(SUM(
               CASE
                 WHEN COALESCE(s.total, 0) <= 0 THEN 0
                 ELSE ROUND((si.total * GREATEST(0, s.total - COALESCE(s.refunded_amount, 0)) / s.total)::numeric, 2)
               END
             ), 0)::float AS sales_generated,
             COUNT(DISTINCT s.customer_id)::int AS customers_served
           FROM ${saleItemEmployees} sie
           INNER JOIN ${saleItems} si ON si.id = sie.sale_item_id AND si.item_type = 'service'
           INNER JOIN ${sales} s ON s.id = si.sale_id
           WHERE s.status::text = 'COMPLETED'
             AND s.created_at >= $${dateStartIdx}::date
             AND s.created_at < ($${dateStartIdx + 1}::date + INTERVAL '1 day')
             ${query.branchId ? `AND s.branch_id = '${query.branchId}'::uuid` : ''}
           GROUP BY sie.employee_id
         ),
         emp_service_ranks AS (
           SELECT
             sie.employee_id,
             COALESCE(svc.name, 'Service') AS service_name,
             COUNT(*)::int AS svc_count,
             COALESCE(SUM(si.total), 0)::float AS svc_revenue,
             ROW_NUMBER() OVER (
               PARTITION BY sie.employee_id
               ORDER BY COUNT(*) DESC, COALESCE(SUM(si.total), 0) DESC, COALESCE(svc.name, 'Service') ASC
             ) AS rank
           FROM ${saleItemEmployees} sie
           INNER JOIN ${saleItems} si ON si.id = sie.sale_item_id AND si.item_type = 'service'
           INNER JOIN ${sales} s ON s.id = si.sale_id
           LEFT JOIN ${services} svc ON svc.id = si.service_id
           WHERE s.status::text = 'COMPLETED'
             AND s.created_at >= $${dateStartIdx}::date
             AND s.created_at < ($${dateStartIdx + 1}::date + INTERVAL '1 day')
             ${query.branchId ? `AND s.branch_id = '${query.branchId}'::uuid` : ''}
           GROUP BY sie.employee_id, svc.name
         )
         SELECT
           e.id,
           e.code,
           e.name,
           e.phone,
           e.email,
           e.designation,
           e.branch_id AS "branchId",
           b.name AS "branchName",
           e.status::text AS status,
           COALESCE(
             (SELECT array_agg(r.code ORDER BY r.code)
              FROM ${userRolesTable} ur
              INNER JOIN ${rolesTable} r ON ur.role_id = r.id
              WHERE ur.user_id = e.user_id),
             ARRAY[]::text[]
           ) AS "systemRoles",
           e.photo_url AS "photoUrl",
           COALESCE(p.services_done, 0)::int AS "servicesDone",
           COALESCE(p.sales_generated, 0)::float AS "salesGenerated",
           COALESCE(p.customers_served, 0)::int AS "customersServed",
           esr.service_name AS "topServiceName",
           COALESCE(esr.svc_count, 0)::int AS "topServiceCount"
         FROM ${employees} e
         INNER JOIN ${branches} b ON b.id = e.branch_id
         LEFT JOIN emp_perf p ON p.employee_id = e.id
         LEFT JOIN emp_service_ranks esr ON esr.employee_id = e.id AND esr.rank = 1
         WHERE ${empWhere}
         ORDER BY ${orderClause}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...perfParams,
        limit,
        offset,
      );

      return {
        range,
        ...buildPaginatedResponse(rows, total, page, limit),
      };
    });
  }

  async getEmployeePerformanceDetail(
    schemaName: string,
    employeeId: string,
    query: {
      from?: string;
      to?: string;
      preset?: string;
      branchId?: string;
    },
  ) {
    const range = this.resolvePerformanceRange(query);
    const employees = tenantTable(schemaName, 'employees');
    const branches = tenantTable(schemaName, 'branches');
    const sales = tenantTable(schemaName, 'sales');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const services = tenantTable(schemaName, 'services');
    const customers = tenantTable(schemaName, 'customers');
    const userRolesTable = tenantTable(schemaName, 'user_roles');
    const rolesTable = tenantTable(schemaName, 'roles');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const empRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          code: string;
          name: string;
          phone: string | null;
          email: string | null;
          designation: string | null;
          branchId: string;
          branchName: string;
          status: string;
          systemRoles: string[];
          photoUrl: string | null;
          commissionRate: number;
        }>
      >(
        `SELECT
           e.id,
           e.code,
           e.name,
           e.phone,
           e.email,
           e.designation,
           e.branch_id AS "branchId",
           b.name AS "branchName",
           e.status::text AS status,
           COALESCE(
             (SELECT array_agg(r.code ORDER BY r.code)
              FROM ${userRolesTable} ur
              INNER JOIN ${rolesTable} r ON ur.role_id = r.id
              WHERE ur.user_id = e.user_id),
             ARRAY[]::text[]
           ) AS "systemRoles",
           e.photo_url AS "photoUrl",
           COALESCE(e.commission_rate, 0)::float AS "commissionRate"
         FROM ${employees} e
         INNER JOIN ${branches} b ON b.id = e.branch_id
         WHERE e.id = $1::uuid
         LIMIT 1`,
        employeeId,
      );

      if (!empRows[0]) {
        throw new NotFoundException('Employee not found');
      }

      const emp = empRows[0];
      const params: unknown[] = [employeeId, range.from, range.to];
      let branchFilter = '';
      if (query.branchId) {
        branchFilter = `AND s.branch_id = $4::uuid`;
        params.push(query.branchId);
      }

      // 1. KPI summary
      const summaryRows = await tx.$queryRawUnsafe<
        Array<{
          servicesDone: number;
          salesGenerated: number;
          customersServed: number;
        }>
      >(
        `SELECT
           COUNT(si.id)::int AS "servicesDone",
           COALESCE(SUM(
             CASE
               WHEN COALESCE(s.total, 0) <= 0 THEN 0
               ELSE ROUND((si.total * GREATEST(0, s.total - COALESCE(s.refunded_amount, 0)) / s.total)::numeric, 2)
             END
           ), 0)::float AS "salesGenerated",
           COUNT(DISTINCT s.customer_id)::int AS "customersServed"
         FROM ${saleItemEmployees} sie
         INNER JOIN ${saleItems} si ON si.id = sie.sale_item_id AND si.item_type = 'service'
         INNER JOIN ${sales} s ON s.id = si.sale_id
         WHERE sie.employee_id = $1::uuid
           AND s.status::text = 'COMPLETED'
           AND s.created_at >= $2::date
           AND s.created_at < ($3::date + INTERVAL '1 day')
           ${branchFilter}`,
        ...params,
      );

      const servicesDone = Number(summaryRows[0]?.servicesDone ?? 0);
      const salesGenerated = Number(summaryRows[0]?.salesGenerated ?? 0);
      const customersServed = Number(summaryRows[0]?.customersServed ?? 0);
      const averageRevenuePerService =
        servicesDone > 0 ? Math.round((salesGenerated / servicesDone) * 100) / 100 : 0;

      // 2. Top Services (top 5 breakdown)
      const topServices = await tx.$queryRawUnsafe<
        Array<{
          serviceId: string | null;
          serviceName: string;
          count: number;
          revenue: number;
        }>
      >(
        `SELECT
           si.service_id AS "serviceId",
           COALESCE(svc.name, 'Service') AS "serviceName",
           COUNT(*)::int AS count,
           COALESCE(SUM(
             CASE
               WHEN COALESCE(s.total, 0) <= 0 THEN 0
               ELSE ROUND((si.total * GREATEST(0, s.total - COALESCE(s.refunded_amount, 0)) / s.total)::numeric, 2)
             END
           ), 0)::float AS revenue
         FROM ${saleItemEmployees} sie
         INNER JOIN ${saleItems} si ON si.id = sie.sale_item_id AND si.item_type = 'service'
         INNER JOIN ${sales} s ON s.id = si.sale_id
         LEFT JOIN ${services} svc ON svc.id = si.service_id
         WHERE sie.employee_id = $1::uuid
           AND s.status::text = 'COMPLETED'
           AND s.created_at >= $2::date
           AND s.created_at < ($3::date + INTERVAL '1 day')
           ${branchFilter}
         GROUP BY si.service_id, svc.name
         ORDER BY count DESC, revenue DESC, svc.name ASC
         LIMIT 5`,
        ...params,
      );

      // 3. Daily trend for charts/graphs
      const dailyTrend = await tx.$queryRawUnsafe<
        Array<{
          date: string;
          servicesCount: number;
          revenue: number;
        }>
      >(
        `SELECT
           s.created_at::date::text AS date,
           COUNT(si.id)::int AS "servicesCount",
           COALESCE(SUM(
             CASE
               WHEN COALESCE(s.total, 0) <= 0 THEN 0
               ELSE ROUND((si.total * GREATEST(0, s.total - COALESCE(s.refunded_amount, 0)) / s.total)::numeric, 2)
             END
           ), 0)::float AS revenue
         FROM ${saleItemEmployees} sie
         INNER JOIN ${saleItems} si ON si.id = sie.sale_item_id AND si.item_type = 'service'
         INNER JOIN ${sales} s ON s.id = si.sale_id
         WHERE sie.employee_id = $1::uuid
           AND s.status::text = 'COMPLETED'
           AND s.created_at >= $2::date
           AND s.created_at < ($3::date + INTERVAL '1 day')
           ${branchFilter}
         GROUP BY s.created_at::date
         ORDER BY s.created_at::date ASC`,
        ...params,
      );

      // 4. Recent completed services
      const recentServices = await tx.$queryRawUnsafe<
        Array<{
          saleId: string;
          saleNumber: string;
          serviceName: string;
          customerName: string;
          date: string;
          amount: number;
        }>
      >(
        `SELECT
           s.id AS "saleId",
           s.sale_number AS "saleNumber",
           COALESCE(svc.name, 'Service') AS "serviceName",
           COALESCE(c.name, 'Walk-in customer') AS "customerName",
           s.created_at::text AS date,
           (
             CASE
               WHEN COALESCE(s.total, 0) <= 0 THEN 0
               ELSE ROUND((si.total * GREATEST(0, s.total - COALESCE(s.refunded_amount, 0)) / s.total)::numeric, 2)
             END
           )::float AS amount
         FROM ${saleItemEmployees} sie
         INNER JOIN ${saleItems} si ON si.id = sie.sale_item_id AND si.item_type = 'service'
         INNER JOIN ${sales} s ON s.id = si.sale_id
         LEFT JOIN ${services} svc ON svc.id = si.service_id
         LEFT JOIN ${customers} c ON c.id = s.customer_id
         WHERE sie.employee_id = $1::uuid
           AND s.status::text = 'COMPLETED'
           AND s.created_at >= $2::date
           AND s.created_at < ($3::date + INTERVAL '1 day')
           ${branchFilter}
         ORDER BY s.created_at DESC
         LIMIT 10`,
        ...params,
      );

      return {
        employee: emp,
        range,
        kpis: {
          servicesDone,
          salesGenerated,
          customersServed,
          averageRevenuePerService,
          topService: topServices[0]?.serviceName ?? null,
        },
        topServices,
        dailyTrend,
        recentServices,
      };
    });
  }
}

