-- AlterTable
ALTER TABLE "super_admin_users" ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 1;
