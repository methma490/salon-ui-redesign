-- Tenant Schema Security P0 Remediation Migration
-- Version: 029
-- Description: Add token_version to users table and remediate platform reserved role collisions

-- 1. Add token_version to users table for server-side token invalidation
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS users_token_version_idx ON users (token_version);

-- 2. Safely rename any custom (non-system) roles that collide with platform reserved roles
UPDATE roles
SET code = 'TENANT_' || code
WHERE is_system = false
  AND UPPER(TRIM(REPLACE(REPLACE(code, '-', '_'), ' ', '_'))) IN (
    'SUPER_ADMIN',
    'PLATFORM_ADMIN',
    'SYSTEM_ADMIN',
    'SUPERUSER',
    'ADMINISTRATOR'
  );
