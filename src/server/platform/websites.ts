import "server-only";

import { WebsiteBuildStatus, type SupportTicketStatus } from "@/generated/prisma";
import { prisma } from "@/db/client";
import { publicUrl } from "@/lib/app-url";
import {
  effectiveWebsiteBuildStatus,
  isLiveWebsiteStatus,
  isPipelineWebsiteStatus,
  websiteBuildStatusLabel,
} from "@/lib/website-build-pipeline";
import { publicSitePath, siteSlugFromShop, computeSeoScore } from "@/lib/website-seo";

const OPEN_TICKET: SupportTicketStatus[] = ["OPEN", "IN_PROGRESS"];

export type PlatformWebsiteRow = {
  shopId: string;
  shopName: string;
  shopCode: string;
  slug: string;
  siteUrl: string;
  city: string | null;
  state: string | null;
  published: boolean;
  buildStatus: WebsiteBuildStatus;
  buildStatusLabel: string;
  customDomain: string | null;
  seoScore: number;
  hasConfig: boolean;
  openBuildTicketId: string | null;
  openBuildTicketSubject: string | null;
  operatorNotes: string | null;
  launchedAt: Date | null;
  nextReviewDueAt: Date | null;
  lastOperatorReviewAt: Date | null;
  configUpdatedAt: Date | null;
  reviewOverdue: boolean;
};

export type PlatformWebsitesSummary = {
  total: number;
  pipeline: number;
  live: number;
  upkeepDue: number;
  openRequests: number;
};

export type PlatformWebsiteDetail = PlatformWebsiteRow & {
  heroHeadline: string | null;
  metaTitle: string | null;
  googleAnalyticsId: string | null;
  recentBuildTickets: {
    id: string;
    subject: string;
    status: string;
    createdAt: Date;
  }[];
};

function roughSeoScore(config: {
  published: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  heroHeadline: string | null;
  googleAnalyticsId: string | null;
  keywords: string[];
  seoChecklistCompleted: unknown;
} | null): number {
  if (!config) return 0;
  const manual = (config.seoChecklistCompleted as Record<string, boolean>) ?? {};
  const completed = {
    meta_title: Boolean(config.metaTitle?.trim()),
    meta_description: Boolean(config.metaDescription?.trim()),
    hero_content: Boolean(config.heroHeadline?.trim()),
    site_published: config.published,
    analytics_connected: Boolean(config.googleAnalyticsId?.trim()),
    keywords_defined: config.keywords.length > 0,
    ...manual,
  };
  return computeSeoScore(completed);
}

function mapRow(
  shop: {
    id: string;
    name: string;
    code: string;
    city: string | null;
    state: string | null;
    bookingSlug: string | null;
    websiteConfig: {
      published: boolean;
      buildStatus: WebsiteBuildStatus;
      customDomain: string | null;
      operatorNotes: string | null;
      launchedAt: Date | null;
      nextReviewDueAt: Date | null;
      lastOperatorReviewAt: Date | null;
      updatedAt: Date;
      heroHeadline: string | null;
      metaTitle: string | null;
      metaDescription: string | null;
      googleAnalyticsId: string | null;
      keywords: string[];
      seoChecklistCompleted: unknown;
    } | null;
    supportTickets: { id: string; subject: string }[];
  },
  now = new Date(),
): PlatformWebsiteRow {
  const slug = siteSlugFromShop(shop.bookingSlug, shop.code);
  const config = shop.websiteConfig;
  const openTicket = shop.supportTickets[0] ?? null;
  const buildStatus = effectiveWebsiteBuildStatus({
    buildStatus: config?.buildStatus,
    published: config?.published ?? false,
    hasOpenBuildTicket: Boolean(openTicket),
  });
  const nextReviewDueAt = config?.nextReviewDueAt ?? null;

  return {
    shopId: shop.id,
    shopName: shop.name,
    shopCode: shop.code,
    slug,
    siteUrl: publicUrl(publicSitePath(slug)),
    city: shop.city,
    state: shop.state,
    published: config?.published ?? false,
    buildStatus,
    buildStatusLabel: websiteBuildStatusLabel(buildStatus),
    customDomain: config?.customDomain?.trim() || null,
    seoScore: roughSeoScore(config),
    hasConfig: Boolean(config),
    openBuildTicketId: openTicket?.id ?? null,
    openBuildTicketSubject: openTicket?.subject ?? null,
    operatorNotes: config?.operatorNotes ?? null,
    launchedAt: config?.launchedAt ?? null,
    nextReviewDueAt,
    lastOperatorReviewAt: config?.lastOperatorReviewAt ?? null,
    configUpdatedAt: config?.updatedAt ?? null,
    reviewOverdue: Boolean(
      nextReviewDueAt && nextReviewDueAt.getTime() < now.getTime() && buildStatus === "UPKEEP",
    ),
  };
}

