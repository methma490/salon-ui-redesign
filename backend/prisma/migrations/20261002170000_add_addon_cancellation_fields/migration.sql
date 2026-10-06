-- AlterTable
ALTER TABLE "subscription_addons" ADD COLUMN "cancellation_effective_at" TIMESTAMP(3);
ALTER TABLE "subscription_addons" ADD COLUMN "cancel_reason" TEXT;
