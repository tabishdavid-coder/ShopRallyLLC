-- AlterTable
ALTER TABLE "RepairOrder" ADD COLUMN "approvalSignatureUrl" TEXT,
ADD COLUMN "approvalSignerName" TEXT,
ADD COLUMN "approvalSignedAt" TIMESTAMP(3),
ADD COLUMN "approvalSignatureJson" JSONB;
