-- CreateEnum
CREATE TYPE "ShopPlan" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "plan" "ShopPlan" NOT NULL DEFAULT 'PROFESSIONAL',
ADD COLUMN     "planFeatures" JSONB,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ADD COLUMN     "billingStatus" "BillingStatus" NOT NULL DEFAULT 'ACTIVE';
