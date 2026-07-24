import type {
  AutomationJobStatus,
  HealthAlertSeverity,
  ScraperSourceHealthStatus,
  ScraperSourceStatus,
} from "@/generated/prisma";

/** Shared OEM automation types — safe for client + server (no server-only imports). */

export type DataFreshness = "live" | "cached" | "stale";

export type ScraperSourceRow = {
  id: string;
  sourceName: string;
  baseUrl: string;
  status: ScraperSourceStatus;
  healthStatus: ScraperSourceHealthStatus;
  priority: number;
  originalPriority: number | null;
  lastHealthyCheck: Date | null;
  lastAttempted: Date | null;
  successCount: number;
  failureCount: number;
  lastError: string | null;
  updatedAt: Date;
};

export type FallbackEventRow = {
  id: string;
  timestamp: Date;
  dataType: string;
  primarySource: string | null;
  fallbackSource: string | null;
  success: boolean;
};

export type SourceHealthLogRow = {
  id: string;
  sourceId: string;
  sourceName: string;
  timestamp: Date;
  status: ScraperSourceHealthStatus;
  responseTimeMs: number | null;
  errorMessage: string | null;
};

export type RedundancyMeta = {
  source: string;
  fallback_used: boolean;
  cache_age_seconds: number | null;
  health_status: DataFreshness;
};

export type HealthAlertRow = {
  id: string;
  sourceName: string;
  severity: HealthAlertSeverity;
  message: string;
  createdAt: Date;
  resolvedAt: Date | null;
};

export type AutomationJobRunRow = {
  id: string;
  jobName: string;
  startedAt: Date;
  finishedAt: Date | null;
  status: AutomationJobStatus;
  nextScheduledAt: Date | null;
  errorMessage: string | null;
};
