-- Line sort order for estimate building lab (labor/part row reorder within jobs)
ALTER TABLE "LaborLine" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PartLine" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
