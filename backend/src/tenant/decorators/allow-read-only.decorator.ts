import { SetMetadata } from '@nestjs/common';

export const ALLOW_READ_ONLY_KEY = 'allowReadOnly';

/**
 * Decorator to explicitly exempt a route or controller from subscription write restrictions.
 * Typically used on billing, renewal, and public/administrative endpoints that must remain accessible
 * when a salon subscription is suspended or read-only.
 */
export const AllowReadOnly = () => SetMetadata(ALLOW_READ_ONLY_KEY, true);
