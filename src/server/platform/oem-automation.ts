import "server-only";

import { prisma } from "@/db/client";
import {
  AutomationJobStatus,
  HealthAlertSeverity,
  ScraperSourceHealthStatus,
  ScraperSourceStatus,
  type Prisma,
} from "@/generated/prisma";
import {
  DEFAULT_SCRAPER_SOURCES,
  OEM_AUTOMATION_JOBS,
  OEM_HEALTH_PROBE,
  type OemAutomationJobName,
} from "@/lib/oem-automation-sources";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function buildProbeUrl(
  baseUrl: string,
  endpoints: unknown,
  endpointKey: string,
  vehicle: typeof OEM_HEALTH_PROBE,
): string {
  const base = baseUrl.replace(/\/$/, "");
  const eps = asRecord(endpoints);
  const template = String(eps[endpointKey] ?? eps.health ?? eps.search ?? "/");
  const path = template
    .replace("{year}", String(vehicle.year))
    .replace("{make}", vehicle.make)
    .replace("{model}", vehicle.model)
    .replace("{vin}", vehicle.vin);
  if (path.startsWith("http")) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export type {
  AutomationJobRunRow,
  DataFreshness,
  FallbackEventRow,
  HealthAlertRow,
  RedundancyMeta,
  ScraperSourceRow,
  SourceHealthLogRow,
} from "@/lib/oem-automation-types";
import type {
  AutomationJobRunRow,
  DataFreshness,
  FallbackEventRow,
  HealthAlertRow,
  RedundancyMeta,
  ScraperSourceRow,
  SourceHealthLogRow,
} from "@/lib/oem-automation-types";

export function buildRedundancyMeta(opts: {
  source: string;
  fallbackUsed?: boolean;
  cacheAgeSeconds?: number | null;
  healthStatus?: DataFreshness;
}): { meta: RedundancyMeta } {
  return {
    meta: {
      source: opts.source,
      fallback_used: opts.fallbackUsed ?? false,
      cache_age_seconds: opts.cacheAgeSeconds ?? null,
      health_status: opts.healthStatus ?? "live",
    },
  };
}

export async function listScraperSources(): Promise<ScraperSourceRow[]> {
  return prisma.scraperSource.findMany({
    orderBy: [{ priority: "asc" }, { sourceName: "asc" }],
    select: {
      id: true,
      sourceName: true,
      baseUrl: true,
      status: true,
      healthStatus: true,
      priority: true,
      originalPriority: true,
      lastHealthyCheck: true,
      lastAttempted: true,
      successCount: true,
      failureCount: true,
      lastError: true,
      updatedAt: true,
    },
  });
}

export async function listRecentFallbackEvents(limit = 25): Promise<FallbackEventRow[]> {
  return prisma.fallbackEvent.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
    select: {
      id: true,
      timestamp: true,
      dataType: true,
      primarySource: true,
      fallbackSource: true,
      success: true,
    },
  });
}

export async function listRecentSourceHealthLogs(limit = 30): Promise<SourceHealthLogRow[]> {
  const rows = await prisma.sourceHealthLog.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
    select: {
      id: true,
      sourceId: true,
      timestamp: true,
      status: true,
      responseTimeMs: true,
      errorMessage: true,
      source: { select: { sourceName: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    sourceId: row.sourceId,
    sourceName: row.source.sourceName,
    timestamp: row.timestamp,
    status: row.status,
    responseTimeMs: row.responseTimeMs,
    errorMessage: row.errorMessage,
  }));
}

export async function listOpenHealthAlerts(limit = 25): Promise<HealthAlertRow[]> {
  return prisma.healthAlert.findMany({
    where: { resolvedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      sourceName: true,
      severity: true,
      message: true,
      createdAt: true,
      resolvedAt: true,
    },
  });
}

export async function listRecentAutomationJobRuns(limit = 20): Promise<AutomationJobRunRow[]> {
  return prisma.automationJobRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    select: {
      id: true,
      jobName: true,
      startedAt: true,
      finishedAt: true,
      status: true,
      nextScheduledAt: true,
      errorMessage: true,
    },
  });
}

export async function getLatestJobRunsByName(): Promise<
  Partial<Record<OemAutomationJobName, AutomationJobRunRow>>
> {
  const out: Partial<Record<OemAutomationJobName, AutomationJobRunRow>> = {};
  for (const jobName of OEM_AUTOMATION_JOBS) {
    const row = await prisma.automationJobRun.findFirst({
      where: { jobName },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        jobName: true,
        startedAt: true,
        finishedAt: true,
        status: true,
        nextScheduledAt: true,
        errorMessage: true,
      },
    });
    if (row) out[jobName] = row;
  }
  return out;
}

