-- CreateEnum
CREATE TYPE "InvoiceLinkStatus" AS ENUM ('NOT_SENT', 'PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "invoice_links" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tenant_schema" TEXT NOT NULL,
    "sale_id" UUID NOT NULL,
    "sale_number" TEXT,
    "customer_phone" TEXT,
    "sms_status" "InvoiceLinkStatus" NOT NULL DEFAULT 'NOT_SENT',
    "sms_sent_at" TIMESTAMP(3),
    "sms_attempts" INTEGER NOT NULL DEFAULT 0,
    "sms_failure_reason" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_links_token_key" ON "invoice_links"("token");

-- CreateIndex
CREATE INDEX "invoice_links_tenant_id_idx" ON "invoice_links"("tenant_id");

-- CreateIndex
CREATE INDEX "invoice_links_token_idx" ON "invoice_links"("token");

-- CreateIndex
CREATE INDEX "invoice_links_sale_id_idx" ON "invoice_links"("sale_id");

-- CreateIndex
CREATE INDEX "invoice_links_sms_status_idx" ON "invoice_links"("sms_status");

-- AddForeignKey
ALTER TABLE "invoice_links" ADD CONSTRAINT "invoice_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
