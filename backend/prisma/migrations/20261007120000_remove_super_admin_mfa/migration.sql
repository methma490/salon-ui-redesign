DROP TABLE IF EXISTS "super_admin_mfa_recovery_codes";

ALTER TABLE "super_admin_users"
  DROP COLUMN IF EXISTS "mfa_enabled",
  DROP COLUMN IF EXISTS "mfa_secret",
  DROP COLUMN IF EXISTS "mfa_enrolled_at";
