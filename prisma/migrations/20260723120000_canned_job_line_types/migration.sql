-- Expand-only: canned job part line types + discount/inspection template lines

CREATE TYPE "CannedJobPartLineType" AS ENUM ('PART', 'TIRE', 'SUBLET', 'OTHER');

ALTER TABLE "CannedJobPartLine" ADD COLUMN "lineType" "CannedJobPartLineType" NOT NULL DEFAULT 'PART';
ALTER TABLE "CannedJobPartLine" ADD COLUMN "inventoryPartId" TEXT;
ALTER TABLE "CannedJobPartLine" ADD COLUMN "tireStockId" TEXT;

CREATE INDEX "CannedJobPartLine_inventoryPartId_idx" ON "CannedJobPartLine"("inventoryPartId");
CREATE INDEX "CannedJobPartLine_tireStockId_idx" ON "CannedJobPartLine"("tireStockId");

CREATE TABLE "CannedJobDiscountLine" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "cannedJobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" "AdjustMethod" NOT NULL DEFAULT 'FIXED',
    "base" "AdjustBase" NOT NULL DEFAULT 'LABOR_PARTS',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CannedJobDiscountLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CannedJobInspectionLine" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "cannedJobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inspectionTemplateId" TEXT,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "flatAmountCents" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CannedJobInspectionLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CannedJobDiscountLine_cannedJobId_idx" ON "CannedJobDiscountLine"("cannedJobId");
CREATE INDEX "CannedJobInspectionLine_cannedJobId_idx" ON "CannedJobInspectionLine"("cannedJobId");

ALTER TABLE "CannedJobDiscountLine" ADD CONSTRAINT "CannedJobDiscountLine_cannedJobId_fkey" FOREIGN KEY ("cannedJobId") REFERENCES "CannedJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CannedJobInspectionLine" ADD CONSTRAINT "CannedJobInspectionLine_cannedJobId_fkey" FOREIGN KEY ("cannedJobId") REFERENCES "CannedJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
