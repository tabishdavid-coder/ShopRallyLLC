-- Expand-only: shop-scoped reusable DVI / MPI inspection templates.
CREATE TABLE "ShopInspectionTemplate" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopInspectionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopInspectionTemplateItem" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShopInspectionTemplateItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopInspectionTemplate_shopId_idx" ON "ShopInspectionTemplate"("shopId");
CREATE INDEX "ShopInspectionTemplate_shopId_isActive_idx" ON "ShopInspectionTemplate"("shopId", "isActive");
CREATE UNIQUE INDEX "ShopInspectionTemplate_shopId_name_key" ON "ShopInspectionTemplate"("shopId", "name");
CREATE INDEX "ShopInspectionTemplateItem_templateId_idx" ON "ShopInspectionTemplateItem"("templateId");

ALTER TABLE "ShopInspectionTemplate" ADD CONSTRAINT "ShopInspectionTemplate_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopInspectionTemplateItem" ADD CONSTRAINT "ShopInspectionTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ShopInspectionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
