import "server-only";

import { prisma } from "@/db/client";

export type SnoozedRecommendation = {
  label: string;
  until: string;
};

export type ShopSeoSettingsView = {
  contentAutopilotEnabled: boolean;
  useAiContent: boolean;
  monthlyReportEnabled: boolean;
  reportEmail: string | null;
  lastContentRunAt: string | null;
  lastReportSentAt: string | null;
  dismissedRecommendations: string[];
  snoozedRecommendations: SnoozedRecommendation[];
};

function parseDismissedRecommendations(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function parseSnoozedRecommendations(raw: unknown): SnoozedRecommendation[] {
  if (!Array.isArray(raw)) return [];
  const out: SnoozedRecommendation[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const o = row as Record<string, unknown>;
    if (typeof o.label !== "string" || typeof o.until !== "string") continue;
    out.push({ label: o.label, until: o.until });
  }
  return out;
}

export function activeSnoozedLabels(
  snoozed: SnoozedRecommendation[],
  now = Date.now(),
): Set<string> {
  const labels = new Set<string>();
  for (const row of snoozed) {
    const untilMs = Date.parse(row.until);
    if (Number.isFinite(untilMs) && untilMs > now) {
      labels.add(row.label);
    }
  }
  return labels;
}

export async function ensureShopSeoSettings(shopId: string): Promise<ShopSeoSettingsView> {
  const row = await prisma.shopSeoSettings.upsert({
    where: { shopId },
    create: { shopId },
    update: {},
  });

  return {
    contentAutopilotEnabled: row.contentAutopilotEnabled,
    useAiContent: row.useAiContent,
    monthlyReportEnabled: row.monthlyReportEnabled,
    reportEmail: row.reportEmail,
    lastContentRunAt: row.lastContentRunAt?.toISOString() ?? null,
    lastReportSentAt: row.lastReportSentAt?.toISOString() ?? null,
    dismissedRecommendations: parseDismissedRecommendations(row.dismissedRecommendations),
    snoozedRecommendations: parseSnoozedRecommendations(row.snoozedRecommendations),
  };
}

export async function updateShopSeoSettings(
  shopId: string,
  patch: {
    contentAutopilotEnabled?: boolean;
    useAiContent?: boolean;
    monthlyReportEnabled?: boolean;
    reportEmail?: string | null;
    dismissedRecommendations?: string[];
    snoozedRecommendations?: SnoozedRecommendation[];
  },
) {
  await ensureShopSeoSettings(shopId);
  await prisma.shopSeoSettings.update({
    where: { shopId },
    data: {
      ...(patch.contentAutopilotEnabled !== undefined
        ? { contentAutopilotEnabled: patch.contentAutopilotEnabled }
        : {}),
      ...(patch.useAiContent !== undefined ? { useAiContent: patch.useAiContent } : {}),
      ...(patch.monthlyReportEnabled !== undefined
        ? { monthlyReportEnabled: patch.monthlyReportEnabled }
        : {}),
      ...(patch.reportEmail !== undefined ? { reportEmail: patch.reportEmail } : {}),
      ...(patch.dismissedRecommendations !== undefined
        ? { dismissedRecommendations: patch.dismissedRecommendations }
        : {}),
      ...(patch.snoozedRecommendations !== undefined
        ? { snoozedRecommendations: patch.snoozedRecommendations }
        : {}),
    },
  });
}

export async function dismissSeoRecommendation(shopId: string, label: string): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) return;
  const current = await ensureShopSeoSettings(shopId);
  if (current.dismissedRecommendations.includes(trimmed)) return;
  await updateShopSeoSettings(shopId, {
    dismissedRecommendations: [...current.dismissedRecommendations, trimmed],
  });
}

export async function snoozeSeoRecommendation(
  shopId: string,
  label: string,
  days = 7,
): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) return;
  const current = await ensureShopSeoSettings(shopId);
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const withoutLabel = current.snoozedRecommendations.filter((row) => row.label !== trimmed);
  await updateShopSeoSettings(shopId, {
    snoozedRecommendations: [...withoutLabel, { label: trimmed, until }],
  });
}