const shopWebsiteSelect = {
  id: true,
  name: true,
  code: true,
  city: true,
  state: true,
  bookingSlug: true,
  websiteConfig: true,
  supportTickets: {
    where: { category: "WEBSITE_BUILD" as const, status: { in: OPEN_TICKET } },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { id: true, subject: true },
  },
} as const;

export async function getPlatformWebsitesSummary(): Promise<PlatformWebsitesSummary> {
  const shops = await prisma.shop.findMany({
    select: shopWebsiteSelect,
  });

  const rows = shops.map((s) => mapRow(s));
  const pipelineStatuses: WebsiteBuildStatus[] = [
    WebsiteBuildStatus.NOT_STARTED,
    WebsiteBuildStatus.QUOTE_REQUESTED,
    WebsiteBuildStatus.IN_BUILD,
    WebsiteBuildStatus.CLIENT_REVIEW,
  ];
  const liveStatuses: WebsiteBuildStatus[] = [
    WebsiteBuildStatus.LAUNCHED,
    WebsiteBuildStatus.UPKEEP,
  ];

  return {
    total: rows.length,
    pipeline: rows.filter((r) => pipelineStatuses.includes(r.buildStatus)).length,
    live: rows.filter((r) => liveStatuses.includes(r.buildStatus)).length,
    upkeepDue: rows.filter((r) => r.reviewOverdue).length,
    openRequests: rows.filter((r) => r.openBuildTicketId).length,
  };
}

export async function listPlatformWebsites(filter?: {
  status?: WebsiteBuildStatus | "all" | "pipeline" | "live" | "upkeep_due";
}): Promise<PlatformWebsiteRow[]> {
  const shops = await prisma.shop.findMany({
    orderBy: { name: "asc" },
    select: shopWebsiteSelect,
  });

  let rows = shops.map((s) => mapRow(s));
  const f = filter?.status ?? "all";

  if (f === "pipeline") {
    rows = rows.filter((r) => isPipelineWebsiteStatus(r.buildStatus));
  } else if (f === "live") {
    rows = rows.filter((r) => isLiveWebsiteStatus(r.buildStatus));
  } else if (f === "upkeep_due") {
    rows = rows.filter((r) => r.reviewOverdue);
  } else if (f !== "all") {
    rows = rows.filter((r) => r.buildStatus === f);
  }

  return rows.sort((a, b) => {
    if (a.reviewOverdue !== b.reviewOverdue) return a.reviewOverdue ? -1 : 1;
    if (a.openBuildTicketId && !b.openBuildTicketId) return -1;
    if (!a.openBuildTicketId && b.openBuildTicketId) return 1;
    return a.shopName.localeCompare(b.shopName);
  });
}

export async function getPlatformWebsiteDetail(shopId: string): Promise<PlatformWebsiteDetail | null> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      ...shopWebsiteSelect,
      supportTickets: {
        where: { category: "WEBSITE_BUILD" },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, subject: true, status: true, createdAt: true },
      },
    },
  });

  if (!shop) return null;

  const openTickets = shop.supportTickets.filter((t) =>
    OPEN_TICKET.includes(t.status as SupportTicketStatus),
  );
  const base = mapRow({
    id: shop.id,
    name: shop.name,
    code: shop.code,
    city: shop.city,
    state: shop.state,
    bookingSlug: shop.bookingSlug,
    websiteConfig: shop.websiteConfig,
    supportTickets: openTickets.slice(0, 1).map((t) => ({ id: t.id, subject: t.subject })),
  });
  const config = shop.websiteConfig;

  return {
    ...base,
    heroHeadline: config?.heroHeadline ?? null,
    metaTitle: config?.metaTitle ?? null,
    googleAnalyticsId: config?.googleAnalyticsId ?? null,
    recentBuildTickets: shop.supportTickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt,
    })),
  };
}
