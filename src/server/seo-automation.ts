import "server-only";

import type { Prisma } from "@/generated/prisma";
import {
  SeoJobType,
  SeoPropertySource,
  SeoPropertyStatus,
  SeoRunStatus,
} from "@/generated/prisma";
import { prisma } from "@/db/client";
import { publicUrl } from "@/lib/app-url";
import {
  normalizeSeoDomain,
  parseAuditSummary,
  parseContentRunSummary,
  type SeoAuditSummary,
  type SeoAutomationAdmin,
  type SeoAutomationRunView,
  type PlatformSeoAdmin,
  type PlatformSeoPropertyRow,
  type SeoPropertyView,
} from "@/lib/seo-automation";
import { customDomainCnameTarget, normalizeCustomDomain } from "@/lib/custom-domain";
import { buildVerificationInstructions } from "@/lib/seo-verification";
import { publicSitePath, siteSlugFromShop } from "@/lib/website-seo";
import { getGoogleGscIntegration } from "@/server/google-search-console";
import { ensureShopSeoSettings } from "@/server/seo-settings";
import { verifyCustomDomainCname } from "@/server/services/custom-domain-dns";
import {
  ensureGscAccessToken,
  fetchGscSearchMetrics,
} from "@/server/services/google-search-console";
import { crawlExternalSite } from "@/server/services/seo-site-crawl";
import { verifyDomainOwnership } from "@/server/services/seo-site-verify";
import { ensureWebsiteConfig, getWebsiteAdmin } from "@/server/website-seo";
import { isAiConfigured } from "@/server/services/ai/client";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function micrositeDomain(slug: string): string {
  try {
    return new URL(publicUrl(publicSitePath(slug))).hostname;
  } catch {
    return customDomainCnameTarget(slug);
  }
}

function toPropertyView(
  row: {
    id: string;
    domain: string;
    source: SeoPropertySource;
    status: SeoPropertyStatus;
    automationEnabled: boolean;
    autoPublish: boolean;
    gscPropertyUrl: string | null;
    verificationToken: string;
    verifiedAt: Date | null;
    lastAuditAt: Date | null;
    nextRunAt: Date | null;
    runs: {
      status: SeoRunStatus;
      summary: unknown;
      finishedAt: Date | null;
    }[];
  },
  siteUrl: string | null,
  slug: string,
): SeoPropertyView {
  const latest = row.runs[0];
  const audit = latest ? parseAuditSummary(latest.summary) : null;
  const verified = Boolean(row.verifiedAt) || row.source === SeoPropertySource.MICROSITE;
  return {
    id: row.id,
    domain: row.domain,
    source: row.source,
    status: row.status,
    automationEnabled: row.automationEnabled,
    autoPublish: row.autoPublish,
    siteUrl,
    gscPropertyUrl: row.gscPropertyUrl,
    verified,
    verification:
      !verified && row.source !== SeoPropertySource.MICROSITE
        ? buildVerificationInstructions(row.domain, row.verificationToken)
        : null,
    cnameTarget:
      row.source === SeoPropertySource.CUSTOM_DOMAIN
        ? customDomainCnameTarget(slug)
        : null,
    lastAuditAt: row.lastAuditAt?.toISOString() ?? null,
    nextRunAt: row.nextRunAt?.toISOString() ?? null,
    latestScore: audit?.seoScore ?? null,
    latestRunStatus:
      latest?.status === SeoRunStatus.SUCCESS ||
      latest?.status === SeoRunStatus.FAILED ||
      latest?.status === SeoRunStatus.SKIPPED
        ? latest.status
        : null,
  };
}

function toRunView(row: {
  id: string;
  jobType: SeoJobType;
  status: SeoRunStatus;
  summary: unknown;
  error: string | null;
  finishedAt: Date | null;
}): SeoAutomationRunView {
  const audit = parseAuditSummary(row.summary);
  const contentSummary =
    row.jobType === SeoJobType.CONTENT ? parseContentRunSummary(row.summary) : null;
  return {
    id: row.id,
    jobType: row.jobType,
    status: row.status,
    seoScore: audit?.seoScore ?? null,
    openItems: audit?.openItems ?? [],
    gscClicks: audit?.gscMetrics?.clicks ?? null,
    gscImpressions: audit?.gscMetrics?.impressions ?? null,
    error: row.error,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    contentSummary,
  };
}

