-- CreateEnum
CREATE TYPE "public"."BulkOperationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."bulk_addon_operations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feature_id" UUID NOT NULL,
    "status" "public"."BulkOperationStatus" NOT NULL DEFAULT 'PENDING',
    "selected_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "bulk_addon_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bulk_addon_operation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "addon_id" UUID,
    "invoice_id" UUID,
    "payment_order_id" UUID,
    "result" TEXT NOT NULL,
    "reason" TEXT,
    "amount" DECIMAL(10,2),
    "currency" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_addon_operation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bulk_addon_operations_feature_id_idx" ON "public"."bulk_addon_operations"("feature_id");
CREATE INDEX "bulk_addon_operations_status_idx" ON "public"."bulk_addon_operations"("status");
CREATE INDEX "bulk_addon_operations_created_at_idx" ON "public"."bulk_addon_operations"("created_at");

-- CreateIndex
CREATE INDEX "bulk_addon_operation_items_operation_id_idx" ON "public"."bulk_addon_operation_items"("operation_id");
CREATE INDEX "bulk_addon_operation_items_tenant_id_idx" ON "public"."bulk_addon_operation_items"("tenant_id");
CREATE INDEX "bulk_addon_operation_items_subscription_id_idx" ON "public"."bulk_addon_operation_items"("subscription_id");

-- AddForeignKey
ALTER TABLE "public"."bulk_addon_operations" ADD CONSTRAINT "bulk_addon_operations_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bulk_addon_operation_items" ADD CONSTRAINT "bulk_addon_operation_items_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."bulk_addon_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
