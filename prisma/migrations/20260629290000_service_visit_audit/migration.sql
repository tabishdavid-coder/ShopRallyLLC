-- CreateEnum
CREATE TYPE "ServiceVisitStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'VOIDED');

-- AlterTable
ALTER TABLE "PlanRedemption" ADD COLUMN     "performedByName" TEXT,
ADD COLUMN     "status" "ServiceVisitStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidReason" TEXT;

-- CreateIndex
CREATE INDEX "PlanRedemption_shopId_status_idx" ON "PlanRedemption"("shopId", "status");

-- CreateIndex
CREATE INDEX "RedeemedEntitlement_subscriptionEntitlementId_idx" ON "RedeemedEntitlement"("subscriptionEntitlementId");

-- AddForeignKey
ALTER TABLE "PlanRedemption" ADD CONSTRAINT "PlanRedemption_redeemedByUserId_fkey" FOREIGN KEY ("redeemedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemedEntitlement" ADD CONSTRAINT "RedeemedEntitlement_subscriptionEntitlementId_fkey" FOREIGN KEY ("subscriptionEntitlementId") REFERENCES "SubscriptionEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
