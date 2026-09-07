import { SetMetadata } from '@nestjs/common';
import { REQUIRE_PERMISSION_KEY } from '../constants/tenant.constants';

export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissions);
