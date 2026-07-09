import { z } from "zod";

import type { SeoVerificationInstructions } from "@/lib/seo-verification";

export const AddExternalSeoPropertySchema = z.object({
  domain: z
    .string()
    .trim()
    .min(4)
    .max(253)
    .refine(
      (v) => /^https?:\/\/.+/i.test(v) || /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(v),
      "Enter a domain (example.com) or full URL (https://example.com).",
    ),
});

export type SeoAuditSummary = {
  seoScore: number;
  siteUrl: string | null;
  published: boolean;
  checklist: { id: string; label: string; completed: boolean }[];
  openItems: string[];
  skippedReason?: string;
  gscMetrics?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    days: number;
  };
  gscPropertyUrl?: string | null;
};

export type SeoPropertyView = {
  id: string;
  domain: string;
  source: "MICROSITE" | "CUSTOM_DOMAIN" | "EXTERNAL";
  status: "ACTIVE" | "PAUSED" | "PENDING_VERIFICATION";
  automationEnabled: boolean;
  autoPublish: boolean;
  siteUrl: string | null;
  gscPropertyUrl: string | null;
  verified: boolean;
  verification: SeoVerificationInstructions | null;
  cnameTarget: string | null;
  lastAuditAt: string | null;
  nextRunAt: string | null;
  latestScore: number | null;
  latestRunStatus: "SUCCESS" | "FAILED" | "SKIPPED" | null;
};

export type GscIntegrationView = {
  configured: boolean;
  connected: boolean;
  sites: string[];
};

export type SeoContentRunSummary = {
  servicesAdded?: number;
  keywordsAdded?: number;
  metaUpdated?: boolean;
  contentSource?: "ai" | "template";
  aiFallbackReason?: string;
};

export type SeoAutomationRunView = {
  id: string;
  jobType: string;
  status: string;
  seoScore: number | null;
  openItems: string[];
  gscClicks: number | null;
  gscImpressions: number | null;
  error: string | null;
  finishedAt: string | null;
  contentSummary?: SeoContentRunSummary | null;
};

export type PlatformSeoPropertyRow = {
  id: string;
  shopId: string;
  shopName: string;
  shopCode: string;
  domain: string;
  source: string;
  status: string;
  automationEnabled: boolean;
  verified: boolean;
  lastAuditAt: string | null;
  latestScore: number | null;
};

export type PlatformSeoAdmin = {
  properties: PlatformSeoPropertyRow[];
  stats: {
    total: number;
    autopilotOn: number;
    pendingVerification: number;
  };
};

export type SeoAutomationSettingsView = {
  contentAutopilotEnabled: boolean;
  useAiContent: boolean;
  monthlyReportEnabled: boolean;
  reportEmail: string | null;
  lastContentRunAt: string | null;
  lastReportSentAt: string | null;
  dismissedRecommendations: string[];
  snoozedRecommendations: { label: string; until: string }[];
};

export type SeoAutomationAdmin = {
  hasFeature: boolean;
  aiSeoContent: boolean;
  aiConfigured: boolean;
  gsc: GscIntegrationView;
  settings: SeoAutomationSettingsView;
  customDomain: string | null;
  cnameTarget: string;
  properties: SeoPropertyView[];
  recentRuns: SeoAutomationRunView[];
};

/** Normalize user-entered domain/URL to a stable hostname key. */
export function normalizeSeoDomain(input: string): string {
  const trimmed = input.trim();
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProto).hostname.toLowerCase();
  } catch {
    return trimmed.toLowerCase().replace(/^www\./, "");
  }
}

export function parseContentRunSummary(raw: unknown): SeoContentRunSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const contentSource =
    o.contentSource === "ai" || o.contentSource === "template" ? o.contentSource : undefined;
  return {
    servicesAdded: typeof o.servicesAdded === "number" ? o.servicesAdded : undefined,
    keywordsAdded: typeof o.keywordsAdded === "number" ? o.keywordsAdded : undefined,
    metaUpdated: typeof o.metaUpdated === "boolean" ? o.metaUpdated : undefined,
    contentSource,
    aiFallbackReason:
      typeof o.aiFallbackReason === "string" ? o.aiFallbackReason : undefined,
  };
}

export function parseAuditSummary(raw: unknown): SeoAuditSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.seoScore !== "number") return null;
  const gscRaw = o.gscMetrics;
  const gscMetrics =
    gscRaw &&
    typeof gscRaw === "object" &&
    !Array.isArray(gscRaw) &&
    typeof (gscRaw as { clicks?: unknown }).clicks === "number"
      ? {
          clicks: (gscRaw as { clicks: number }).clicks,
          impressions: Number((gscRaw as { impressions?: number }).impressions ?? 0),
          ctr: Number((gscRaw as { ctr?: number }).ctr ?? 0),
          position: Number((gscRaw as { position?: number }).position ?? 0),
          days: Number((gscRaw as { days?: number }).days ?? 28),
        }
      : undefined;
  return {
    seoScore: o.seoScore,
    siteUrl: typeof o.siteUrl === "string" ? o.siteUrl : null,
    published: Boolean(o.published),
    checklist: Array.isArray(o.checklist)
      ? o.checklist
          .filter(
            (row): row is { id: string; label: string; completed: boolean } =>
              !!row &&
              typeof row === "object" &&
              typeof (row as { id: unknown }).id === "string" &&
              typeof (row as { label: unknown }).label === "string" &&
              typeof (row as { completed: unknown }).completed === "boolean",
          )
          .map((row) => ({
            id: row.id,
            label: row.label,
            completed: row.completed,
          }))
      : [],
    openItems: Array.isArray(o.openItems)
      ? o.openItems.filter((x): x is string => typeof x === "string")
      : [],
    skippedReason: typeof o.skippedReason === "string" ? o.skippedReason : undefined,
    gscMetrics,
    gscPropertyUrl: typeof o.gscPropertyUrl === "string" ? o.gscPropertyUrl : null,
  };
}
