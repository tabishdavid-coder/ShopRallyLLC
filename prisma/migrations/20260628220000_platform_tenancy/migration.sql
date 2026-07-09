-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- Seed default platform for existing shops
INSERT INTO "Platform" ("id", "name", "createdAt", "updatedAt")
VALUES ('platform_rp', 'RepairPilot', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable Shop: add platform + status + clerkOrgId
ALTER TABLE "Shop" ADD COLUMN "platformId" TEXT;
ALTER TABLE "Shop" ADD COLUMN "clerkOrgId" TEXT;
ALTER TABLE "Shop" ADD COLUMN "status" "ShopStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "Shop" SET "platformId" = 'platform_rp' WHERE "platformId" IS NULL;

ALTER TABLE "Shop" ALTER COLUMN "platformId" SET NOT NULL;

-- AlterTable User: platform admin flag
ALTER TABLE "User" ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Shop_clerkOrgId_key" ON "Shop"("clerkOrgId");
CREATE INDEX "Shop_platformId_idx" ON "Shop"("platformId");

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
