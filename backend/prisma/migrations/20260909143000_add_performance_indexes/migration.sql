-- Public schema performance indexes
-- Subscriptions, tenants list, signup order maintenance

CREATE INDEX IF NOT EXISTS "subscriptions_tenant_status_idx"
  ON "subscriptions" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "subscriptions_tenant_status_created_idx"
  ON "subscriptions" ("tenant_id", "status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "subscription_payments_tenant_status_paid_idx"
  ON "subscription_payments" ("tenant_id", "status", "paid_at" DESC);

CREATE INDEX IF NOT EXISTS "tenants_status_created_idx"
  ON "tenants" ("status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "signup_orders_status_created_idx"
  ON "signup_orders" ("status", "created_at");
