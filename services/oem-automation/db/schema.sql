-- OEM automation platform tables (mirrors Prisma migrations)
-- Use when bootstrapping outside Prisma migrate.

CREATE TYPE IF NOT EXISTS "ScraperSourceStatus" AS ENUM ('active', 'degraded', 'disabled');
CREATE TYPE IF NOT EXISTS "ScraperSourceHealthStatus" AS ENUM ('unknown', 'healthy', 'degraded');
CREATE TYPE IF NOT EXISTS "HealthAlertSeverity" AS ENUM ('info', 'warning', 'critical');
CREATE TYPE IF NOT EXISTS "AutomationJobStatus" AS ENUM ('running', 'success', 'failed', 'skipped');

CREATE TABLE IF NOT EXISTS "ScraperSource" (
    "id" TEXT PRIMARY KEY,
    "sourceName" TEXT NOT NULL UNIQUE,
    "baseUrl" TEXT NOT NULL,
    "endpoints" JSONB NOT NULL DEFAULT '{}',
    "selectors" JSONB NOT NULL DEFAULT '{}',
    "status" "ScraperSourceStatus" NOT NULL DEFAULT 'active',
    "healthStatus" "ScraperSourceHealthStatus" NOT NULL DEFAULT 'unknown',
    "priority" INTEGER NOT NULL DEFAULT 10,
    "originalPriority" INTEGER,
    "lastHealthyCheck" TIMESTAMP(3),
    "lastAttempted" TIMESTAMP(3),
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "HealthAlert" (
    "id" TEXT PRIMARY KEY,
    "sourceId" TEXT REFERENCES "ScraperSource"("id") ON DELETE SET NULL,
    "sourceName" TEXT NOT NULL,
    "severity" "HealthAlertSeverity" NOT NULL DEFAULT 'warning',
    "message" TEXT NOT NULL,
    "detail" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AutomationJobRun" (
    "id" TEXT PRIMARY KEY,
    "jobName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "AutomationJobStatus" NOT NULL DEFAULT 'running',
    "detail" JSONB,
    "nextScheduledAt" TIMESTAMP(3),
    "errorMessage" TEXT
);

CREATE TABLE IF NOT EXISTS "SourceHealthLog" (
    "id" TEXT PRIMARY KEY,
    "sourceId" TEXT NOT NULL REFERENCES "ScraperSource"("id") ON DELETE CASCADE,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ScraperSourceHealthStatus" NOT NULL,
    "responseTimeMs" INTEGER,
    "errorMessage" TEXT
);

CREATE TABLE IF NOT EXISTS "FallbackEvent" (
    "id" TEXT PRIMARY KEY,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataType" TEXT NOT NULL,
    "primarySource" TEXT,
    "fallbackSource" TEXT,
    "success" BOOLEAN NOT NULL,
    "details" JSONB
);

CREATE INDEX IF NOT EXISTS "ScraperSource_status_priority_idx" ON "ScraperSource"("status", "priority");
CREATE INDEX IF NOT EXISTS "ScraperSource_healthStatus_idx" ON "ScraperSource"("healthStatus");
CREATE INDEX IF NOT EXISTS "HealthAlert_createdAt_idx" ON "HealthAlert"("createdAt");
CREATE INDEX IF NOT EXISTS "AutomationJobRun_jobName_startedAt_idx" ON "AutomationJobRun"("jobName", "startedAt");
CREATE INDEX IF NOT EXISTS "SourceHealthLog_sourceId_timestamp_idx" ON "SourceHealthLog"("sourceId", "timestamp");
CREATE INDEX IF NOT EXISTS "SourceHealthLog_timestamp_idx" ON "SourceHealthLog"("timestamp");
CREATE INDEX IF NOT EXISTS "FallbackEvent_timestamp_idx" ON "FallbackEvent"("timestamp");
CREATE INDEX IF NOT EXISTS "FallbackEvent_dataType_idx" ON "FallbackEvent"("dataType");
