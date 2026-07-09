-- AlterEnum
ALTER TYPE "AgreementType" ADD VALUE 'CUSTOM_MSA';

-- CreateTable
CREATE TABLE "ShopCustomAgreement" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "legalEntityName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCustomAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopCustomAgreement_shopId_key" ON "ShopCustomAgreement"("shopId");

-- CreateIndex
CREATE INDEX "ShopCustomAgreement_shopId_idx" ON "ShopCustomAgreement"("shopId");

-- AddForeignKey
ALTER TABLE "ShopCustomAgreement" ADD CONSTRAINT "ShopCustomAgreement_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCustomAgreement" ADD CONSTRAINT "ShopCustomAgreement_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
