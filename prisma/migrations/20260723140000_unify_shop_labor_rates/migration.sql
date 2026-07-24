-- Unify RO Settings labor rates + canned-job labor catalog on ShopLaborItem.

ALTER TABLE "ShopLaborItem" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Copy legacy LaborRate rows into ShopLaborItem when the table exists (local db push / early adopters).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LaborRate'
  ) THEN
    INSERT INTO "ShopLaborItem" (
      "id", "shopId", "name", "description", "rateCents", "defaultHours",
      "costCents", "taxable", "isActive", "isDefault", "sortOrder", "createdAt", "updatedAt"
    )
    SELECT
      lr."id",
      lr."shopId",
      lr."name",
      NULL,
      lr."rateCents",
      1,
      0,
      true,
      true,
      lr."isDefault",
      lr."sortOrder",
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM "LaborRate" lr
    WHERE NOT EXISTS (
      SELECT 1 FROM "ShopLaborItem" sli
      WHERE sli."shopId" = lr."shopId" AND sli."name" = lr."name"
    );

    UPDATE "ShopLaborItem" sli
    SET "isDefault" = true
    FROM "LaborRate" lr
    WHERE sli."shopId" = lr."shopId"
      AND sli."name" = lr."name"
      AND lr."isDefault" = true;
  END IF;
END $$;

-- Ensure each shop has at most one default row (lowest sortOrder wins).
UPDATE "ShopLaborItem" sli
SET "isDefault" = (sli."id" = sub."pickId")
FROM (
  SELECT DISTINCT ON ("shopId") "shopId", "id" AS "pickId"
  FROM "ShopLaborItem"
  WHERE "isDefault" = true
  ORDER BY "shopId", "sortOrder" ASC, "name" ASC
) sub
WHERE sli."shopId" = sub."shopId";
