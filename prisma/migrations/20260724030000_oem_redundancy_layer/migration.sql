-- Expand-only: OEM redundancy layer (SourceHealthLog, FallbackEvent, ScraperSource metrics)

CREATE TYPE "ScraperSourceHealthStatus" AS ENUM ('unknown', 'healthy', 'degraded');

ALTER TABLE "ScraperSource" ADD COLUMN IF NOT EXISTS "healthStatus" "ScraperSourceHealthStatus" NOT NULL DEFAULT 'unknown';
ALTER TABLE "ScraperSource" ADD COLUMN IF NOT EXISTS "originalPriority" INTEGER;
ALTER TABLE "ScraperSource" ADD COLUMN IF NOT EXISTS "lastAttempted" TIMESTAMP(3);
ALTER TABLE "ScraperSource" ADD COLUMN IF NOT EXISTS "successCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScraperSource" ADD COLUMN IF NOT EXISTS "failureCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "ScraperSource_healthStatus_idx" ON "ScraperSource"("healthStatus");

CREATE TABLE IF NOT EXISTS "SourceHealthLog" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ScraperSourceHealthStatus" NOT NULL,
    "responseTimeMs" INTEGER,
    "errorMessage" TEXT,

    CONSTRAINT "SourceHealthLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FallbackEvent" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataType" TEXT NOT NULL,
    "primarySource" TEXT,
    "fallbackSource" TEXT,
    "success" BOOLEAN NOT NULL,
    "details" JSONB,

    CONSTRAINT "FallbackEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SourceHealthLog_sourceId_timestamp_idx" ON "SourceHealthLog"("sourceId", "timestamp");
CREATE INDEX IF NOT EXISTS "SourceHealthLog_timestamp_idx" ON "SourceHealthLog"("timestamp");
CREATE INDEX IF NOT EXISTS "FallbackEvent_timestamp_idx" ON "FallbackEvent"("timestamp");
CREATE INDEX IF NOT EXISTS "FallbackEvent_dataType_idx" ON "FallbackEvent"("dataType");

ALTER TABLE "SourceHealthLog" ADD CONSTRAINT "SourceHealthLog_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "ScraperSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