/** Ensure default microsite (+ optional custom domain) properties exist for a shop. */
export async function syncSeoPropertiesForShop(shopId: string): Promise<void> {
  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    select: { bookingSlug: true, code: true, websiteConfig: { select: { customDomain: true } } },
  });

  const slug = siteSlugFromShop(shop.bookingSlug, shop.code);
  const micrositeHost = micrositeDomain(slug);

  await prisma.seoProperty.upsert({
    where: { shopId_domain: { shopId, domain: micrositeHost } },
    create: {
      shopId,
      domain: micrositeHost,
      source: SeoPropertySource.MICROSITE,
      status: SeoPropertyStatus.ACTIVE,
      automationEnabled: true,
      verifiedAt: new Date(),
      nextRunAt: new Date(),
    },
    update: {},
  });

  const custom = shop.websiteConfig?.customDomain?.trim();
  if (custom) {
    const host = normalizeSeoDomain(custom);
    await prisma.seoProperty.upsert({
      where: { shopId_domain: { shopId, domain: host } },
      create: {
        shopId,
        domain: host,
        source: SeoPropertySource.CUSTOM_DOMAIN,
        status: SeoPropertyStatus.PENDING_VERIFICATION,
        automationEnabled: false,
      },
      update: {},
    });
  }
}

export async function getSeoAutomationAdmin(
  shopId: string,
  hasFeature: boolean,
  aiSeoContent: boolean,
): Promise<SeoAutomationAdmin> {
  await syncSeoPropertiesForShop(shopId);

  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    select: {
      bookingSlug: true,
      code: true,
      websiteConfig: { select: { customDomain: true } },
    },
  });
  const slug = siteSlugFromShop(shop.bookingSlug, shop.code);
  const micrositeUrl = publicUrl(publicSitePath(slug));
  const settings = await ensureShopSeoSettings(shopId);
  const customDomain = shop.websiteConfig?.customDomain?.trim() ?? null;

  const properties = await prisma.seoProperty.findMany({
    where: { shopId },
    orderBy: [{ source: "asc" }, { domain: "asc" }],
    include: {
      runs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, summary: true, finishedAt: true },
      },
    },
  });

  const runs = await prisma.seoAutomationRun.findMany({
    where: { property: { shopId } },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      jobType: true,
      status: true,
      summary: true,
      error: true,
      finishedAt: true,
    },
  });

  const gscIntegration = await getGoogleGscIntegration(shopId);

  return {
    hasFeature,
    aiSeoContent,
    aiConfigured: isAiConfigured(),
    gsc: {
      configured: gscIntegration.configured,
      connected: gscIntegration.connected,
      sites: gscIntegration.sites,
    },
    settings,
    customDomain,
    cnameTarget: customDomainCnameTarget(slug),
    properties: properties.map((p) =>
      toPropertyView(
        p,
        p.source === SeoPropertySource.MICROSITE ? micrositeUrl : `https://${p.domain}`,
        slug,
      ),
    ),
    recentRuns: runs.map(toRunView),
  };
}

async function buildMicrositeAuditSummary(
  shopId: string,
  gscPropertyUrl: string | null,
): Promise<SeoAuditSummary> {
  const admin = await getWebsiteAdmin(shopId, true);
  const openItems = admin.seoChecklist.filter((c) => !c.completed).map((c) => c.label);

  const summary: SeoAuditSummary = {
    seoScore: admin.seoScore,
    siteUrl: admin.siteUrl,
    published: admin.published,
    checklist: admin.seoChecklist.map((c) => ({
      id: c.id,
      label: c.label,
      completed: c.completed,
    })),
    openItems,
    gscPropertyUrl,
  };

  if (gscPropertyUrl) {
    try {
      const integration = await getGoogleGscIntegration(shopId);
      if (integration.connected) {
        const tokens = await ensureGscAccessToken(integration.config);
        summary.gscMetrics = await fetchGscSearchMetrics(
          gscPropertyUrl,
          tokens.accessToken,
        );
      }
    } catch {
      openItems.push("Search Console metrics unavailable — reconnect or re-link property.");
      summary.openItems = openItems;
    }
  } else {
    openItems.push("Link Google Search Console to track clicks and impressions.");
    summary.openItems = openItems;
  }

  return summary;
}

