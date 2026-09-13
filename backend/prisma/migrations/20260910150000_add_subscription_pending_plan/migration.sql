-- Pending plan change for scheduled downgrades (Phase 3)

ALTER TABLE "subscriptions"
  ADD COLUMN "pending_plan_id" UUID,
  ADD COLUMN "pending_plan_price_id" UUID;

CREATE INDEX "subscriptions_pending_plan_id_idx" ON "subscriptions"("pending_plan_id");

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_pending_plan_id_fkey"
  FOREIGN KEY ("pending_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_pending_plan_price_id_fkey"
  FOREIGN KEY ("pending_plan_price_id") REFERENCES "plan_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
