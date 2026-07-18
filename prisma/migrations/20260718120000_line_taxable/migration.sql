-- Per-line taxable flags for labor/part estimate lines (expand).
-- Backfill from job-level laborTaxable / partsTaxable so existing tax behavior is preserved.
-- Job.laborTaxable / Job.partsTaxable remain as defaults for newly added lines.

ALTER TABLE "LaborLine" ADD COLUMN "taxable" BOOLEAN;

UPDATE "LaborLine" AS l
SET "taxable" = j."laborTaxable"
FROM "Job" AS j
WHERE l."jobId" = j."id";

UPDATE "LaborLine" SET "taxable" = true WHERE "taxable" IS NULL;

ALTER TABLE "LaborLine" ALTER COLUMN "taxable" SET DEFAULT true;
ALTER TABLE "LaborLine" ALTER COLUMN "taxable" SET NOT NULL;

ALTER TABLE "PartLine" ADD COLUMN "taxable" BOOLEAN;

UPDATE "PartLine" AS p
SET "taxable" = j."partsTaxable"
FROM "Job" AS j
WHERE p."jobId" = j."id";

UPDATE "PartLine" SET "taxable" = true WHERE "taxable" IS NULL;

ALTER TABLE "PartLine" ALTER COLUMN "taxable" SET DEFAULT true;
ALTER TABLE "PartLine" ALTER COLUMN "taxable" SET NOT NULL;
