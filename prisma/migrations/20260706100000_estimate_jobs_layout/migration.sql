-- Idempotent — enum/column may already exist from prior db push during 3031 dev.
DO $$ BEGIN
    CREATE TYPE "EstimateJobsLayout" AS ENUM ('INLINE', 'TEKMETRIC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "estimateJobsLayout" "EstimateJobsLayout" NOT NULL DEFAULT 'INLINE';
