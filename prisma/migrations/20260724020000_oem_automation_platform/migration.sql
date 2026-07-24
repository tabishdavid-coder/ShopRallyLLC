-- CreateEnum
CREATE TYPE "ScraperSourceStatus" AS ENUM ('active', 'degraded', 'disabled');

-- CreateEnum
CREATE TYPE "HealthAlertSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "AutomationJobStatus" AS ENUM ('running', 'success', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "ScraperSource" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "endpoints" JSONB NOT NULL DEFAULT '{}',
    "selectors" JSONB NOT NULL DEFAULT '{}',
    "status" "ScraperSourceStatus" NOT NULL DEFAULT 'active',
    "priority" INTEGER NOT NULL DEFAULT 10,
    "lastHealthyCheck" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScraperSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthAlert" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceName" TEXT NOT NULL,
    "severity" "HealthAlertSeverity" NOT NULL DEFAULT 'warning',
    "message" TEXT NOT NULL,
    "detail" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationJobRun" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "AutomationJobStatus" NOT NULL DEFAULT 'running',
    "detail" JSONB,
    "nextScheduledAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "AutomationJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScraperSource_sourceName_key" ON "ScraperSource"("sourceName");

-- CreateIndex
CREATE INDEX "ScraperSource_status_priority_idx" ON "ScraperSource"("status", "priority");

-- CreateIndex
CREATE INDEX "HealthAlert_createdAt_idx" ON "HealthAlert"("createdAt");

-- CreateIndex
CREATE INDEX "HealthAlert_sourceName_idx" ON "HealthAlert"("sourceName");

-- CreateIndex
CREATE INDEX "HealthAlert_resolvedAt_idx" ON "HealthAlert"("resolvedAt");

-- CreateIndex
CREATE INDEX "AutomationJobRun_jobName_startedAt_idx" ON "AutomationJobRun"("jobName", "startedAt");

-- CreateIndex
CREATE INDEX "AutomationJobRun_startedAt_idx" ON "AutomationJobRun"("startedAt");

-- AddForeignKey
ALTER TABLE "HealthAlert" ADD CONSTRAINT "HealthAlert_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ScraperSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
