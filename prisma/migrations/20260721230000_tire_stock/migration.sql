-- CreateEnum
CREATE TYPE "TireCondition" AS ENUM ('NEW', 'USED');

-- CreateTable
CREATE TABLE "TireStock" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "stockNumber" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "loadSpeed" TEXT,
    "condition" "TireCondition" NOT NULL DEFAULT 'NEW',
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "reorderQty" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "retailCents" INTEGER NOT NULL DEFAULT 0,
    "binLocation" TEXT,
    "dotCode" TEXT,
    "treadDepth32nds" INTEGER,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TireStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TireStockAdjustment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "tireId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "adjustedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TireStockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TireStock_shopId_idx" ON "TireStock"("shopId");

-- CreateIndex
CREATE INDEX "TireStock_shopId_active_idx" ON "TireStock"("shopId", "active");

-- CreateIndex
CREATE INDEX "TireStock_shopId_condition_idx" ON "TireStock"("shopId", "condition");

-- CreateIndex
CREATE UNIQUE INDEX "TireStock_shopId_stockNumber_key" ON "TireStock"("shopId", "stockNumber");

-- CreateIndex
CREATE INDEX "TireStockAdjustment_shopId_idx" ON "TireStockAdjustment"("shopId");

-- CreateIndex
CREATE INDEX "TireStockAdjustment_tireId_idx" ON "TireStockAdjustment"("tireId");

-- AddForeignKey
ALTER TABLE "TireStock" ADD CONSTRAINT "TireStock_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireStockAdjustment" ADD CONSTRAINT "TireStockAdjustment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireStockAdjustment" ADD CONSTRAINT "TireStockAdjustment_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "TireStock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
