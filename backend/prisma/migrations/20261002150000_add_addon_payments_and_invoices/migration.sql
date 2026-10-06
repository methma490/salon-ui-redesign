-- AlterTable payment_orders
ALTER TABLE "public"."payment_orders"
  ADD COLUMN "subscription_add_on_id" UUID,
  ADD COLUMN "payment_token" TEXT,
  ADD COLUMN "payment_token_hash" TEXT,
  ADD COLUMN "token_expires_at" TIMESTAMP(3),
  ADD COLUMN "token_used_at" TIMESTAMP(3);

-- AlterTable invoices
ALTER TABLE "public"."invoices"
  ADD COLUMN "subscription_add_on_id" UUID,
  ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_payment_token_key" ON "public"."payment_orders"("payment_token");
CREATE UNIQUE INDEX "payment_orders_payment_token_hash_key" ON "public"."payment_orders"("payment_token_hash");
CREATE INDEX "payment_orders_subscription_add_on_id_idx" ON "public"."payment_orders"("subscription_add_on_id");
CREATE INDEX "invoices_subscription_add_on_id_idx" ON "public"."invoices"("subscription_add_on_id");

-- AddForeignKey
ALTER TABLE "public"."payment_orders"
  ADD CONSTRAINT "payment_orders_subscription_add_on_id_fkey" FOREIGN KEY ("subscription_add_on_id") REFERENCES "public"."subscription_addons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices"
  ADD CONSTRAINT "invoices_subscription_add_on_id_fkey" FOREIGN KEY ("subscription_add_on_id") REFERENCES "public"."subscription_addons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