export async function seedScraperSources(): Promise<number> {
  let count = 0;
  for (const src of DEFAULT_SCRAPER_SOURCES) {
    await prisma.scraperSource.upsert({
      where: { sourceName: src.sourceName },
      create: {
        sourceName: src.sourceName,
        baseUrl: src.baseUrl,
        endpoints: src.endpoints as Prisma.InputJsonValue,
        selectors: src.selectors as Prisma.InputJsonValue,
        priority: src.priority,
        status: ScraperSourceStatus.active,
      },
      update: {
        baseUrl: src.baseUrl,
        endpoints: src.endpoints as Prisma.InputJsonValue,
        selectors: src.selectors as Prisma.InputJsonValue,
        priority: src.priority,
      },
    });
    count += 1;
  }
  return count;
}

async function checkOneSource(source: {
  id: string;
  sourceName: string;
  baseUrl: string;
  endpoints: unknown;
  selectors: unknown;
  priority: number;
  originalPriority: number | null;
}): Promise<{ ok: boolean; error?: string; url: string }> {
  const url = buildProbeUrl(source.baseUrl, source.endpoints, "health", OEM_HEALTH_PROBE);
  const selectors = asRecord(source.selectors);
  const marker = String(selectors.health_marker ?? selectors.result_marker ?? "");
  const started = Date.now();

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "ShopRally-OEM-Health/1.0" },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const text = await resp.text();
    const responseTimeMs = Date.now() - started;
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    if (marker && !text.includes(marker)) {
      throw new Error(`Missing selector marker: ${marker}`);
    }

    await prisma.scraperSource.update({
      where: { id: source.id },
      data: {
        status: ScraperSourceStatus.active,
        healthStatus: ScraperSourceHealthStatus.healthy,
        lastError: null,
        lastHealthyCheck: new Date(),
        lastAttempted: new Date(),
        successCount: { increment: 1 },
      },
    });
    await prisma.sourceHealthLog.create({
      data: {
        sourceId: source.id,
        status: ScraperSourceHealthStatus.healthy,
        responseTimeMs,
      },
    });

    const recent = await prisma.sourceHealthLog.findMany({
      where: { sourceId: source.id },
      orderBy: { timestamp: "desc" },
      take: 2,
      select: { status: true },
    });
    if (
      recent.length >= 2 &&
      recent.every((r) => r.status === ScraperSourceHealthStatus.healthy) &&
      source.priority === 999
    ) {
      await prisma.scraperSource.update({
        where: { id: source.id },
        data: {
          priority: source.originalPriority ?? 10,
          originalPriority: null,
        },
      });
    }

    return { ok: true, url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health check failed";
    const responseTimeMs = Date.now() - started;
    await prisma.scraperSource.update({
      where: { id: source.id },
      data: {
        status: ScraperSourceStatus.degraded,
        healthStatus: ScraperSourceHealthStatus.degraded,
        lastError: message,
        lastAttempted: new Date(),
        failureCount: { increment: 1 },
      },
    });
    await prisma.sourceHealthLog.create({
      data: {
        sourceId: source.id,
        status: ScraperSourceHealthStatus.degraded,
        responseTimeMs,
        errorMessage: message,
      },
    });

    const recent = await prisma.sourceHealthLog.findMany({
      where: { sourceId: source.id },
      orderBy: { timestamp: "desc" },
      take: 2,
      select: { status: true },
    });
    if (
      recent.length >= 2 &&
      recent.every((r) => r.status === ScraperSourceHealthStatus.degraded)
    ) {
      await prisma.scraperSource.update({
        where: { id: source.id },
        data: {
          priority: 999,
          originalPriority: source.originalPriority ?? source.priority,
        },
      });
    }

    await prisma.healthAlert.create({
      data: {
        sourceId: source.id,
        sourceName: source.sourceName,
        severity: HealthAlertSeverity.warning,
        message: `Health check failed: ${message}`,
        detail: { url, marker } as Prisma.InputJsonValue,
      },
    });
    return { ok: false, error: message, url };
  }
}

export async function runPlatformHealthChecks(): Promise<{
  checkedAt: string;
  sourcesChecked: number;
  healthy: number;
  degraded: number;
  results: Array<{ source: string; ok: boolean; error?: string; url: string }>;
}> {
  const sources = await prisma.scraperSource.findMany({
    where: { status: { not: ScraperSourceStatus.disabled } },
    orderBy: [{ priority: "asc" }, { sourceName: "asc" }],
  });

  const results = [];
  for (const source of sources) {
    const result = await checkOneSource(source);
    results.push({
      source: source.sourceName,
      ok: result.ok,
      error: result.error,
      url: result.url,
    });
  }

  const healthy = results.filter((r) => r.ok).length;
  return {
    checkedAt: new Date().toISOString(),
    sourcesChecked: results.length,
    healthy,
    degraded: results.length - healthy,
    results,
  };
}

