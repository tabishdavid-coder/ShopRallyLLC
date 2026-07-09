-- AlterTable: Shop Master ID (human-readable tenant identifier)
ALTER TABLE "Shop" ADD COLUMN "masterId" TEXT;
ALTER TABLE "Shop" ADD COLUMN "masterIdCreatedAt" TIMESTAMP(3);

-- Backfill existing shops (deterministic from id + code)
UPDATE "Shop"
SET
  "masterId" = 'RP-' || UPPER(REGEXP_REPLACE("code", '[^A-Za-z0-9]', '', 'g')) || '-' ||
    LPAD(
      (
        (
          ('x' || SUBSTRING(MD5("id" || "code"), 1, 8))::bit(32)::bigint % 900000
        ) + 100000
      )::text,
      6,
      '0'
    ),
  "masterIdCreatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "masterId" IS NULL;

-- Known demo shops get stable IDs for docs / testing
UPDATE "Shop" SET "masterId" = 'RP-IO-784291', "masterIdCreatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP) WHERE "id" = 'shop_demo';
UPDATE "Shop" SET "masterId" = 'RP-EA-392847', "masterIdCreatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP) WHERE "id" = 'shop_eastside';

ALTER TABLE "Shop" ALTER COLUMN "masterId" SET NOT NULL;
ALTER TABLE "Shop" ALTER COLUMN "masterIdCreatedAt" SET NOT NULL;
ALTER TABLE "Shop" ALTER COLUMN "masterIdCreatedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Shop_masterId_key" ON "Shop"("masterId");
