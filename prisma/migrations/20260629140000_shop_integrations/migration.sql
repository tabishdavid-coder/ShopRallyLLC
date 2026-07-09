-- CreateTable
CREATE TABLE "ShopIntegration" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "vendorKey" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopIntegration_shopId_idx" ON "ShopIntegration"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopIntegration_shopId_vendorKey_key" ON "ShopIntegration"("shopId", "vendorKey");

-- AddForeignKey
ALTER TABLE "ShopIntegration" ADD CONSTRAINT "ShopIntegration_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
