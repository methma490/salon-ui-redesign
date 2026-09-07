import { BadRequestException } from '@nestjs/common';
import { Feature, FeatureStatus } from '@prisma/client';

export function normalizeFeatureCodes(codes: string[]): string[] {
  return [...new Set(codes.map((code) => code.toUpperCase()))];
}

export function validateFeatureRecords(requestedCodes: string[], features: Feature[]): Feature[] {
  if (features.length !== requestedCodes.length) {
    const foundCodes = new Set(features.map((feature) => feature.code));
    const invalidCodes = requestedCodes.filter((code) => !foundCodes.has(code));
    throw new BadRequestException(`Invalid feature code(s): ${invalidCodes.join(', ')}`);
  }

  const inactiveFeatures = features.filter((feature) => feature.status !== FeatureStatus.ACTIVE);

  if (inactiveFeatures.length > 0) {
    throw new BadRequestException(
      `Inactive feature code(s): ${inactiveFeatures.map((feature) => feature.code).join(', ')}`,
    );
  }

  return features;
}
