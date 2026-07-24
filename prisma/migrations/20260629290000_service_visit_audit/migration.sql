-- CreateEnum
CREATE TYPE "ServiceVisitStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'VOIDED');

-- AlterTable (idempotent — baseline may already include performedAt on partial deploys)
ALTER TABLE "PlanRedemption" ADD COLUMN IF NOT EXISTS "redeemedByUserId" TEXT;
ALTER TABLE "PlanRedemption" ADD COLUMN IF NOT EXISTS "performedByName" TEXT;
ALTER TABLE "PlanRedemption" ADD COLUMN IF NOT EXISTS "status" "ServiceVisitStatus" NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "PlanRedemption" ADD COLUMN IF NOT EXISTS "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PlanRedemption" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);
ALTER TABLE "PlanRedemption" ADD COLUMN IF NOT EXISTS "voidReason" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlanRedemption_shopId_status_idx" ON "PlanRedemption"("shopId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RedeemedEntitlement_subscriptionEntitlementId_idx" ON "RedeemedEntitlement"("subscriptionEntitlementId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PlanRedemption" ADD CONSTRAINT "PlanRedemption_redeemedByUserId_fkey" FOREIGN KEY ("redeemedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "RedeemedEntitlement" ADD CONSTRAINT "RedeemedEntitlement_subscriptionEntitlementId_fkey" FOREIGN KEY ("subscriptionEntitlementId") REFERENCES "SubscriptionEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
