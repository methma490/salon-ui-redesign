-- CreateEnum
CREATE TYPE "SubscriptionReminderType" AS ENUM ('SEVEN_DAYS_BEFORE', 'THREE_DAYS_BEFORE', 'ONE_DAY_BEFORE', 'DUE_TODAY', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriptionReminderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'PARTIAL_FAILED', 'FAILED', 'SKIPPED');

-- DropIndex
DROP INDEX "subscriptions_pending_plan_id_idx";

-- DropIndex
DROP INDEX "subscriptions_tenant_status_created_idx";

-- DropIndex
DROP INDEX "subscriptions_tenant_status_idx";

-- DropIndex
DROP INDEX "tenants_status_created_idx";

-- CreateTable
CREATE TABLE "subscription_reminders" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reminder_type" "SubscriptionReminderType" NOT NULL,
    "target_date" DATE NOT NULL,
    "status" "SubscriptionReminderStatus" NOT NULL DEFAULT 'PENDING',
    "channels" "NotificationChannel"[],
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "sms_sent" BOOLEAN NOT NULL DEFAULT false,
    "in_app_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_error" TEXT,
    "sms_error" TEXT,
    "in_app_error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_reminders_subscription_id_idx" ON "subscription_reminders"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_reminders_tenant_id_idx" ON "subscription_reminders"("tenant_id");

-- CreateIndex
CREATE INDEX "subscription_reminders_status_idx" ON "subscription_reminders"("status");

-- CreateIndex
CREATE INDEX "subscription_reminders_target_date_idx" ON "subscription_reminders"("target_date");

-- CreateIndex
CREATE INDEX "subscription_reminders_created_at_idx" ON "subscription_reminders"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_reminders_subscription_id_reminder_type_target_key" ON "subscription_reminders"("subscription_id", "reminder_type", "target_date");

-- AddForeignKey
ALTER TABLE "subscription_reminders" ADD CONSTRAINT "subscription_reminders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_reminders" ADD CONSTRAINT "subscription_reminders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
