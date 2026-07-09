-- AlterTable: shop customer estimate/invoice terms
ALTER TABLE "Shop" ADD COLUMN "estimateTermsHtml" TEXT,
ADD COLUMN "invoiceTermsHtml" TEXT,
ADD COLUMN "estimateTermsVersion" TEXT DEFAULT '1.0',
ADD COLUMN "estimateTermsUpdatedAt" TIMESTAMP(3);

-- AlterTable: snapshot terms shown at customer approval
ALTER TABLE "RepairOrder" ADD COLUMN "estimateTermsVersion" TEXT,
ADD COLUMN "estimateTermsHash" TEXT;
