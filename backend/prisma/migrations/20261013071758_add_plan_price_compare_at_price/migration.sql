-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "plan_prices" ADD COLUMN     "compare_at_price" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "demo_profile" SET DATA TYPE TEXT;
