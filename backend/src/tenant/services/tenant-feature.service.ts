import { Injectable } from '@nestjs/common';
import { FeatureStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantFeatureService {
  constructor(private readonly prisma: PrismaService) {}

  async tenantHasFeature(tenantId: string, featureCode: string): Promise<boolean> {
    const assignment = await this.prisma.tenantFeature.findFirst({
      where: {
        tenantId,
        isEnabled: true,
        feature: {
          code: featureCode,
          status: FeatureStatus.ACTIVE,
        },
      },
    });

    return !!assignment;
  }

  async getTenantFeatures(tenantId: string) {
    const assignments = await this.prisma.tenantFeature.findMany({
      where: { tenantId },
      include: {
        feature: {
          select: { code: true, name: true, status: true },
        },
      },
    });

    return assignments.map((a) => ({
      code: a.feature.code,
      name: a.feature.name,
      enabled: a.isEnabled && a.feature.status === FeatureStatus.ACTIVE,
    }));
  }
}
