-- Cleanup legacy billing artifacts
-- 1. Backfill signup metadata into payment_orders
-- 2. Drop unused/legacy tables and plan columns

UPDATE "payment_orders" AS po
SET "metadata" = COALESCE(po."metadata", '{}'::jsonb) || jsonb_strip_nulls(
  jsonb_build_object(
    'salonName', so."salon_name",
    'adminEmail', so."admin_email",
    'planId', so."plan_id"::text
  )
)
FROM "signup_orders" AS so
WHERE po."reference" = so."order_id";

-- Ensure subscriptions link to plan prices when possible
UPDATE "subscriptions" AS s
SET "plan_price_id" = pp."id"
FROM "plan_prices" AS pp
WHERE s."plan_price_id" IS NULL
  AND pp."plan_id" = s."plan_id"
  AND pp."billing_cycle" = s."billing_cycle"
  AND pp."currency" = s."currency";

ALTER TABLE "subscription_payments" DROP CONSTRAINT IF EXISTS "subscription_payments_subscription_id_fkey";
ALTER TABLE "subscription_payments" DROP CONSTRAINT IF EXISTS "subscription_payments_tenant_id_fkey";
DROP TABLE IF EXISTS "subscription_payments";

ALTER TABLE "signup_orders" DROP CONSTRAINT IF EXISTS "signup_orders_tenant_id_fkey";
ALTER TABLE "signup_orders" DROP CONSTRAINT IF EXISTS "signup_orders_subscription_id_fkey";
ALTER TABLE "signup_orders" DROP CONSTRAINT IF EXISTS "signup_orders_plan_id_fkey";
DROP TABLE IF EXISTS "signup_orders";

ALTER TABLE "plan_limits" DROP CONSTRAINT IF EXISTS "plan_limits_plan_id_fkey";
DROP TABLE IF EXISTS "plan_limits";

ALTER TABLE "plans" DROP COLUMN IF EXISTS "price";
ALTER TABLE "plans" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "plans" DROP COLUMN IF EXISTS "billing_cycle";
ALTER TABLE "plans" DROP COLUMN IF EXISTS "active";

DROP TYPE IF EXISTS "PaymentStatus";
DROP TYPE IF EXISTS "SignupOrderStatus";

ALTER TYPE "PaymentGatewayProvider" ADD VALUE IF NOT EXISTS 'MANUAL';
