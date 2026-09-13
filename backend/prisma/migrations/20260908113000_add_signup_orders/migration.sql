-- CreateEnum
CREATE TYPE "SignupOrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "signup_orders" (
    "id" UUID NOT NULL,
    "order_id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SignupOrderStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "admin_email" TEXT NOT NULL,
    "salon_name" TEXT NOT NULL,
    "payhere_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signup_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signup_orders_order_id_key" ON "signup_orders"("order_id");

-- CreateIndex
CREATE INDEX "signup_orders_tenant_id_idx" ON "signup_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "signup_orders_status_idx" ON "signup_orders"("status");

-- AddForeignKey
ALTER TABLE "signup_orders" ADD CONSTRAINT "signup_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signup_orders" ADD CONSTRAINT "signup_orders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signup_orders" ADD CONSTRAINT "signup_orders_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
