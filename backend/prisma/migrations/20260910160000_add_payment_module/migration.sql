-- Phase 4: Gateway-agnostic payment module

CREATE TYPE "PaymentGatewayProvider" AS ENUM ('PAYHERE', 'KOKO', 'STRIPE');
CREATE TYPE "PaymentOrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');
CREATE TYPE "PaymentRecordStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

CREATE TABLE "payment_orders" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "PaymentOrderStatus" NOT NULL DEFAULT 'PENDING',
  "gateway" "PaymentGatewayProvider" NOT NULL,
  "reference" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'SUBSCRIPTION',
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_orders_reference_key" ON "payment_orders"("reference");
CREATE INDEX "payment_orders_tenant_id_idx" ON "payment_orders"("tenant_id");
CREATE INDEX "payment_orders_subscription_id_idx" ON "payment_orders"("subscription_id");
CREATE INDEX "payment_orders_status_idx" ON "payment_orders"("status");
CREATE INDEX "payment_orders_gateway_idx" ON "payment_orders"("gateway");

CREATE TABLE "payments" (
  "id" UUID NOT NULL,
  "payment_order_id" UUID NOT NULL,
  "transaction_id" TEXT,
  "status" "PaymentRecordStatus" NOT NULL DEFAULT 'PENDING',
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");
CREATE INDEX "payments_payment_order_id_idx" ON "payments"("payment_order_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");

CREATE TABLE "payment_transactions" (
  "id" UUID NOT NULL,
  "payment_order_id" UUID NOT NULL,
  "payment_id" UUID,
  "gateway" "PaymentGatewayProvider" NOT NULL,
  "event_type" TEXT NOT NULL,
  "raw_payload" JSONB NOT NULL,
  "verification_result" JSONB,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_transactions_payment_order_id_idx" ON "payment_transactions"("payment_order_id");
CREATE INDEX "payment_transactions_payment_id_idx" ON "payment_transactions"("payment_id");
CREATE INDEX "payment_transactions_gateway_idx" ON "payment_transactions"("gateway");

ALTER TABLE "payment_orders"
  ADD CONSTRAINT "payment_orders_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_orders"
  ADD CONSTRAINT "payment_orders_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_payment_order_id_fkey"
  FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_payment_order_id_fkey"
  FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
