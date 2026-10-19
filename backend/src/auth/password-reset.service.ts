import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordResetAccountType, SuperAdminStatus, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { TenantSchemaService } from '../tenant/services/tenant-schema.service';
import { tenantTable } from '../tenant/utils/schema-name.util';
import { LoginSecurityService } from './login-security.service';
import type { AuthPortal } from './dto/forgot-password.dto';
import { generatePasswordResetToken, hashToken } from './utils/token.util';

type ResetAccount = {
  email: string;
  accountType: PasswordResetAccountType;
  superAdminId?: string;
  tenantId?: string;
  tenantUserId?: string;
  tenantSchema?: string;
  portalLabel: string;
  resetPath: string;
};

@Injectable()
export class PasswordResetService {
  private readonly tokenTtlMs = 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly loginSecurityService: LoginSecurityService,
  ) {}

  async requestReset(
    email: string,
    portal: AuthPortal = 'salon',
    ipAddress?: string,
    salonCode?: string,
  ): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    this.loginSecurityService.assertNotLocked(normalizedEmail, ipAddress);
    const account = await this.resolveAccount(normalizedEmail, portal, salonCode);

    if (account) {
      await this.prisma.passwordResetToken.updateMany({
        where: {
          email: normalizedEmail,
          accountType: account.accountType,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      const rawToken = generatePasswordResetToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + this.tokenTtlMs);

      await this.prisma.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          tokenHash,
          accountType: account.accountType,
          superAdminId: account.superAdminId,
          tenantId: account.tenantId,
          tenantUserId: account.tenantUserId,
          tenantSchema: account.tenantSchema,
          expiresAt,
        },
      });

      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
      const resetUrl = `${frontendUrl}${account.resetPath}?token=${rawToken}`;

      await this.mailService.sendPasswordResetEmail({
        to: normalizedEmail,
        resetUrl,
        portalLabel: account.portalLabel,
      });
    }

    return {
      message: 'If an account exists for this email, password reset instructions have been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<{ message: string }> {
    const tokenHash = hashToken(token.trim());
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      this.loginSecurityService.recordFailedAttempt('reset-token-abuse', ipAddress, 'reset-password-invalid-token');
      throw new UnauthorizedException('Invalid or expired reset link');
    }

    this.loginSecurityService.recordSuccessfulLogin(record.email, ipAddress);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    if (record.accountType === PasswordResetAccountType.SUPER_ADMIN) {
      if (!record.superAdminId) {
        throw new BadRequestException('Invalid reset token');
      }

      await this.prisma.superAdminUser.update({
        where: { id: record.superAdminId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      });

      // Revoke all existing super admin refresh token sessions
      await this.prisma.superAdminRefreshToken.updateMany({
        where: {
          userId: record.superAdminId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    } else {
      if (!record.tenantSchema || !record.tenantUserId || !record.tenantId) {
        throw new BadRequestException('Invalid reset token');
      }

      // Verify tenant still exists, active, and matches recorded schema
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: record.tenantId },
        select: { id: true, schemaName: true, status: true },
      });

      if (!tenant || tenant.schemaName !== record.tenantSchema || tenant.status !== TenantStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid or expired reset link');
      }

      const usersTable = tenantTable(record.tenantSchema, 'users');
      const refreshTable = tenantTable(record.tenantSchema, 'refresh_tokens');

      await this.tenantSchemaService.withTenantSchema(record.tenantSchema, async ({ tx }) => {
        await tx.$queryRawUnsafe(
          `UPDATE ${usersTable}
           SET password_hash = $1, token_version = token_version + 1, updated_at = NOW()
           WHERE id = $2::uuid`,
          passwordHash,
          record.tenantUserId,
        );

        // Revoke all existing active refresh tokens across devices
        await tx.$queryRawUnsafe(
          `UPDATE ${refreshTable}
           SET revoked_at = NOW()
           WHERE user_id = $1::uuid AND revoked_at IS NULL`,
          record.tenantUserId,
        );
      });
    }

    await this.prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    await this.prisma.passwordResetToken.updateMany({
      where: {
        email: record.email,
        accountType: record.accountType,
        usedAt: null,
        id: { not: record.id },
      },
      data: { usedAt: new Date() },
    });

    const isSuperAdmin = record.accountType === PasswordResetAccountType.SUPER_ADMIN;
    const portalLabel = isSuperAdmin ? 'Super Admin' : 'Salon Admin';
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const loginUrl = `${frontendUrl}${isSuperAdmin ? '/super-admin/login' : '/salon/login'}`;

    try {
      await this.mailService.sendPasswordResetSuccessEmail({
        to: record.email,
        portalLabel,
        loginUrl,
      });
    } catch {
      // Non-fatal notification delivery
    }

    return { message: 'Password updated successfully. You can sign in now.' };
  }

  private async resolveAccount(
    email: string,
    portal: AuthPortal,
    salonCode?: string,
  ): Promise<ResetAccount | null> {
    if (portal === 'super-admin') {
      const superAdmin = await this.prisma.superAdminUser.findUnique({
        where: { email },
      });

      if (!superAdmin || superAdmin.status !== SuperAdminStatus.ACTIVE) {
        return null;
      }

      return {
        email,
        accountType: PasswordResetAccountType.SUPER_ADMIN,
        superAdminId: superAdmin.id,
        portalLabel: 'Super Admin',
        resetPath: '/super-admin/reset-password',
      };
    }

    // Explicit tenant resolution when salonCode is provided
    if (salonCode?.trim()) {
      const normalizedCode = salonCode.trim().toUpperCase();
      const tenant = await this.prisma.tenant.findUnique({
        where: { code: normalizedCode },
        select: { id: true, schemaName: true, status: true },
      });

      if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
        return null;
      }

      const usersTable = tenantTable(tenant.schemaName, 'users');
      const users = await this.tenantSchemaService.withTenantSchema(
        tenant.schemaName,
        async ({ tx }) =>
          tx.$queryRawUnsafe<Array<{ id: string; email: string }>>(
            `SELECT id, email FROM ${usersTable}
             WHERE LOWER(email) = LOWER($1) AND status = 'ACTIVE'
             LIMIT 1`,
            email,
          ),
      );

      if (users.length > 0) {
        return {
          email,
          accountType: PasswordResetAccountType.TENANT_USER,
          tenantId: tenant.id,
          tenantUserId: users[0].id,
          tenantSchema: tenant.schemaName,
          portalLabel: 'Salon Admin',
          resetPath: '/salon/reset-password',
        };
      }

      return null;
    }

    // Email-only lookup across active tenants
    const tenants = await this.prisma.tenant.findMany({
      where: { status: TenantStatus.ACTIVE },
      select: { id: true, schemaName: true, code: true },
    });

    const matchingAccounts: ResetAccount[] = [];

    for (const tenant of tenants) {
      const usersTable = tenantTable(tenant.schemaName, 'users');
      const users = await this.tenantSchemaService.withTenantSchema(
        tenant.schemaName,
        async ({ tx }) =>
          tx.$queryRawUnsafe<Array<{ id: string; email: string }>>(
            `SELECT id, email FROM ${usersTable}
             WHERE LOWER(email) = LOWER($1) AND status = 'ACTIVE'
             LIMIT 1`,
            email,
          ),
      );

      if (users.length > 0) {
        matchingAccounts.push({
          email,
          accountType: PasswordResetAccountType.TENANT_USER,
          tenantId: tenant.id,
          tenantUserId: users[0].id,
          tenantSchema: tenant.schemaName,
          portalLabel: 'Salon Admin',
          resetPath: '/salon/reset-password',
        });
      }
    }

    if (matchingAccounts.length === 0) {
      return null;
    }

    if (matchingAccounts.length > 1) {
      throw new ConflictException({
        code: 'AMBIGUOUS_TENANT_RESET',
        message:
          'Multiple salon accounts found for this email. Please provide your salon code to reset your password.',
      });
    }

    return matchingAccounts[0];
  }
}
