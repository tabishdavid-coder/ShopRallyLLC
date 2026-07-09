-- CreateEnum
CREATE TYPE "StripeConnectStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'ACTIVE', 'RESTRICTED', 'DISABLED');

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "stripeConnectAccountId" TEXT,
ADD COLUMN     "stripeConnectStatus" "StripeConnectStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeConnectDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeOnboardingCompletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_stripeConnectAccountId_key" ON "Shop"("stripeConnectAccountId");
