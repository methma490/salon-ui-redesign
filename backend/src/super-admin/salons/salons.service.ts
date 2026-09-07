import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TenantProvisioningService } from '../../database/tenant-provisioning.service';
import { Feature, Prisma, Tenant, TenantStatus } from '@prisma/client';
import { CreateSalonDto } from './dto/create-salon.dto';
import { ListSalonsQueryDto } from './dto/list-salons-query.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { UpdateSalonFeaturesDto } from './dto/update-salon-features.dto';
import { UpdateSalonStatusDto } from './dto/update-salon-status.dto';
import { normalizeFeatureCodes, validateFeatureRecords } from './utils/feature-validation.util';

const TENANT_CODE_PREFIX = 'SAL';
const MAX_CODE_GENERATION_ATTEMPTS = 5;

type TenantWithRelations = Tenant & {
  tenantFeatures: Array<{
    isEnabled: boolean;
    feature: Feature;
  }>;
};

@Injectable()
export class SalonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: TenantProvisioningService,
  ) {}

  async findAll(query: ListSalonsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TenantWhereInput = {};

    if (query.status) {
      where.status = query.status as TenantStatus;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, salons] = await this.prisma.$transaction([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenantFeatures: {
            where: { isEnabled: true },
            include: { feature: true },
          },
        },
      }),
    ]);

    // For each salon, get main branch and admin from tenant schema
    const salonsWithDetails = await Promise.all(
      salons.map(async (salon) => {
        const mainBranch = await this.getMainBranch(salon.schemaName);
        return this.toListItem(salon, mainBranch);
      }),
    );

    return {
      data: salonsWithDetails,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findOne(salonId: string) {
    const salon = await this.prisma.tenant.findUnique({
      where: { id: salonId },
      include: {
        tenantFeatures: {
          where: { isEnabled: true },
          include: { feature: true },
          orderBy: { feature: { code: 'asc' } },
        },
      },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    const mainBranch = await this.getMainBranch(salon.schemaName);
    const admin = await this.getSalonAdmin(salon.schemaName);

    return this.toDetail(salon, mainBranch, admin);
  }

  async updateSalon(salonId: string, dto: UpdateSalonDto) {
    if (!dto.name && dto.email === undefined && dto.phone === undefined) {
      throw new BadRequestException('At least one field must be provided for update');
    }

    await this.findTenantOrThrow(salonId);

    const salon = await this.prisma.tenant.update({
      where: { id: salonId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      },
      include: {
        tenantFeatures: {
          where: { isEnabled: true },
          include: { feature: true },
        },
      },
    });

    const mainBranch = await this.getMainBranch(salon.schemaName);
    const admin = await this.getSalonAdmin(salon.schemaName);

    return this.toDetail(salon, mainBranch, admin);
  }

  async updateSalonStatus(salonId: string, dto: UpdateSalonStatusDto) {
    await this.findTenantOrThrow(salonId);

    const salon = await this.prisma.tenant.update({
      where: { id: salonId },
      data: { status: dto.status as TenantStatus },
      include: {
        tenantFeatures: {
          where: { isEnabled: true },
          include: { feature: true },
        },
      },
    });

    const mainBranch = await this.getMainBranch(salon.schemaName);
    const admin = await this.getSalonAdmin(salon.schemaName);

    return this.toDetail(salon, mainBranch, admin);
  }

  async updateSalonFeatures(salonId: string, dto: UpdateSalonFeaturesDto) {
    await this.findTenantOrThrow(salonId);

    const uniqueFeatures = normalizeFeatureCodes(dto.features);
    const features = await this.resolveActiveFeatures(uniqueFeatures);

    await this.prisma.$transaction(async (tx) => {
      const requestedFeatureIds = new Set(features.map((feature) => feature.id));

      for (const feature of features) {
        await tx.tenantFeature.upsert({
          where: {
            tenantId_featureId: {
              tenantId: salonId,
              featureId: feature.id,
            },
          },
          update: { isEnabled: true },
          create: {
            tenantId: salonId,
            featureId: feature.id,
            isEnabled: true,
          },
        });
      }

      await tx.tenantFeature.updateMany({
        where: {
          tenantId: salonId,
          featureId: { notIn: [...requestedFeatureIds] },
        },
        data: { isEnabled: false },
      });
    });

    return this.findOne(salonId);
  }

  async createSalon(dto: CreateSalonDto) {
    const adminEmail = dto.admin.email.toLowerCase();
    const uniqueFeatures = normalizeFeatureCodes(dto.features);

    // Validate features exist
    const features = await this.resolveActiveFeatures(uniqueFeatures);

    let tenant: Tenant | null = null;

    try {
      for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
        try {
          // 1. Create tenant record with PROVISIONING status
          const tenantCode = await this.generateTenantCode();
          const schemaName = await this.provisioning.generateSchemaName();

          tenant = await this.prisma.tenant.create({
            data: {
              code: tenantCode,
              schemaName,
              name: dto.name,
              email: dto.email,
              phone: dto.phone,
              status: TenantStatus.PROVISIONING,
            },
          });

          // 2. Provision the tenant schema
          const provisioningResult = await this.provisioning.provisionTenantSchema({
            tenantCode: tenant.code,
            schemaName: tenant.schemaName,
            mainBranchName: 'Main Branch',
            adminUser: {
              name: dto.admin.name,
              email: adminEmail,
              phone: dto.admin.phone,
              password: dto.admin.password,
            },
          });

          if (!provisioningResult.success) {
            throw new InternalServerErrorException(
              `Schema provisioning failed: ${provisioningResult.error}`,
            );
          }

          // 3. Assign features
          await this.prisma.tenantFeature.createMany({
            data: features.map((feature) => ({
              tenantId: tenant!.id,
              featureId: feature.id,
              isEnabled: true,
            })),
          });

          // 4. Update tenant status to ACTIVE
          tenant = await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: { status: TenantStatus.ACTIVE },
          });

          // Return salon details
          return {
            id: tenant.id,
            code: tenant.code,
            schemaName: tenant.schemaName,
            name: tenant.name,
            status: tenant.status,
            mainBranch: {
              id: provisioningResult.mainBranchId,
            },
            features: uniqueFeatures,
            admin: {
              id: provisioningResult.adminUserId,
              name: dto.admin.name,
              email: adminEmail,
              roles: ['SALON_ADMIN'],
            },
          };
        } catch (error) {
          // Handle unique constraint violations on tenant code
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002' &&
            attempt < MAX_CODE_GENERATION_ATTEMPTS - 1
          ) {
            continue;
          }

          throw error;
        }
      }

      throw new InternalServerErrorException('Unable to generate a unique tenant code');
    } catch (error) {
      // Mark tenant as PROVISION_FAILED if it was created
      if (tenant) {
        await this.prisma.tenant
          .update({
            where: { id: tenant.id },
            data: { status: TenantStatus.PROVISION_FAILED },
          })
          .catch(() => {
            // Ignore update errors
          });
      }

      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to create salon: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Get main branch from tenant schema
   */
  private async getMainBranch(schemaName: string) {
    try {
      await this.prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}"`);

      const result = await this.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          code: string;
          name: string;
          email: string | null;
          phone: string | null;
          status: string;
          is_main: boolean;
        }>
      >(`
        SELECT id, code, name, email, phone, status, is_main
        FROM branches
        WHERE is_main = true
        LIMIT 1
      `);

      await this.prisma.$executeRawUnsafe(`SET search_path TO public`);

      return result[0] || null;
    } catch {
      await this.prisma.$executeRawUnsafe(`SET search_path TO public`);
      return null;
    }
  }

  /**
   * Get salon admin user from tenant schema
   */
  private async getSalonAdmin(schemaName: string) {
    try {
      await this.prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}"`);

      const result = await this.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          name: string;
          email: string;
          phone: string | null;
          roles: string[];
        }>
      >(`
        SELECT u.id, u.name, u.email, u.phone, ARRAY_AGG(r.code) as roles
        FROM users u
        INNER JOIN user_roles ur ON u.id = ur.user_id
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE r.code = 'SALON_ADMIN'
        GROUP BY u.id, u.name, u.email, u.phone
        LIMIT 1
      `);

      await this.prisma.$executeRawUnsafe(`SET search_path TO public`);

      return result[0] || null;
    } catch {
      await this.prisma.$executeRawUnsafe(`SET search_path TO public`);
      return null;
    }
  }

  private async resolveActiveFeatures(codes: string[]) {
    const features = await this.prisma.feature.findMany({
      where: { code: { in: codes } },
    });

    return validateFeatureRecords(codes, features);
  }

  private async findTenantOrThrow(salonId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: salonId },
    });

    if (!tenant) {
      throw new NotFoundException('Salon not found');
    }

    return tenant;
  }

  private toListItem(
    salon: TenantWithRelations,
    mainBranch: { id: string; code: string; name: string } | null,
  ) {
    return {
      id: salon.id,
      code: salon.code,
      name: salon.name,
      email: salon.email,
      phone: salon.phone,
      status: salon.status,
      mainBranch: mainBranch
        ? {
            id: mainBranch.id,
            code: mainBranch.code,
            name: mainBranch.name,
          }
        : null,
      enabledFeatures: salon.tenantFeatures.map((tf) => tf.feature.code),
      createdAt: salon.createdAt,
    };
  }

  private toDetail(
    salon: TenantWithRelations,
    mainBranch: {
      id: string;
      code: string;
      name: string;
      email: string | null;
      phone: string | null;
      status: string;
      is_main: boolean;
    } | null,
    admin: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      roles: string[];
    } | null,
  ) {
    return {
      id: salon.id,
      code: salon.code,
      name: salon.name,
      email: salon.email,
      phone: salon.phone,
      status: salon.status,
      createdAt: salon.createdAt,
      updatedAt: salon.updatedAt,
      mainBranch: mainBranch
        ? {
            id: mainBranch.id,
            code: mainBranch.code,
            name: mainBranch.name,
            email: mainBranch.email,
            phone: mainBranch.phone,
            status: mainBranch.status,
            isMain: mainBranch.is_main,
          }
        : null,
      enabledFeatures: salon.tenantFeatures.map((tf) => ({
        code: tf.feature.code,
        name: tf.feature.name,
      })),
      admin: admin
        ? {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            roles: admin.roles,
          }
        : null,
    };
  }

  private async generateTenantCode(): Promise<string> {
    const latestTenant = await this.prisma.tenant.findFirst({
      where: {
        code: {
          startsWith: TENANT_CODE_PREFIX,
        },
      },
      orderBy: {
        code: 'desc',
      },
      select: {
        code: true,
      },
    });

    let nextNumber = 1;

    if (latestTenant) {
      const match = latestTenant.code.match(/^SAL(\d+)$/);
      if (match) {
        nextNumber = Number.parseInt(match[1], 10) + 1;
      }
    }

    return `${TENANT_CODE_PREFIX}${String(nextNumber).padStart(6, '0')}`;
  }
}
