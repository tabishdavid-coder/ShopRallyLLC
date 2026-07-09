-- AlterTable
ALTER TABLE "RepairOrder" ADD COLUMN "keyTag" TEXT;
ALTER TABLE "RepairOrder" ADD COLUMN "promiseTime" TIMESTAMP(3);
ALTER TABLE "RepairOrder" ADD COLUMN "saveParts" BOOLEAN NOT NULL DEFAULT false;
