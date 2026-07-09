-- Shop intake onboarding: PENDING status, contact/timezone fields, intake tokens.

CREATE TYPE "ShopStatus_new" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'PENDING');
ALTER TABLE "Shop" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Shop" ALTER COLUMN "status" TYPE "ShopStatus_new" USING ("status"::text::"ShopStatus_new");
ALTER TYPE "ShopStatus" RENAME TO "ShopStatus_old";
ALTER TYPE "ShopStatus_new" RENAME TO "ShopStatus";
DROP TYPE "ShopStatus_old";
ALTER TABLE "Shop" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "Shop" ADD COLUMN "primaryContactName" TEXT;
ALTER TABLE "Shop" ADD COLUMN "timezone" TEXT;

CREATE TABLE "ShopIntakeToken" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "prospectEmail" TEXT NOT NULL,
    "prospectName" TEXT,
    "shopId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopIntakeToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopIntakeToken_token_key" ON "ShopIntakeToken"("token");
CREATE UNIQUE INDEX "ShopIntakeToken_shopId_key" ON "ShopIntakeToken"("shopId");
CREATE INDEX "ShopIntakeToken_platformId_idx" ON "ShopIntakeToken"("platformId");
CREATE INDEX "ShopIntakeToken_expiresAt_idx" ON "ShopIntakeToken"("expiresAt");

ALTER TABLE "ShopIntakeToken" ADD CONSTRAINT "ShopIntakeToken_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopIntakeToken" ADD CONSTRAINT "ShopIntakeToken_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