async function buildVerifiedExternalAuditSummary(
  domain: string,
  shopId: string,
  gscPropertyUrl: string | null,
): Promise<SeoAuditSummary> {
  const summary = await crawlExternalSite(domain);

  if (gscPropertyUrl) {
    try {
      const integration = await getGoogleGscIntegration(shopId);
      if (integration.connected) {
        const tokens = await ensureGscAccessToken(integration.config);
        summary.gscMetrics = await fetchGscSearchMetrics(gscPropertyUrl, tokens.accessToken);
        summary.gscPropertyUrl = gscPropertyUrl;
      }
    } catch {
      summary.openItems.push("Search Console metrics unavailable for this property.");
    }
  } else {
    summary.openItems.push("Link Google Search Console to track search performance.");
  }

  return summary;
}

/** Run a single SEO audit for one property. */
export async function runSeoPropertyAudit(propertyId: string, shopId?: string) {
  const property = await prisma.seoProperty.findFirst({
    where: shopId ? { id: propertyId, shopId } : { id: propertyId },
  });
  if (!property) {
    return { ok: false as const, error: "Property not found." };
  }

  const run = await prisma.seoAutomationRun.create({
    data: {
      propertyId: property.id,
      jobType: SeoJobType.AUDIT,
      status: SeoRunStatus.RUNNING,
      startedAt: new Date(),
    },
  });

  try {
    let summary: SeoAuditSummary;
    let status: SeoRunStatus = SeoRunStatus.SUCCESS;

    if (property.source === SeoPropertySource.MICROSITE) {
      summary = await buildMicrositeAuditSummary(property.shopId, property.gscPropertyUrl);
      if (!summary.published) {
        status = SeoRunStatus.SKIPPED;
        summary.skippedReason = "Microsite is not published — publish under ShopSite first.";
      }
    } else if (!property.verifiedAt) {
      summary = {
        seoScore: 0,
        siteUrl: `https://${property.domain}`,
        published: false,
        checklist: [],
        openItems: ["Verify domain ownership to enable automated audits."],
        skippedReason: "Domain not verified.",
      };
      status = SeoRunStatus.SKIPPED;
    } else {
      summary = await buildVerifiedExternalAuditSummary(
        property.domain,
        property.shopId,
        property.gscPropertyUrl,
      );
    }

    const finishedAt = new Date();
    await prisma.$transaction([
      prisma.seoAutomationRun.update({
        where: { id: run.id },
        data: {
          status,
          summary: summary as unknown as Prisma.InputJsonValue,
          finishedAt,
        },
      }),
      prisma.seoProperty.update({
        where: { id: property.id },
        data: {
          lastAuditAt: finishedAt,
          nextRunAt: new Date(finishedAt.getTime() + WEEK_MS),
        },
      }),
    ]);

    return { ok: true as const, runId: run.id, status, summary };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit failed.";
    await prisma.seoAutomationRun.update({
      where: { id: run.id },
      data: {
        status: SeoRunStatus.FAILED,
        error: message,
        finishedAt: new Date(),
      },
    });
    return { ok: false as const, error: message };
  }
}

export type WeeklyAuditBatchResult = {
  scanned: number;
  ran: number;
  skipped: number;
  failed: number;
};

/** Weekly cron — audit all active, automation-enabled properties. */
export async function runWeeklySeoAudits(): Promise<WeeklyAuditBatchResult> {
  const properties = await prisma.seoProperty.findMany({
    where: {
      status: SeoPropertyStatus.ACTIVE,
      automationEnabled: true,
    },
    select: { id: true },
  });

  let ran = 0;
  let skipped = 0;
  let failed = 0;

  for (const property of properties) {
    const result = await runSeoPropertyAudit(property.id);
    if (!result.ok) {
      failed += 1;
    } else if (result.status === SeoRunStatus.SKIPPED) {
      skipped += 1;
    } else {
      ran += 1;
    }
  }

  return { scanned: properties.length, ran, skipped, failed };
}

