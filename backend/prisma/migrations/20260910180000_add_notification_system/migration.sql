-- Phase 6: Background notification system (additive)

CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP');
CREATE TYPE "NotificationType" AS ENUM (
  'TRIAL_EXPIRY_REMINDER',
  'SUBSCRIPTION_EXPIRY_REMINDER',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'RENEWAL_REMINDER'
);
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE "InAppNotificationStatus" AS ENUM ('UNREAD', 'READ');

CREATE TABLE "notification_templates" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "subject" TEXT,
  "body_template" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_templates_code_channel_key" ON "notification_templates"("code", "channel");
CREATE INDEX "notification_templates_type_idx" ON "notification_templates"("type");
CREATE INDEX "notification_templates_active_idx" ON "notification_templates"("active");

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "InAppNotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "metadata" JSONB,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");
CREATE INDEX "notifications_status_idx" ON "notifications"("status");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

CREATE TABLE "notification_logs" (
  "id" UUID NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "tenant_id" UUID NOT NULL,
  "template_code" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "recipient" TEXT,
  "error" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "job_id" TEXT,
  "metadata" JSONB,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_logs_idempotency_key_channel_key" ON "notification_logs"("idempotency_key", "channel");
CREATE INDEX "notification_logs_tenant_id_idx" ON "notification_logs"("tenant_id");
CREATE INDEX "notification_logs_template_code_idx" ON "notification_logs"("template_code");
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_logs"
  ADD CONSTRAINT "notification_logs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
