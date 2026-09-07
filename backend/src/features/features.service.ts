import { Injectable } from '@nestjs/common';
import { FeatureStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  findActiveFeatures() {
    return this.prisma.feature.findMany({
      where: { status: FeatureStatus.ACTIVE },
      select: {
        code: true,
        name: true,
        description: true,
      },
      orderBy: { code: 'asc' },
    });
  }
}
