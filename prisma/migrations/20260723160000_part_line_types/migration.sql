-- Expand-only: estimate part line type + inventory links (tire stock, parts inventory).
CREATE TYPE "PartLineType" AS ENUM ('PART', 'TIRE', 'SUBLET', 'HAZARDOUS', 'OTHER');

ALTER TABLE "PartLine" ADD COLUMN "lineType" "PartLineType" NOT NULL DEFAULT 'PART';
ALTER TABLE "PartLine" ADD COLUMN "inventoryPartId" TEXT;
ALTER TABLE "PartLine" ADD COLUMN "tireStockId" TEXT;

CREATE INDEX "PartLine_inventoryPartId_idx" ON "PartLine"("inventoryPartId");
CREATE INDEX "PartLine_tireStockId_idx" ON "PartLine"("tireStockId");
