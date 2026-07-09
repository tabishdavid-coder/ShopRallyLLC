-- CreateEnum
CREATE TYPE "ShopProvisionMethod" AS ENUM ('PLATFORM_DIRECT', 'INTAKE_FORM');

-- CreateEnum
CREATE TYPE "PlatformAuditEventType" AS ENUM ('SHOP_CREATED', 'SHOP_ACTIVATED', 'SHOP_INTAKE_SUBMITTED');

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "provisionMethod" "ShopProvisionMethod",
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "msaAcknowledgedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlatformAuditEvent" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "shopId" TEXT,
    "eventType" "PlatformAuditEventType" NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "method" "ShopProvisionMethod",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformAuditEvent_platformId_createdAt_idx" ON "PlatformAuditEvent"("platformId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditEvent_shopId_eventType_idx" ON "PlatformAuditEvent"("shopId", "eventType");

-- AddForeignKey
ALTER TABLE "PlatformAuditEvent" ADD CONSTRAINT "PlatformAuditEvent_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditEvent" ADD CONSTRAINT "PlatformAuditEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