export async function setSeoPropertyAutomation(
  shopId: string,
  propertyId: string,
  patch: { automationEnabled?: boolean; status?: SeoPropertyStatus },
) {
  const property = await prisma.seoProperty.findFirst({
    where: { id: propertyId, shopId },
  });
  if (!property) return { ok: false as const, error: "Property not found." };

  await prisma.seoProperty.update({
    where: { id: propertyId },
    data: {
      ...(patch.automationEnabled !== undefined
        ? { automationEnabled: patch.automationEnabled }
        : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    },
  });

  return { ok: true as const };
}

export async function addExternalSeoProperty(shopId: string, rawDomain: string) {
  const domain = normalizeSeoDomain(rawDomain);

  const existing = await prisma.seoProperty.findUnique({
    where: { shopId_domain: { shopId, domain } },
  });
  if (existing) {
    return { ok: false as const, error: "That site is already in your Growth Engine SEO list." };
  }

  await prisma.seoProperty.create({
    data: {
      shopId,
      domain,
      source: SeoPropertySource.EXTERNAL,
      status: SeoPropertyStatus.PENDING_VERIFICATION,
      automationEnabled: false,
    },
  });

  return { ok: true as const };
}

/** Verify DNS TXT or meta tag for an external / custom-domain property. */
export async function verifySeoPropertyDomain(shopId: string, propertyId: string) {
  const property = await prisma.seoProperty.findFirst({
    where: { id: propertyId, shopId },
  });
  if (!property) return { ok: false as const, error: "Property not found." };
  if (property.source === SeoPropertySource.MICROSITE) {
    return { ok: false as const, error: "ShopRally microsites do not require verification." };
  }
  if (property.verifiedAt) {
    return { ok: true as const, method: "already" as const };
  }

  if (property.source === SeoPropertySource.CUSTOM_DOMAIN) {
    const shop = await prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: { bookingSlug: true, code: true },
    });
    const slug = siteSlugFromShop(shop.bookingSlug, shop.code);
    const cnameOk = await verifyCustomDomainCname(property.domain, slug);
    if (!cnameOk) {
      const target = customDomainCnameTarget(slug);
      return {
        ok: false as const,
        error: `CNAME not detected. Point ${property.domain} (or www) to ${target}, then try again.`,
      };
    }

    await prisma.seoProperty.update({
      where: { id: property.id },
      data: {
        verifiedAt: new Date(),
        status: SeoPropertyStatus.ACTIVE,
        automationEnabled: true,
      },
    });

    return { ok: true as const, method: "cname" as const };
  }

  const result = await verifyDomainOwnership(property.domain, property.verificationToken);
  if (!result.ok) return result;

  await prisma.seoProperty.update({
    where: { id: property.id },
    data: {
      verifiedAt: new Date(),
      status: SeoPropertyStatus.ACTIVE,
      automationEnabled: true,
    },
  });

  return { ok: true as const, method: result.method };
}

/** Save a custom domain on the shop website config and sync the SEO property row. */
export async function setShopCustomDomain(shopId: string, rawDomain: string | null) {
  await ensureWebsiteConfig(shopId);
  const domain = rawDomain?.trim() ? normalizeCustomDomain(rawDomain) : null;

  await prisma.shopWebsiteConfig.update({
    where: { shopId },
    data: { customDomain: domain },
  });

  if (!domain) {
    await prisma.seoProperty.deleteMany({
      where: { shopId, source: SeoPropertySource.CUSTOM_DOMAIN },
    });
  } else {
    await syncSeoPropertiesForShop(shopId);
  }

  return { ok: true as const, domain };
}

/** Platform admin — all SEO properties across tenants. */
export async function listPlatformSeoProperties(): Promise<PlatformSeoAdmin> {
  const rows = await prisma.seoProperty.findMany({
    orderBy: [{ shop: { name: "asc" } }, { domain: "asc" }],
    include: {
      shop: { select: { id: true, name: true, code: true } },
      runs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { summary: true },
      },
    },
  });

  const properties: PlatformSeoPropertyRow[] = rows.map((row) => {
    const audit = row.runs[0] ? parseAuditSummary(row.runs[0].summary) : null;
    return {
      id: row.id,
      shopId: row.shopId,
      shopName: row.shop.name,
      shopCode: row.shop.code,
      domain: row.domain,
      source: row.source,
      status: row.status,
      automationEnabled: row.automationEnabled,
      verified: Boolean(row.verifiedAt) || row.source === SeoPropertySource.MICROSITE,
      lastAuditAt: row.lastAuditAt?.toISOString() ?? null,
      latestScore: audit?.seoScore ?? null,
    };
  });

  return {
    properties,
    stats: {
      total: properties.length,
      autopilotOn: properties.filter((p) => p.automationEnabled && p.status === "ACTIVE").length,
      pendingVerification: properties.filter((p) => !p.verified).length,
    },
  };
}

export async function setPlatformSeoPropertyAutomation(
  propertyId: string,
  patch: { automationEnabled: boolean; status?: SeoPropertyStatus },
) {
  const property = await prisma.seoProperty.findUnique({ where: { id: propertyId } });
  if (!property) return { ok: false as const, error: "Property not found." };

  await prisma.seoProperty.update({
    where: { id: propertyId },
    data: {
      automationEnabled: patch.automationEnabled,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    },
  });

  return { ok: true as const };
}
