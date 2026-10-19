-- AlterTable: super_admin_refresh_tokens
ALTER TABLE "super_admin_refresh_tokens" ADD COLUMN IF NOT EXISTS "familyId" UUID DEFAULT gen_random_uuid();
ALTER TABLE "super_admin_refresh_tokens" ADD COLUMN IF NOT EXISTS "absoluteExpiresAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "super_admin_refresh_tokens" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3);
ALTER TABLE "super_admin_refresh_tokens" ADD COLUMN IF NOT EXISTS "replacedByTokenId" UUID;

UPDATE "super_admin_refresh_tokens" SET "familyId" = "id" WHERE "familyId" IS NULL;
UPDATE "super_admin_refresh_tokens" SET "absoluteExpiresAt" = "expiresAt" WHERE "absoluteExpiresAt" <= "createdAt";

CREATE INDEX IF NOT EXISTS "super_admin_refresh_tokens_familyId_idx" ON "super_admin_refresh_tokens"("familyId");
