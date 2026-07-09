import "server-only";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/db/client";

export type SeoReportSnapshotView = {
  id: string;
  periodLabel: string;
  sentTo: string | null;
  createdAt: string;
  summary: {
    propertyCount: number;
    topScore: number | null;
    gscClicks: number | null;
    recentRunCount: number;
    highlights: string[];
  };
};

function parseSummary(raw: unknown): SeoReportSnapshotView["summary"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      propertyCount: 0,
      topScore: null,
      gscClicks: null,
      recentRunCount: 0,
      highlights: [],
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    propertyCount: typeof o.propertyCount === "number" ? o.propertyCount : 0,
    topScore: typeof o.topScore === "number" ? o.topScore : null,
    gscClicks: typeof o.gscClicks === "number" ? o.gscClicks : null,
    recentRunCount: typeof o.recentRunCount === "number" ? o.recentRunCount : 0,
    highlights: Array.isArray(o.highlights)
      ? o.highlights.filter((x): x is string => typeof x === "string")
      : [],
  };
}

export async function listSeoReportSnapshots(
  shopId: string,
  limit = 12,
): Promise<SeoReportSnapshotView[]> {
  const rows = await prisma.seoReportSnapshot.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      periodLabel: true,
      sentTo: true,
      summary: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    periodLabel: row.periodLabel,
    sentTo: row.sentTo,
    createdAt: row.createdAt.toISOString(),
    summary: parseSummary(row.summary),
  }));
}

export async function createSeoReportSnapshot(input: {
  shopId: string;
  periodLabel: string;
  sentTo: string | null;
  summary: SeoReportSnapshotView["summary"];
}): Promise<void> {
  await prisma.seoReportSnapshot.create({
    data: {
      shopId: input.shopId,
      periodLabel: input.periodLabel,
      sentTo: input.sentTo,
      summary: input.summary as unknown as Prisma.InputJsonValue,
    },
  });
}
