-- AlterTable super_admin_users
ALTER TABLE "super_admin_users"
ADD COLUMN IF NOT EXISTS "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "mfa_secret" TEXT,
ADD COLUMN IF NOT EXISTS "mfa_enrolled_at" TIMESTAMP(3);

-- CreateTable super_admin_mfa_recovery_codes
CREATE TABLE IF NOT EXISTS "super_admin_mfa_recovery_codes" (
    "id" UUID NOT NULL,
    "super_admin_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admin_mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "super_admin_mfa_recovery_codes_super_admin_id_idx" ON "super_admin_mfa_recovery_codes"("super_admin_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'super_admin_mfa_recovery_codes_super_admin_id_fkey'
  ) THEN
    ALTER TABLE "super_admin_mfa_recovery_codes"
    ADD CONSTRAINT "super_admin_mfa_recovery_codes_super_admin_id_fkey"
    FOREIGN KEY ("super_admin_id") REFERENCES "super_admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable super_admin_audit_logs
CREATE TABLE IF NOT EXISTS "super_admin_audit_logs" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "tenant_id" UUID,
    "old_value" JSONB,
    "new_value" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "super_admin_audit_logs_admin_user_id_idx" ON "super_admin_audit_logs"("admin_user_id");
CREATE INDEX IF NOT EXISTS "super_admin_audit_logs_action_idx" ON "super_admin_audit_logs"("action");
CREATE INDEX IF NOT EXISTS "super_admin_audit_logs_entity_type_idx" ON "super_admin_audit_logs"("entity_type");
CREATE INDEX IF NOT EXISTS "super_admin_audit_logs_tenant_id_idx" ON "super_admin_audit_logs"("tenant_id");
CREATE INDEX IF NOT EXISTS "super_admin_audit_logs_created_at_idx" ON "super_admin_audit_logs"("created_at");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'super_admin_audit_logs_admin_user_id_fkey'
  ) THEN
    ALTER TABLE "super_admin_audit_logs"
    ADD CONSTRAINT "super_admin_audit_logs_admin_user_id_fkey"
    FOREIGN KEY ("admin_user_id") REFERENCES "super_admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
