-- CreateTable
CREATE TABLE "ShopLaborItem" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rateCents" INTEGER NOT NULL DEFAULT 0,
    "defaultHours" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopLaborItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopLaborItem_shopId_idx" ON "ShopLaborItem"("shopId");

-- CreateIndex
CREATE INDEX "ShopLaborItem_shopId_isActive_idx" ON "ShopLaborItem"("shopId", "isActive");

-- AddForeignKey
ALTER TABLE "ShopLaborItem" ADD CONSTRAINT "ShopLaborItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
