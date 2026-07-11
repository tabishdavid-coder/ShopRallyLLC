-- CreateEnum
CREATE TYPE "DecodeUsageKind" AS ENUM ('VIN', 'PLATE');

-- CreateTable
CREATE TABLE "DecodeUsageLog" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "kind" "DecodeUsageKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecodeUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DecodeUsageLog_shopId_createdAt_idx" ON "DecodeUsageLog"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "DecodeUsageLog_shopId_kind_createdAt_idx" ON "DecodeUsageLog"("shopId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "DecodeUsageLog" ADD CONSTRAINT "DecodeUsageLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
