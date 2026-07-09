import "server-only";

import type { AiFeature } from "@/generated/prisma";
import { prisma } from "@/db/client";

export type PlatformAiUsageSummary = {
  last30Days: {
    totalCalls: number;
    totalTokens: number;
    byFeature: { feature: AiFeature; calls: number; tokens: number }[];
  };
  last24Hours: number;
};

const FEATURE_LABEL: Record<AiFeature, string> = {
  REVIEW_REPLY: "Review replies",
  CAMPAIGN_DRAFT: "Campaign drafts",
  SEO_CONTENT: "SEO content",
  CUSTOMER_INSIGHTS: "Customer insights",
  SMS_AFTER_HOURS: "SMS after-hours agent",
  VOICE_RECEPTIONIST: "Voice receptionist",
  SUPPORT_FAQ: "Support FAQ",
  LABOR_GUIDE: "Labor Book",
};

export function aiFeatureLabel(feature: AiFeature): string {
  return FEATURE_LABEL[feature] ?? feature;
}

export async function getPlatformAiUsageSummary(): Promise<PlatformAiUsageSummary> {
  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);
  const since24h = new Date(Date.now() - 86_400_000);

  try {
    const [groups, last24Hours, tokenSum] = await Promise.all([
      prisma.aiUsageLog.groupBy({
        by: ["feature"],
        where: { createdAt: { gte: since30d } },
        _count: { _all: true },
        _sum: { totalTokens: true },
      }),
      prisma.aiUsageLog.count({ where: { createdAt: { gte: since24h } } }),
      prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: since30d } },
        _sum: { totalTokens: true },
        _count: { _all: true },
      }),
    ]);

    const byFeature = groups
      .map((g) => ({
        feature: g.feature,
        calls: g._count._all,
        tokens: g._sum.totalTokens ?? 0,
      }))
      .sort((a, b) => b.calls - a.calls);

    return {
      last30Days: {
        totalCalls: tokenSum._count._all,
        totalTokens: tokenSum._sum.totalTokens ?? 0,
        byFeature,
      },
      last24Hours,
    };
  } catch {
    return {
      last30Days: { totalCalls: 0, totalTokens: 0, byFeature: [] },
      last24Hours: 0,
    };
  }
}
