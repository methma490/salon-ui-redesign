-- CreateEnum
CREATE TYPE "SubscriptionAddOnStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'CANCEL_AT_PERIOD_END', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AddOnPriceSource" AS ENUM ('DEFAULT', 'CUSTOM');

-- CreateTable
CREATE TABLE "feature_addon_prices" (
    "id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_addon_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_addons" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "status" "SubscriptionAddOnStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "billing_cycle" "BillingCycle" NOT NULL,
    "recurring_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "addon_price_id" UUID,
    "price_source" "AddOnPriceSource" NOT NULL DEFAULT 'DEFAULT',
    "custom_reason" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_addons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_addon_prices_feature_id_billing_cycle_currency_key" ON "feature_addon_prices"("feature_id", "billing_cycle", "currency");

-- CreateIndex
CREATE INDEX "feature_addon_prices_feature_id_idx" ON "feature_addon_prices"("feature_id");

-- CreateIndex
CREATE INDEX "feature_addon_prices_is_active_idx" ON "feature_addon_prices"("is_active");

-- CreateIndex
CREATE INDEX "subscription_addons_subscription_id_idx" ON "subscription_addons"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_addons_feature_id_idx" ON "subscription_addons"("feature_id");

-- CreateIndex
CREATE INDEX "subscription_addons_status_idx" ON "subscription_addons"("status");

-- AddForeignKey
ALTER TABLE "feature_addon_prices" ADD CONSTRAINT "feature_addon_prices_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_addons" ADD CONSTRAINT "subscription_addons_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_addons" ADD CONSTRAINT "subscription_addons_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_addons" ADD CONSTRAINT "subscription_addons_addon_price_id_fkey" FOREIGN KEY ("addon_price_id") REFERENCES "feature_addon_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