export function buildRepairSourcePrompt(
  source: {
    sourceName: string;
    baseUrl: string;
    endpoints: unknown;
    selectors: unknown;
    lastError: string | null;
  },
  sampleResponse?: string | null,
): string {
  const endpoints = asRecord(source.endpoints);
  const selectors = asRecord(source.selectors);
  const configJson = JSON.stringify(
    { baseUrl: source.baseUrl, endpoints, selectors },
    null,
    2,
  );
  const sample = (sampleResponse ?? "No sample provided — paste HTML/JSON from browser.").slice(
    0,
    2000,
  );

  return `# ShopRally OEM source repair — ${source.sourceName}

## Context
An automated health check failed for scraper source \`${source.sourceName}\`.
Update the Postgres \`ScraperSource\` row AND adjust spider/pipeline code if selectors changed.

## Broken config (current DB)
\`\`\`json
${configJson}
\`\`\`

## Last error
${source.lastError ?? "No recorded error"}

## Sample response (truncated)
\`\`\`
${sample}
\`\`\`

## Tasks
1. Inspect the sample response and identify new DOM/JSON paths.
2. Emit SQL UPDATE for \`"ScraperSource"\` WHERE \`"sourceName" = '${source.sourceName}'\`:
   - Fix \`endpoints\` JSON (health + catalog/fluids paths)
   - Fix \`selectors\` JSON (\`health_marker\`, \`result_marker\`, etc.)
   - Set \`status = 'active'\` after verification
3. Update \`services/oem-automation/oem_scraper/pipeline.py\` or \`fluid_harvest/fluid_normalizer.py\` if parsing logic changed.
4. Re-run health check from Platform → System → **Run health check now**.

## SQL template
\`\`\`sql
UPDATE "ScraperSource"
SET endpoints = '{...}'::jsonb,
    selectors = '{...}'::jsonb,
    status = 'active',
    "lastError" = NULL,
    "updatedAt" = NOW()
WHERE "sourceName" = '${source.sourceName}';
\`\`\``;
}

export async function getRepairSourcePrompt(input: {
  sourceName: string;
  sampleResponse?: string | null;
}): Promise<{ ok: true; prompt: string } | { ok: false; error: string }> {
  const source = await prisma.scraperSource.findUnique({
    where: { sourceName: input.sourceName },
  });
  if (!source) return { ok: false, error: `Unknown source: ${input.sourceName}` };
  return {
    ok: true,
    prompt: buildRepairSourcePrompt(source, input.sampleResponse),
  };
}

const STALE_DAYS = Number(process.env.OEM_STALE_DAYS ?? "180");

/** Derive labor-guide data freshness from platform source health + cache age. */
export async function getAutomotiveDataFreshness(opts?: {
  cached?: boolean;
  cacheAgeDays?: number | null;
}): Promise<{ freshness: DataFreshness; warning?: string }> {
  const sources = await prisma.scraperSource.findMany({
    select: { status: true, lastHealthyCheck: true },
  });

  if (sources.length === 0) {
    return { freshness: "live" };
  }

  const anyActive = sources.some((s) => s.status === ScraperSourceStatus.active);
  const allDegradedOrDisabled = sources.every(
    (s) =>
      s.status === ScraperSourceStatus.degraded || s.status === ScraperSourceStatus.disabled,
  );

  const oldestCheck = sources
    .map((s) => s.lastHealthyCheck)
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const ageDays =
    opts?.cacheAgeDays ??
    (oldestCheck
      ? Math.floor((Date.now() - oldestCheck.getTime()) / (1000 * 60 * 60 * 24))
      : STALE_DAYS + 1);

  const servingCache = opts?.cached === true || allDegradedOrDisabled;

  if (servingCache && (ageDays > STALE_DAYS || allDegradedOrDisabled)) {
    return {
      freshness: "stale",
      warning: "OEM data sources degraded — verify labor/fluid specs before quoting.",
    };
  }

  if (servingCache) {
    return {
      freshness: "cached",
      warning: "Serving cached OEM data — one or more sources are degraded.",
    };
  }

  if (!anyActive && ageDays > STALE_DAYS) {
    return {
      freshness: "stale",
      warning: "OEM health checks are older than 180 days — data may be outdated.",
    };
  }

  return { freshness: "live" };
}
