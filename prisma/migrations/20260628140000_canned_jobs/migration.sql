-- CreateTable
CREATE TABLE "CannedJob" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CannedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CannedJobLaborLine" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "cannedJobId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CannedJobLaborLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CannedJobPartLine" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "cannedJobId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "brand" TEXT,
    "partNumber" TEXT,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CannedJobPartLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CannedJob_shopId_idx" ON "CannedJob"("shopId");

-- CreateIndex
CREATE INDEX "CannedJob_shopId_category_idx" ON "CannedJob"("shopId", "category");

-- CreateIndex
CREATE INDEX "CannedJob_shopId_isActive_idx" ON "CannedJob"("shopId", "isActive");

-- CreateIndex
CREATE INDEX "CannedJobLaborLine_cannedJobId_idx" ON "CannedJobLaborLine"("cannedJobId");

-- CreateIndex
CREATE INDEX "CannedJobPartLine_cannedJobId_idx" ON "CannedJobPartLine"("cannedJobId");

-- AddForeignKey
ALTER TABLE "CannedJob" ADD CONSTRAINT "CannedJob_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CannedJobLaborLine" ADD CONSTRAINT "CannedJobLaborLine_cannedJobId_fkey" FOREIGN KEY ("cannedJobId") REFERENCES "CannedJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CannedJobPartLine" ADD CONSTRAINT "CannedJobPartLine_cannedJobId_fkey" FOREIGN KEY ("cannedJobId") REFERENCES "CannedJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
