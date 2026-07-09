-- AlterTable
ALTER TABLE "PlanRedemption" ADD COLUMN     "gatekeeperVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gatekeeperVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "gatekeeperPlate" TEXT,
ADD COLUMN     "gatekeeperVinLast6" TEXT,
ADD COLUMN     "gatekeeperMismatch" BOOLEAN NOT NULL DEFAULT false;
