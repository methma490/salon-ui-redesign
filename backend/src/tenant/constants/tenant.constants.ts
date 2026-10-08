/** Matches legacy schema names such as tenant_000001 */
export const OLD_TENANT_SCHEMA_NAME_PATTERN = /^tenant_[0-9]{6}$/;

/** Matches new readable schema names such as tenant_studio_zee_000004 */
export const NEW_TENANT_SCHEMA_NAME_PATTERN =
  /^tenant_[a-z0-9]+(?:_[a-z0-9]+)*_[0-9]{6}$/;

/**
 * Matches either legacy (tenant_000001) or new readable (tenant_studio_zee_000004) format.
 * Strictly alphanumeric lowercase and underscores ending with a 6-digit tenant number.
 */
export const TENANT_SCHEMA_NAME_PATTERN =
  /^tenant_(?:[0-9]{6}|[a-z0-9]+(?:_[a-z0-9]+)*_[0-9]{6})$/;

export const MAX_POSTGRES_IDENTIFIER_LENGTH = 63;

export const REQUIRE_FEATURE_KEY = 'requireFeature';
export const REQUIRE_PERMISSION_KEY = 'requirePermission';

