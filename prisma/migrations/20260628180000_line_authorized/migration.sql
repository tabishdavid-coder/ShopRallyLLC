-- AlterTable: line-level authorization for estimate/WIP totals
ALTER TABLE "LaborLine" ADD COLUMN IF NOT EXISTS "authorized" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PartLine" ADD COLUMN IF NOT EXISTS "authorized" BOOLEAN NOT NULL DEFAULT true;
