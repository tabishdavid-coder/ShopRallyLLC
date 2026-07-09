-- AlterEnum
ALTER TYPE "TireOrderStatus" ADD VALUE 'PENDING_SUPPLIER_APPROVAL';
ALTER TYPE "TireOrderStatus" ADD VALUE 'ORDERED';

-- AlterTable
ALTER TABLE "TireOrder" ADD COLUMN "supplierName" TEXT DEFAULT 'Weldon Tire',
ADD COLUMN "supplierOrderRef" TEXT,
ADD COLUMN "supplierApprovedBy" TEXT,
ADD COLUMN "supplierApprovedAt" TIMESTAMP(3),
ADD COLUMN "supplierQuoteCents" INTEGER,
ADD COLUMN "supplierOrderPayload" JSONB,
ADD COLUMN "supplierRejectedAt" TIMESTAMP(3),
ADD COLUMN "supplierRejectionNote" TEXT;
