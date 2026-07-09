-- AlterTable
ALTER TABLE "RepairOrder" ADD COLUMN     "appointmentOption" TEXT,
ADD COLUMN     "concerns" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "laborRateCents" INTEGER,
ADD COLUMN     "marketingSource" TEXT;
