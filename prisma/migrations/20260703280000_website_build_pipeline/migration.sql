-- Master CRM ShopSite build pipeline on ShopWebsiteConfig

CREATE TYPE "WebsiteBuildStatus" AS ENUM (
  'NOT_STARTED',
  'QUOTE_REQUESTED',
  'IN_BUILD',
  'CLIENT_REVIEW',
  'LAUNCHED',
  'UPKEEP',
  'PAUSED'
);

ALTER TABLE "ShopWebsiteConfig"
  ADD COLUMN "buildStatus" "WebsiteBuildStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "operatorNotes" TEXT,
  ADD COLUMN "launchedAt" TIMESTAMP(3),
  ADD COLUMN "lastOperatorReviewAt" TIMESTAMP(3),
  ADD COLUMN "nextReviewDueAt" TIMESTAMP(3);

-- Shops already published → treat as launched in pipeline
UPDATE "ShopWebsiteConfig"
SET "buildStatus" = 'LAUNCHED', "launchedAt" = COALESCE("launchedAt", "updatedAt")
WHERE "published" = true;
