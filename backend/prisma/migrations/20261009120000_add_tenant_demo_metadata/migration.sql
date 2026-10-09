-- AlterTable tenants for Demo Environment Metadata
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "is_demo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "demo_profile" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "last_demo_reset_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "demo_reset_in_progress" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "tenants_is_demo_idx" ON "tenants"("is_demo");
CREATE INDEX IF NOT EXISTS "tenants_demo_profile_idx" ON "tenants"("demo_profile");
