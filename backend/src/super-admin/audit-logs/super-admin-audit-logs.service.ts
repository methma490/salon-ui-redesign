import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface LogAuditEventParams {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  tenantId?: string | null;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface GetAuditLogsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  adminUserId?: string;
  tenantId?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'accesstoken',
  'refreshtoken',
  'mfasecret',
  'mfa_secret',
  'secret',
  'recoverycodes',
  'recovery_codes',
  'merchantsecret',
  'payheresecret',
  'hash',
  'authorization',
]);

@Injectable()
export class SuperAdminAuditLogsService {
  private readonly logger = new Logger(SuperAdminAuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sanitizes sensitive fields from state/metadata payloads before logging.
   */
  sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
        if (REDACTED_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret')) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Records an immutable platform audit log entry for Super Admin actions.
   */
  async logAction(params: LogAuditEventParams): Promise<void> {
    try {
      const sanitizedOld = params.oldValue ? this.sanitizeData(params.oldValue) : undefined;
      const sanitizedNew = params.newValue ? this.sanitizeData(params.newValue) : undefined;
      const sanitizedMeta = params.metadata ? this.sanitizeData(params.metadata) : undefined;

      await this.prisma.superAdminAuditLog.create({
        data: {
          adminUserId: params.adminUserId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          tenantId: params.tenantId ?? null,
          oldValue: sanitizedOld ? (sanitizedOld as Prisma.InputJsonValue) : Prisma.JsonNull,
          newValue: sanitizedNew ? (sanitizedNew as Prisma.InputJsonValue) : Prisma.JsonNull,
          metadata: sanitizedMeta ? (sanitizedMeta as Prisma.InputJsonValue) : Prisma.JsonNull,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write Super Admin audit log for action: ${params.action}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Retrieves paginated audit logs with multi-field filtering.
   */
  async getAuditLogs(query: GetAuditLogsQueryParams) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SuperAdminAuditLogWhereInput = {};

    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }

    if (query.entityType) {
      where.entityType = { equals: query.entityType, mode: 'insensitive' };
    }

    if (query.adminUserId) {
      where.adminUserId = query.adminUserId;
    }

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
        { adminUser: { email: { contains: query.search, mode: 'insensitive' } } },
        { adminUser: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.superAdminAuditLog.count({ where }),
      this.prisma.superAdminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
