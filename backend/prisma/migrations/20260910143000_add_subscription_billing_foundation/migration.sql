-- Subscription billing foundation (Phase 1)
-- Safe additive migration: no drops, no data deletion

-- ---------------------------------------------------------------------------
-- 1. New enums
-- ---------------------------------------------------------------------------

CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "SubscriptionHistoryAction" AS ENUM (
  'CREATED',
  'ACTIVATED',
  'RENEWED',
  'UPGRADED',
  'DOWNGRADED',
  'CANCELLED',
  'EXPIRED',
  'STATUS_CHANGED',
  'PLAN_CHANGED',
  'TRIAL_STARTED',
  'TRIAL_CONVERTED'
);

-- Extend subscription lifecycle with trial support
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIAL';

-- ---------------------------------------------------------------------------
-- 2. plans — add status + display_order (keep legacy pricing columns)
-- ---------------------------------------------------------------------------

ALTER TABLE "plans"
  ADD COLUMN "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0;

-- Backfill status from legacy active flag
UPDATE "plans"
SET "status" = CASE WHEN "active" = true THEN 'ACTIVE'::"PlanStatus" ELSE 'INACTIVE'::"PlanStatus" END;

-- Sensible default ordering for seeded plans
UPDATE "plans" SET "display_order" = 1 WHERE "code" = 'SILVER';
UPDATE "plans" SET "display_order" = 2 WHERE "code" = 'GOLD';
UPDATE "plans" SET "display_order" = 3 WHERE "code" = 'PLATINUM';
UPDATE "plans" SET "display_order" = 99 WHERE "code" = 'CUSTOM';

CREATE INDEX "plans_status_idx" ON "plans"("status");
CREATE INDEX "plans_display_order_idx" ON "plans"("display_order");

-- ---------------------------------------------------------------------------
-- 3. plan_prices — billing-cycle pricing variants
-- ---------------------------------------------------------------------------

CREATE TABLE "plan_prices" (
  "id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "billing_cycle" "BillingCycle" NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'LKR',
  "trial_days" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plan_prices_plan_id_billing_cycle_currency_key"
  ON "plan_prices"("plan_id", "billing_cycle", "currency");
CREATE INDEX "plan_prices_plan_id_idx" ON "plan_prices"("plan_id");
CREATE INDEX "plan_prices_is_active_idx" ON "plan_prices"("is_active");

ALTER TABLE "plan_prices"
  ADD CONSTRAINT "plan_prices_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one plan_price row per existing plan from legacy columns
INSERT INTO "plan_prices" (
  "id",
  "plan_id",
  "billing_cycle",
  "price",
  "currency",
  "trial_days",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  "id",
  "billing_cycle",
  "price",
  "currency",
  0,
  "active",
  "created_at",
  "updated_at"
FROM "plans";

-- ---------------------------------------------------------------------------
-- 4. plan_limits — usage caps per plan
-- ---------------------------------------------------------------------------

CREATE TABLE "plan_limits" (
  "id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "feature" TEXT NOT NULL,
  "limit_value" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plan_limits_plan_id_feature_key" ON "plan_limits"("plan_id", "feature");
CREATE INDEX "plan_limits_plan_id_idx" ON "plan_limits"("plan_id");

ALTER TABLE "plan_limits"
  ADD CONSTRAINT "plan_limits_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 5. subscriptions — lifecycle + billing fields
-- ---------------------------------------------------------------------------

ALTER TABLE "subscriptions"
  ADD COLUMN "plan_price_id" UUID,
  ADD COLUMN "trial_start" TIMESTAMP(3),
  ADD COLUMN "trial_end" TIMESTAMP(3),
  ADD COLUMN "next_billing_date" TIMESTAMP(3),
  ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cancelled_at" TIMESTAMP(3),
  ADD COLUMN "grace_period_end" TIMESTAMP(3);

-- Link existing subscriptions to backfilled plan_prices where possible
UPDATE "subscriptions" AS s
SET "plan_price_id" = pp."id"
FROM "plan_prices" AS pp
WHERE pp."plan_id" = s."plan_id"
  AND pp."billing_cycle" = s."billing_cycle"
  AND pp."currency" = s."currency";

CREATE INDEX "subscriptions_plan_price_id_idx" ON "subscriptions"("plan_price_id");
CREATE INDEX "subscriptions_next_billing_date_idx" ON "subscriptions"("next_billing_date");
CREATE INDEX "subscriptions_end_date_idx" ON "subscriptions"("end_date");

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_plan_price_id_fkey"
  FOREIGN KEY ("plan_price_id") REFERENCES "plan_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 6. subscription_history — audit trail
-- ---------------------------------------------------------------------------

CREATE TABLE "subscription_history" (
  "id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "action" "SubscriptionHistoryAction" NOT NULL,
  "from_plan_id" UUID,
  "to_plan_id" UUID,
  "from_plan_price_id" UUID,
  "to_plan_price_id" UUID,
  "from_status" "SubscriptionStatus",
  "to_status" "SubscriptionStatus",
  "metadata" JSONB,
  "performed_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subscription_history_subscription_id_idx" ON "subscription_history"("subscription_id");
CREATE INDEX "subscription_history_action_idx" ON "subscription_history"("action");
CREATE INDEX "subscription_history_created_at_idx" ON "subscription_history"("created_at");

ALTER TABLE "subscription_history"
  ADD CONSTRAINT "subscription_history_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed history for existing subscriptions (non-destructive audit baseline)
INSERT INTO "subscription_history" (
  "id",
  "subscription_id",
  "action",
  "to_plan_id",
  "to_plan_price_id",
  "to_status",
  "metadata",
  "created_at"
)
SELECT
  gen_random_uuid(),
  s."id",
  'CREATED'::"SubscriptionHistoryAction",
  s."plan_id",
  s."plan_price_id",
  s."status",
  jsonb_build_object('source', 'migration_backfill', 'note', 'Baseline history row for pre-existing subscription'),
  s."created_at"
FROM "subscriptions" AS s;
