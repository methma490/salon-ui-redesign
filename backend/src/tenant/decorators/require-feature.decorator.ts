import { SetMetadata } from '@nestjs/common';
import { REQUIRE_FEATURE_KEY } from '../constants/tenant.constants';

export const RequireFeature = (...features: string[]) => SetMetadata(REQUIRE_FEATURE_KEY, features);
