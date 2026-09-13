-- Phase 5: Invoice management (additive — does not modify existing billing tables)

CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'PAID', 'VOID', 'REFUNDED');

CREATE TABLE "invoices" (
  "id" UUID NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "tenant_id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "payment_id" UUID,
  "payment_order_id" UUID,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'PAID',
  "currency" TEXT NOT NULL,
  "subtotal" DECIMAL(10,2) NOT NULL,
  "total" DECIMAL(10,2) NOT NULL,
  "paid_at" TIMESTAMP(3),
  "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "salon_name" TEXT NOT NULL,
  "salon_email" TEXT,
  "salon_phone" TEXT,
  "customer_name" TEXT NOT NULL,
  "customer_email" TEXT NOT NULL,
  "customer_phone" TEXT,
  "plan_name" TEXT NOT NULL,
  "plan_code" TEXT NOT NULL,
  "billing_cycle" "BillingCycle" NOT NULL,
  "payment_method" TEXT,
  "payment_reference" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE UNIQUE INDEX "invoices_payment_id_key" ON "invoices"("payment_id");
CREATE INDEX "invoices_tenant_id_idx" ON "invoices"("tenant_id");
CREATE INDEX "invoices_subscription_id_idx" ON "invoices"("subscription_id");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_issue_date_idx" ON "invoices"("issue_date");

CREATE TABLE "invoice_items" (
  "id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
  "unit_price" DECIMAL(10,2) NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_payment_order_id_fkey"
  FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_items"
  ADD CONSTRAINT "invoice_items_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
