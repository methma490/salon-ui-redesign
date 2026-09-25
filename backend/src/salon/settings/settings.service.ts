import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { FeatureStatus, SubscriptionStatus } from '@prisma/client';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { syncTenantFeatures } from '../../database/sync-tenant-features.util';
import { PrismaService } from '../../database/prisma.service';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { MailService } from '../../mail/mail.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import {
  filterPermissionsByFeatures,
  isReservedRoleCode,
  moduleAccessToPermissionCodes,
  permissionCodesToModuleAccess,
  ROLE_MANAGEMENT_FEATURE,
  roleEligibleForPlan,
  slugifyRoleCode,
} from '../utils/permission-feature.util';
import {
  ChangePasswordDto,
  ChangeSubscriptionPlanDto,
  CreateRoleDto,
  UpdateAccountSettingsDto,
  UpdateAppearanceSettingsDto,
  UpdateSalonSettingsDto,
  UpdateRolePermissionsDto,
  UpdateUserAccessDto,
  UpdateUserRolesDto,
} from './dto/settings.dto';
import {
  DEFAULT_PRIMARY_COLOR,
  normalizeHexColor,
  resolvePrimaryColor,
} from './appearance.util';

const ALLOWED_LOGO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly mailService: MailService,
  ) {}

  async getSettings(tenantId: string, schemaName: string, userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        phone: true,
        logoUrl: true,
        primaryColor: true,
        status: true,
        createdAt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Salon not found');
    }

    const account = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const usersTable = tenantTable(schemaName, 'users');
      const userRolesTable = tenantTable(schemaName, 'user_roles');
      const rolesTable = tenantTable(schemaName, 'roles');

      const users = await tx.$queryRawUnsafe<
        Array<{ id: string; name: string; email: string; phone: string | null }>
      >(`SELECT id, name, email, phone FROM ${usersTable} WHERE id = $1::uuid LIMIT 1`, userId);

      if (users.length === 0) {
        return null;
      }

      const roles = await tx.$queryRawUnsafe<Array<{ code: string; name: string }>>(
        `SELECT r.code, r.name FROM ${userRolesTable} ur
         INNER JOIN ${rolesTable} r ON ur.role_id = r.id
         WHERE ur.user_id = $1::uuid
         ORDER BY r.code ASC`,
        userId,
      );

      return {
        ...users[0],
        roles,
      };
    });

    if (!account) {
      throw new NotFoundException('User not found');
    }

    const subscriptionContext =
      await this.subscriptionsService.getTenantSubscriptionContext(tenantId);

    const featureRecords = subscriptionContext.features.length
      ? await this.prisma.feature.findMany({
          where: { code: { in: subscriptionContext.features } },
          select: { code: true, name: true, description: true },
          orderBy: { code: 'asc' },
        })
      : [];

    const featureMap = new Map(featureRecords.map((f) => [f.code, f]));

    const logoThumbnailUrl = tenant.logoUrl ? `/uploads/tenants/${tenantId}_thumb.webp` : null;

    return {
      salon: {
        ...tenant,
        primaryColor: resolvePrimaryColor(tenant.primaryColor),
        logoThumbnailUrl,
      },
      account,
      subscription: subscriptionContext.subscription,
      features: subscriptionContext.features.map((code) => {
        const feature = featureMap.get(code);
        return {
          code,
          name: feature?.name ?? code,
          description: feature?.description ?? null,
        };
      }),
    };
  }

  async updateSalon(tenantId: string, dto: UpdateSalonSettingsDto, roles: string[]) {
    if (!roles.includes('SALON_ADMIN')) {
      throw new ForbiddenException('Only salon admins can update business information');
    }

    if (!dto.name && dto.email === undefined && dto.phone === undefined) {
      throw new BadRequestException('At least one field must be provided for update');
    }

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        phone: true,
        logoUrl: true,
        primaryColor: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      ...tenant,
      primaryColor: resolvePrimaryColor(tenant.primaryColor),
    };
  }

  async getAppearance(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { primaryColor: true },
    });
    if (!tenant) {
      throw new NotFoundException('Salon not found');
    }
    return {
      primaryColor: resolvePrimaryColor(tenant.primaryColor),
      isDefault: !tenant.primaryColor,
      defaultPrimaryColor: DEFAULT_PRIMARY_COLOR,
    };
  }

  async updateAppearance(tenantId: string, dto: UpdateAppearanceSettingsDto, roles: string[]) {
    if (!roles.includes('SALON_ADMIN')) {
      throw new ForbiddenException('Only salon admins can update appearance settings');
    }

    const primaryColor = normalizeHexColor(dto.primaryColor);
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { primaryColor },
      select: { primaryColor: true },
    });

    return {
      primaryColor: resolvePrimaryColor(tenant.primaryColor),
      isDefault: tenant.primaryColor === DEFAULT_PRIMARY_COLOR,
      defaultPrimaryColor: DEFAULT_PRIMARY_COLOR,
    };
  }

  async resetAppearance(tenantId: string, roles: string[]) {
    if (!roles.includes('SALON_ADMIN')) {
      throw new ForbiddenException('Only salon admins can update appearance settings');
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { primaryColor: null },
      select: { id: true },
    });

    return {
      primaryColor: DEFAULT_PRIMARY_COLOR,
      isDefault: true,
      defaultPrimaryColor: DEFAULT_PRIMARY_COLOR,
    };
  }

  async updateAccount(schemaName: string, userId: string, dto: UpdateAccountSettingsDto) {
    const usersTable = tenantTable(schemaName, 'users');

    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `UPDATE ${usersTable}
         SET name = $2, updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id`,
        userId,
        dto.name.trim(),
      );

      if (rows.length === 0) {
        throw new NotFoundException('User not found');
      }
    });

    return { name: dto.name.trim() };
  }

  async changePassword(schemaName: string, userId: string, dto: ChangePasswordDto) {
    const usersTable = tenantTable(schemaName, 'users');
    let userEmail: string | undefined;

    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const users = await tx.$queryRawUnsafe<Array<{ email: string; password_hash: string | null }>>(
        `SELECT email, password_hash FROM ${usersTable} WHERE id = $1::uuid LIMIT 1`,
        userId,
      );

      if (users.length === 0 || !users[0].password_hash) {
        throw new NotFoundException('User not found');
      }

      userEmail = users[0].email;

      const valid = await bcrypt.compare(dto.currentPassword, users[0].password_hash);
      if (!valid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      const passwordHash = await bcrypt.hash(dto.newPassword, 12);
      await tx.$queryRawUnsafe(
        `UPDATE ${usersTable} SET password_hash = $2, updated_at = NOW() WHERE id = $1::uuid`,
        userId,
        passwordHash,
      );
    });

    if (userEmail) {
      try {
        await this.mailService.sendPasswordResetSuccessEmail({
          to: userEmail,
          portalLabel: 'Salon Admin',
        });
      } catch {
        // Non-fatal notification delivery
      }
    }

    return { message: 'Password updated successfully' };
  }

  async saveLogo(tenantId: string, roles: string[], file: Express.Multer.File | undefined) {
    if (!roles.includes('SALON_ADMIN')) {
      throw new ForbiddenException('Only salon admins can update the salon logo');
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Logo file is required');
    }

    const mime = (file.mimetype || '').toLowerCase();
    const ext = (file.originalname || '').split('.').pop()?.toLowerCase();
    const isAllowedMime = ALLOWED_LOGO_MIME.has(mime) || mime === 'image/x-webp';
    const isAllowedExt = ext ? ['webp', 'png', 'jpg', 'jpeg', 'gif'].includes(ext) : false;

    if (!isAllowedMime && !isAllowedExt) {
      throw new BadRequestException('Logo must be a WebP, JPEG, PNG, or GIF image');
    }

    if (file.size > MAX_LOGO_BYTES) {
      throw new BadRequestException('Logo must be 2MB or smaller');
    }

    const uploadsDir = join(process.cwd(), 'uploads', 'tenants');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `${tenantId}_${timestamp}.webp`;
    const thumbFilename = `${tenantId}_${timestamp}_thumb.webp`;
    const absolutePath = join(uploadsDir, filename);
    const thumbPath = join(uploadsDir, thumbFilename);

    try {
      await sharp(file.buffer)
        .rotate()
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(absolutePath);

      await sharp(file.buffer)
        .rotate()
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(thumbPath);
    } catch {
      throw new BadRequestException('Failed to process image file. Please provide a valid WebP, PNG, or JPEG image.');
    }

    // Clean up old logo file if exists
    try {
      const current = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { logoUrl: true },
      });
      if (current?.logoUrl) {
        const oldPath = join(process.cwd(), current.logoUrl.replace(/^\//, ''));
        if (existsSync(oldPath)) {
          unlinkSync(oldPath);
        }
        const oldThumbPath = oldPath.replace('.webp', '_thumb.webp');
        if (existsSync(oldThumbPath)) {
          unlinkSync(oldThumbPath);
        }
      }
    } catch {
      // Non-fatal cleanup
    }

    const logoUrl = `/uploads/tenants/${filename}`;
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        phone: true,
        logoUrl: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      ...tenant,
      logoThumbnailUrl: `/uploads/tenants/${thumbFilename}`,
    };
  }

  async removeLogo(tenantId: string, roles: string[]) {
    if (!roles.includes('SALON_ADMIN')) {
      throw new ForbiddenException('Only salon admins can remove the salon logo');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { logoUrl: true },
    });

    if (tenant?.logoUrl) {
      const absolutePath = join(process.cwd(), tenant.logoUrl.replace(/^\//, ''));
      if (existsSync(absolutePath)) {
        try {
          unlinkSync(absolutePath);
        } catch {}
      }
      const thumbPath = absolutePath.replace('.webp', '_thumb.webp');
      if (existsSync(thumbPath)) {
        try {
          unlinkSync(thumbPath);
        } catch {}
      }
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl: null },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        phone: true,
        logoUrl: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async changeSubscriptionPlan(tenantId: string, roles: string[], dto: ChangeSubscriptionPlanDto) {
    if (!roles.includes('SALON_ADMIN')) {
      throw new ForbiddenException('Only salon admins can change the subscription plan');
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: SubscriptionStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeSubscription) {
      if (activeSubscription.planId === dto.planId) {
        throw new BadRequestException('This plan is already active on your subscription');
      }

      const updated = await this.subscriptionsService.changePlan(
        activeSubscription.id,
        tenantId,
        dto.planId,
      );

      const featureIds = updated.subscriptionFeatures.map((sf) => sf.featureId);
      await this.prisma.$transaction(async (tx) => {
        await syncTenantFeatures(tx, tenantId, featureIds);
      });

      const featureRecords =
        featureIds.length > 0
          ? await this.prisma.feature.findMany({
              where: {
                id: { in: featureIds },
                status: FeatureStatus.ACTIVE,
              },
              select: { code: true, name: true },
              orderBy: { code: 'asc' },
            })
          : [];

      return {
        mode: 'changed' as const,
        subscription: {
          id: updated.id,
          plan: updated.plan.name,
          planCode: updated.plan.code,
          planId: updated.plan.id,
          status: updated.status,
          startDate: updated.startDate,
          endDate: updated.endDate,
          price: updated.price,
          currency: updated.currency,
        },
        features: featureRecords.map((feature) => ({
          code: feature.code,
          name: feature.name,
        })),
      };
    }

    const pending = await this.subscriptionsService.createSubscription(tenantId, dto.planId);

    return {
      mode: 'pending' as const,
      subscription: {
        id: pending.id,
        plan: pending.plan.name,
        planCode: pending.plan.code,
        planId: pending.plan.id,
        status: pending.status,
        startDate: pending.startDate,
        endDate: pending.endDate,
        price: pending.price,
        currency: pending.currency,
      },
      message:
        'A pending subscription was created for the selected plan. Complete payment to activate it.',
    };
  }

  async getAccessControl(tenantId: string, schemaName: string) {
    const subscriptionContext =
      await this.subscriptionsService.getTenantSubscriptionContext(tenantId);
    const enabledFeatures = subscriptionContext.features;

    const featureRecords = enabledFeatures.length
      ? await this.prisma.feature.findMany({
          where: { code: { in: enabledFeatures } },
          select: { code: true, name: true, description: true },
          orderBy: { code: 'asc' },
        })
      : [];
    const featureMap = new Map(featureRecords.map((feature) => [feature.code, feature]));

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const usersTable = tenantTable(schemaName, 'users');
      const rolesTable = tenantTable(schemaName, 'roles');
      const permissionsTable = tenantTable(schemaName, 'permissions');
      const userRolesTable = tenantTable(schemaName, 'user_roles');
      const userPermissionsTable = tenantTable(schemaName, 'user_permissions');
      const rolePermissionsTable = tenantTable(schemaName, 'role_permissions');

      const users = await tx.$queryRawUnsafe<
        Array<{ id: string; name: string; email: string; status: string }>
      >(
        `SELECT u.id, u.name, u.email, u.status::text AS status
         FROM ${usersTable} u
         ORDER BY u.name ASC`,
      );

      const userRoles = await tx.$queryRawUnsafe<
        Array<{ user_id: string; code: string; name: string }>
      >(
        `SELECT ur.user_id, r.code, r.name
         FROM ${userRolesTable} ur
         INNER JOIN ${rolesTable} r ON ur.role_id = r.id
         ORDER BY r.code ASC`,
      );

      const roles = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          code: string;
          name: string;
          description: string | null;
          isSystem: boolean;
        }>
      >(
        `SELECT id, code, name, description, COALESCE(is_system, false) AS "isSystem"
         FROM ${rolesTable}
         ORDER BY code ASC`,
      );

      const rolePermissions = await tx.$queryRawUnsafe<
        Array<{ role_code: string; permission_code: string; permission_name: string }>
      >(
        `SELECT r.code AS role_code, p.code AS permission_code, p.name AS permission_name
         FROM ${rolePermissionsTable} rp
         INNER JOIN ${rolesTable} r ON rp.role_id = r.id
         INNER JOIN ${permissionsTable} p ON rp.permission_id = p.id
         ORDER BY r.code ASC, p.code ASC`,
      );

      const userPermissionRows = await tx.$queryRawUnsafe<
        Array<{ user_id: string; permission_code: string }>
      >(
        `SELECT up.user_id, p.code AS permission_code
         FROM ${userPermissionsTable} up
         INNER JOIN ${permissionsTable} p ON up.permission_id = p.id
         ORDER BY up.user_id ASC, p.code ASC`,
      );

      const customPermissionsByUser = new Map<string, string[]>();
      for (const row of userPermissionRows) {
        const list = customPermissionsByUser.get(row.user_id) ?? [];
        list.push(row.permission_code);
        customPermissionsByUser.set(row.user_id, list);
      }

      const rolesByUser = new Map<string, Array<{ code: string; name: string }>>();
      for (const row of userRoles) {
        const list = rolesByUser.get(row.user_id) ?? [];
        list.push({ code: row.code, name: row.name });
        rolesByUser.set(row.user_id, list);
      }

      const permissionsByRole = new Map<string, Array<{ code: string; name: string }>>();
      for (const row of rolePermissions) {
        const list = permissionsByRole.get(row.role_code) ?? [];
        list.push({ code: row.permission_code, name: row.permission_name });
        permissionsByRole.set(row.role_code, list);
      }

      const permissionCodesByRole = new Map<string, string[]>();
      for (const [roleCode, permissions] of permissionsByRole.entries()) {
        permissionCodesByRole.set(
          roleCode,
          permissions.map((permission) => permission.code),
        );
      }

      const planRoles = roles
        .map((role) => ({
          ...role,
          permissions: filterPermissionsByFeatures(
            permissionsByRole.get(role.code) ?? [],
            enabledFeatures,
          ),
        }))
        .filter((role) =>
          roleEligibleForPlan(
            role.code,
            permissionCodesByRole.get(role.code) ?? [],
            enabledFeatures,
          ),
        );

      return {
        roleManagementEnabled: enabledFeatures.includes(ROLE_MANAGEMENT_FEATURE),
        enabledFeatures: enabledFeatures.map((code) => {
          const feature = featureMap.get(code);
          return {
            code,
            name: feature?.name ?? code,
            description: feature?.description ?? null,
          };
        }),
        users: users.map((user) => {
          const userRoleList = rolesByUser.get(user.id) ?? [];
          const hasCustomPermissions = customPermissionsByUser.has(user.id);
          let effectivePermissionCodes: string[];

          if (hasCustomPermissions) {
            effectivePermissionCodes = customPermissionsByUser.get(user.id) ?? [];
          } else {
            effectivePermissionCodes = userRoleList.flatMap(
              (role) => permissionCodesByRole.get(role.code) ?? [],
            );
            effectivePermissionCodes = [...new Set(effectivePermissionCodes)].sort();
          }

          return {
            ...user,
            roles: userRoleList,
            hasCustomPermissions,
            permissionCodes: effectivePermissionCodes,
            moduleAccess: permissionCodesToModuleAccess(effectivePermissionCodes, enabledFeatures),
          };
        }),
        roles: planRoles,
      };
    });
  }

  async createRole(tenantId: string, schemaName: string, actorRoles: string[], dto: CreateRoleDto) {
    if (!actorRoles.includes('SALON_ADMIN')) {
      throw new ForbiddenException('Only salon admins can create roles');
    }

    const subscriptionContext =
      await this.subscriptionsService.getTenantSubscriptionContext(tenantId);
    const enabledFeatures = subscriptionContext.features;

    if (!enabledFeatures.includes(ROLE_MANAGEMENT_FEATURE)) {
      throw new ForbiddenException('Role management is not included in your subscription plan');
    }

    const moduleAccessMap = Object.fromEntries(
      dto.moduleAccess.map((entry) => [entry.moduleCode, entry.level]),
    ) as Record<string, 'none' | 'view' | 'manage'>;

    const permissionCodes = moduleAccessToPermissionCodes(moduleAccessMap, enabledFeatures);

    if (permissionCodes.length === 0) {
      throw new BadRequestException('At least one feature permission must be granted');
    }

    let roleCode = (dto.code?.trim().toUpperCase() || slugifyRoleCode(dto.name)).slice(0, 50);

    if (isReservedRoleCode(roleCode)) {
      throw new BadRequestException('This role code is reserved');
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rolesTable = tenantTable(schemaName, 'roles');
      const permissionsTable = tenantTable(schemaName, 'permissions');
      const rolePermissionsTable = tenantTable(schemaName, 'role_permissions');

      const baseCode = roleCode;
      let suffix = 1;
      while (true) {
        const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM ${rolesTable} WHERE code = $1 LIMIT 1`,
          roleCode,
        );
        if (existing.length === 0) break;
        roleCode = `${baseCode}_${suffix++}`.slice(0, 50);
      }

      const inserted = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${rolesTable} (code, name, description, is_system)
         VALUES ($1, $2, $3, false)
         RETURNING id`,
        roleCode,
        dto.name.trim(),
        dto.description?.trim() ?? null,
      );

      for (const code of permissionCodes) {
        await tx.$queryRawUnsafe(
          `INSERT INTO ${rolePermissionsTable} (role_id, permission_id)
           SELECT $1::uuid, p.id FROM ${permissionsTable} p WHERE p.code = $2`,
          inserted[0].id,
          code,
        );
      }

      return {
        id: inserted[0].id,
        code: roleCode,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        isSystem: false,
        permissionCodes,
        moduleAccess: permissionCodesToModuleAccess(permissionCodes, enabledFeatures),
      };
    });
  }

  async deleteRole(tenantId: string, schemaName: string, roleCode: string, actorRoles: string[]) {
    if (!actorRoles.includes('SALON_ADMIN')) {
      throw new ForbiddenException('Only salon admins can delete roles');
    }

    const subscriptionContext =
      await this.subscriptionsService.getTenantSubscriptionContext(tenantId);

    if (!subscriptionContext.features.includes(ROLE_MANAGEMENT_FEATURE)) {
      throw new ForbiddenException('Role management is not included in your subscription plan');
    }

    const normalizedRoleCode = roleCode.trim().toUpperCase();

    if (isReservedRoleCode(normalizedRoleCode)) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rolesTable = tenantTable(schemaName, 'roles');
      const userRolesTable = tenantTable(schemaName, 'user_roles');

      const role = await tx.$queryRawUnsafe<Array<{ id: string; isSystem: boolean }>>(
        `SELECT id, COALESCE(is_system, false) AS "isSystem"
         FROM ${rolesTable} WHERE code = $1 LIMIT 1`,
        normalizedRoleCode,
      );

      if (role.length === 0) {
        throw new NotFoundException('Role not found');
      }

      if (role[0].isSystem) {
        throw new BadRequestException('System roles cannot be deleted');
      }

      const assigned = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${userRolesTable} WHERE role_id = $1::uuid`,
        role[0].id,
      );

      if (Number(assigned[0]?.count ?? 0) > 0) {
        throw new BadRequestException('Cannot delete a role that is assigned to users');
      }

      await tx.$queryRawUnsafe(`DELETE FROM ${rolesTable} WHERE id = $1::uuid`, role[0].id);

      return { roleCode: normalizedRoleCode, deleted: true };
    });
  }

  async updateRolePermissions(
    tenantId: string,
    schemaName: string,
    roleCode: string,
    actorRoles: string[],
    dto: UpdateRolePermissionsDto,
  ) {
    if (!actorRoles.includes('SALON_ADMIN')) {
      throw new ForbiddenException('Only salon admins can manage role permissions');
    }

    const subscriptionContext =
      await this.subscriptionsService.getTenantSubscriptionContext(tenantId);

    if (!subscriptionContext.features.includes(ROLE_MANAGEMENT_FEATURE)) {
      throw new ForbiddenException('Role management is not included in your subscription plan');
    }

    const normalizedRoleCode = roleCode.trim().toUpperCase();

    if (normalizedRoleCode === 'SALON_ADMIN') {
      throw new BadRequestException('Salon Admin role permissions cannot be modified');
    }

    const enabledFeatures = subscriptionContext.features;

    const moduleAccessMap = Object.fromEntries(
      dto.moduleAccess.map((entry) => [entry.moduleCode, entry.level]),
    ) as Record<string, 'none' | 'view' | 'manage'>;

    const permissionCodes = moduleAccessToPermissionCodes(moduleAccessMap, enabledFeatures);

    if (permissionCodes.length === 0) {
      throw new BadRequestException('At least one feature permission must be granted');
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rolesTable = tenantTable(schemaName, 'roles');
      const permissionsTable = tenantTable(schemaName, 'permissions');
      const rolePermissionsTable = tenantTable(schemaName, 'role_permissions');

      const role = await tx.$queryRawUnsafe<Array<{ id: string; code: string; name: string }>>(
        `SELECT id, code, name FROM ${rolesTable} WHERE code = $1 LIMIT 1`,
        normalizedRoleCode,
      );

      if (role.length === 0) {
        throw new NotFoundException('Role not found');
      }

      if (!roleEligibleForPlan(normalizedRoleCode, permissionCodes, enabledFeatures)) {
        throw new BadRequestException(
          'These permissions are not available on your current subscription plan',
        );
      }

      await tx.$queryRawUnsafe(
        `DELETE FROM ${rolePermissionsTable} WHERE role_id = $1::uuid`,
        role[0].id,
      );

      for (const code of permissionCodes) {
        await tx.$queryRawUnsafe(
          `INSERT INTO ${rolePermissionsTable} (role_id, permission_id)
           SELECT $1::uuid, p.id FROM ${permissionsTable} p WHERE p.code = $2`,
          role[0].id,
          code,
        );
      }

      const savedRows = await tx.$queryRawUnsafe<Array<{ code: string; name: string }>>(
        `SELECT p.code, p.name
         FROM ${rolePermissionsTable} rp
         INNER JOIN ${permissionsTable} p ON rp.permission_id = p.id
         WHERE rp.role_id = $1::uuid
         ORDER BY p.code ASC`,
        role[0].id,
      );

      return {
        roleCode: normalizedRoleCode,
        roleName: role[0].name,
        permissionCodes: savedRows.map((row) => row.code),
        permissions: filterPermissionsByFeatures(savedRows, enabledFeatures),
        moduleAccess: permissionCodesToModuleAccess(
          savedRows.map((row) => row.code),
          enabledFeatures,
        ),
      };
    });
  }

  async updateUserAccess(
    tenantId: string,
    schemaName: string,
    targetUserId: string,
    actorUserId: string,
    actorRoles: string[],
    dto: UpdateUserAccessDto,
  ) {
    if (!actorRoles.includes('SALON_ADMIN')) {
      throw new ForbiddenException('Only salon admins can manage user permissions');
    }

    const roleCode = dto.roleCode.trim().toUpperCase();
    const subscriptionContext =
      await this.subscriptionsService.getTenantSubscriptionContext(tenantId);
    const enabledFeatures = subscriptionContext.features;

    const moduleAccessMap = Object.fromEntries(
      dto.moduleAccess.map((entry) => [entry.moduleCode, entry.level]),
    ) as Record<string, 'none' | 'view' | 'manage'>;

    const permissionCodes = moduleAccessToPermissionCodes(moduleAccessMap, enabledFeatures);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const usersTable = tenantTable(schemaName, 'users');
      const rolesTable = tenantTable(schemaName, 'roles');
      const permissionsTable = tenantTable(schemaName, 'permissions');
      const userRolesTable = tenantTable(schemaName, 'user_roles');
      const userPermissionsTable = tenantTable(schemaName, 'user_permissions');
      const rolePermissionsTable = tenantTable(schemaName, 'role_permissions');

      const targetUser = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
        `SELECT id, status::text AS status FROM ${usersTable} WHERE id = $1::uuid LIMIT 1`,
        targetUserId,
      );

      if (targetUser.length === 0) {
        throw new NotFoundException('User not found');
      }

      if (targetUser[0].status !== 'ACTIVE') {
        throw new BadRequestException('Cannot update access for an inactive user');
      }

      const validRole = await tx.$queryRawUnsafe<Array<{ id: string; code: string }>>(
        `SELECT id, code FROM ${rolesTable} WHERE code = $1 LIMIT 1`,
        roleCode,
      );

      if (validRole.length === 0) {
        throw new BadRequestException('Selected role is invalid');
      }

      const rolePermissionRows = await tx.$queryRawUnsafe<Array<{ permission_code: string }>>(
        `SELECT p.code AS permission_code
         FROM ${rolePermissionsTable} rp
         INNER JOIN ${permissionsTable} p ON rp.permission_id = p.id
         INNER JOIN ${rolesTable} r ON rp.role_id = r.id
         WHERE r.code = $1`,
        roleCode,
      );

      const rolePermissionCodes = rolePermissionRows.map((row) => row.permission_code);

      if (!roleEligibleForPlan(roleCode, rolePermissionCodes, enabledFeatures)) {
        throw new BadRequestException(
          'Selected role is not available on your current subscription plan',
        );
      }

      const removingAdminFromSelf = targetUserId === actorUserId && roleCode !== 'SALON_ADMIN';

      if (removingAdminFromSelf) {
        const adminCount = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(DISTINCT ur.user_id)::bigint AS count
           FROM ${userRolesTable} ur
           INNER JOIN ${rolesTable} r ON ur.role_id = r.id
           WHERE r.code = 'SALON_ADMIN'`,
        );

        if (Number(adminCount[0]?.count ?? 0) <= 1) {
          throw new BadRequestException(
            'You cannot remove the last salon admin role from yourself',
          );
        }
      }

      await tx.$queryRawUnsafe(
        `DELETE FROM ${userRolesTable} WHERE user_id = $1::uuid`,
        targetUserId,
      );

      await tx.$queryRawUnsafe(
        `INSERT INTO ${userRolesTable} (user_id, role_id) VALUES ($1::uuid, $2::uuid)`,
        targetUserId,
        validRole[0].id,
      );

      await tx.$queryRawUnsafe(
        `DELETE FROM ${userPermissionsTable} WHERE user_id = $1::uuid`,
        targetUserId,
      );

      if (roleCode !== 'SALON_ADMIN') {
        if (permissionCodes.length === 0) {
          throw new BadRequestException('At least one feature permission must be granted');
        }

        for (const code of permissionCodes) {
          await tx.$queryRawUnsafe(
            `INSERT INTO ${userPermissionsTable} (user_id, permission_id)
             SELECT $1::uuid, p.id FROM ${permissionsTable} p WHERE p.code = $2
             ON CONFLICT DO NOTHING`,
            targetUserId,
            code,
          );
        }
      }

      const updatedRoles = await tx.$queryRawUnsafe<Array<{ code: string; name: string }>>(
        `SELECT r.code, r.name
         FROM ${userRolesTable} ur
         INNER JOIN ${rolesTable} r ON ur.role_id = r.id
         WHERE ur.user_id = $1::uuid
         ORDER BY r.code ASC`,
        targetUserId,
      );

      const savedPermissionRows = await tx.$queryRawUnsafe<Array<{ code: string }>>(
        `SELECT p.code
         FROM ${userPermissionsTable} up
         INNER JOIN ${permissionsTable} p ON up.permission_id = p.id
         WHERE up.user_id = $1::uuid
         ORDER BY p.code ASC`,
        targetUserId,
      );

      const finalPermissionCodes =
        roleCode === 'SALON_ADMIN'
          ? rolePermissionCodes
          : savedPermissionRows.map((row) => row.code);

      return {
        userId: targetUserId,
        roles: updatedRoles,
        roleCode,
        hasCustomPermissions: roleCode !== 'SALON_ADMIN' && savedPermissionRows.length > 0,
        permissionCodes: finalPermissionCodes,
        moduleAccess: permissionCodesToModuleAccess(finalPermissionCodes, enabledFeatures),
      };
    });
  }

  async updateUserRoles(
    tenantId: string,
    schemaName: string,
    targetUserId: string,
    actorUserId: string,
    actorRoles: string[],
    dto: UpdateUserRolesDto,
  ) {
    if (!actorRoles.includes('SALON_ADMIN')) {
      throw new ForbiddenException('Only salon admins can manage user permissions');
    }

    const uniqueRoleCodes = [...new Set(dto.roleCodes.map((code) => code.trim().toUpperCase()))];
    const subscriptionContext =
      await this.subscriptionsService.getTenantSubscriptionContext(tenantId);
    const enabledFeatures = subscriptionContext.features;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const usersTable = tenantTable(schemaName, 'users');
      const rolesTable = tenantTable(schemaName, 'roles');
      const permissionsTable = tenantTable(schemaName, 'permissions');
      const userRolesTable = tenantTable(schemaName, 'user_roles');
      const rolePermissionsTable = tenantTable(schemaName, 'role_permissions');

      const targetUser = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
        `SELECT id, status::text AS status FROM ${usersTable} WHERE id = $1::uuid LIMIT 1`,
        targetUserId,
      );

      if (targetUser.length === 0) {
        throw new NotFoundException('User not found');
      }

      if (targetUser[0].status !== 'ACTIVE') {
        throw new BadRequestException('Cannot update roles for an inactive user');
      }

      const validRoles = await tx.$queryRawUnsafe<Array<{ id: string; code: string }>>(
        `SELECT id, code FROM ${rolesTable} WHERE code = ANY($1::text[])`,
        uniqueRoleCodes,
      );

      if (validRoles.length !== uniqueRoleCodes.length) {
        throw new BadRequestException('One or more roles are invalid');
      }

      const rolePermissionRows = await tx.$queryRawUnsafe<
        Array<{ role_code: string; permission_code: string }>
      >(
        `SELECT r.code AS role_code, p.code AS permission_code
         FROM ${rolePermissionsTable} rp
         INNER JOIN ${rolesTable} r ON rp.role_id = r.id
         INNER JOIN ${permissionsTable} p ON rp.permission_id = p.id
         WHERE r.code = ANY($1::text[])`,
        uniqueRoleCodes,
      );

      const permissionCodesByRole = new Map<string, string[]>();
      for (const row of rolePermissionRows) {
        const list = permissionCodesByRole.get(row.role_code) ?? [];
        list.push(row.permission_code);
        permissionCodesByRole.set(row.role_code, list);
      }

      for (const role of validRoles) {
        if (
          !roleEligibleForPlan(
            role.code,
            permissionCodesByRole.get(role.code) ?? [],
            enabledFeatures,
          )
        ) {
          throw new BadRequestException(
            `Role ${role.code} is not available on your current subscription plan`,
          );
        }
      }

      const removingAdminFromSelf =
        targetUserId === actorUserId && !uniqueRoleCodes.includes('SALON_ADMIN');

      if (removingAdminFromSelf) {
        const adminCount = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(DISTINCT ur.user_id)::bigint AS count
           FROM ${userRolesTable} ur
           INNER JOIN ${rolesTable} r ON ur.role_id = r.id
           WHERE r.code = 'SALON_ADMIN'`,
        );

        if (Number(adminCount[0]?.count ?? 0) <= 1) {
          throw new BadRequestException(
            'You cannot remove the last salon admin role from yourself',
          );
        }
      }

      await tx.$queryRawUnsafe(
        `DELETE FROM ${userRolesTable} WHERE user_id = $1::uuid`,
        targetUserId,
      );

      for (const role of validRoles) {
        await tx.$queryRawUnsafe(
          `INSERT INTO ${userRolesTable} (user_id, role_id) VALUES ($1::uuid, $2::uuid)`,
          targetUserId,
          role.id,
        );
      }

      const updatedRoles = await tx.$queryRawUnsafe<Array<{ code: string; name: string }>>(
        `SELECT r.code, r.name
         FROM ${userRolesTable} ur
         INNER JOIN ${rolesTable} r ON ur.role_id = r.id
         WHERE ur.user_id = $1::uuid
         ORDER BY r.code ASC`,
        targetUserId,
      );

      return {
        userId: targetUserId,
        roles: updatedRoles,
      };
    });
  }

  private extFromMime(mime: string): string {
    switch (mime) {
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      default:
        return '.jpg';
    }
  }
}
