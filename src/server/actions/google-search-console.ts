"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

import { SeoPropertyStatus } from "@/generated/prisma";
import { prisma } from "@/db/client";
import { encodeGoogleGscOAuthState } from "@/lib/google-gsc-oauth";
import { GROWTH_PRODUCTS } from "@/lib/growth-engine-brand";
import { PLANS } from "@/lib/plans";
import { getShopId } from "@/lib/shop";
import { canUseReleasedFeature } from "@/lib/subscription";
import { publicUrl } from "@/lib/app-url";
import { publicSitePath, siteSlugFromShop } from "@/lib/website-seo";
import {
  getGoogleGscIntegration,
  upsertGoogleGscConfig,
} from "@/server/google-search-console";
import {
  ensureGscAccessToken,
  exchangeGoogleGscCode,
  getGoogleGscOAuthUrl,
  GOOGLE_GSC_VENDOR_KEY,
  listGscSites,
  matchGscSiteForHost,
  parseGoogleGscConfig,
  publishUrlToGoogleIndexing,
  submitGscSitemap,
} from "@/server/services/google-search-console";
import { serviceSlug } from "@/lib/service-slugs";
import { getPublishedShopWebsite } from "@/server/website-seo";
import { gates } from "@/server/permission-gates";

export type GoogleGscActionResult =
  | { ok: true; message?: string; url?: string }
  | { ok: false; error: string };

function revalidateGsc() {
  revalidatePath("/marketing/seo-automation");
  revalidatePath("/marketing/website");
}

async function requireSeoFeature(): Promise<{ shopId: string } | { error: string }> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { error: denied.error };
  const allowed = await canUseReleasedFeature(shopId, "website_seo");
  if (!allowed) {
    return {
      error: `Search Console requires ${PLANS.ENTERPRISE.name} or a Local SEO subscription (${GROWTH_PRODUCTS.seoAutopilot.label}, $129/mo).`,
    };
  }
  return { shopId };
}

export async function connectGoogleSearchConsole(): Promise<GoogleGscActionResult> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const state = encodeGoogleGscOAuthState(gate.shopId);
  const res = getGoogleGscOAuthUrl(state);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, url: res.url };
}

export async function completeGoogleGscOAuth(
  shopId: string,
  code: string,
): Promise<GoogleGscActionResult> {
  const tokens = await exchangeGoogleGscCode(code);
  const sites = await listGscSites(tokens.accessToken);

  const existing = await prisma.shopIntegration.findUnique({
    where: { shopId_vendorKey: { shopId, vendorKey: GOOGLE_GSC_VENDOR_KEY } },
  });
  const prev = parseGoogleGscConfig(existing?.config);

  const config = {
    ...prev,
    refreshToken: tokens.refreshToken,
    accessToken: tokens.accessToken,
    tokenExpiresAt: tokens.expiresAt.toISOString(),
    sites,
  };

  await upsertGoogleGscConfig(shopId, config);

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { bookingSlug: true, code: true },
  });
  if (shop) {
    const slug = siteSlugFromShop(shop.bookingSlug, shop.code);
    const hostname = new URL(publicUrl(publicSitePath(slug))).hostname;
    const matched = matchGscSiteForHost(sites, hostname);
    if (matched) {
      await prisma.seoProperty.updateMany({
        where: { shopId, domain: hostname },
        data: { gscPropertyUrl: matched, status: SeoPropertyStatus.ACTIVE },
      });
    }
  }

  revalidateGsc();
  return {
    ok: true,
    message: `Search Console connected — ${sites.length} propert${sites.length === 1 ? "y" : "ies"} found.`,
  };
}

const LinkPropertyInput = z.object({
  propertyId: z.string().min(1),
  gscSiteUrl: z.string().trim().min(1),
});

export async function linkSeoPropertyToGsc(raw: unknown): Promise<GoogleGscActionResult> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const parsed = LinkPropertyInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const integration = await getGoogleGscIntegration(gate.shopId);
  if (!integration.connected) {
    return { ok: false, error: "Connect Search Console first." };
  }
  if (!integration.sites.includes(parsed.data.gscSiteUrl)) {
    return { ok: false, error: "That property is not in your connected Search Console account." };
  }

  const property = await prisma.seoProperty.findFirst({
    where: { id: parsed.data.propertyId, shopId: gate.shopId },
  });
  if (!property) return { ok: false, error: "Site not found." };

  await prisma.seoProperty.update({
    where: { id: property.id },
    data: {
      gscPropertyUrl: parsed.data.gscSiteUrl,
      status: SeoPropertyStatus.ACTIVE,
    },
  });

  revalidateGsc();
  return { ok: true, message: "Search Console property linked." };
}

export async function disconnectGoogleSearchConsole(): Promise<GoogleGscActionResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  await prisma.shopIntegration.deleteMany({
    where: { shopId, vendorKey: GOOGLE_GSC_VENDOR_KEY },
  });
  revalidateGsc();
  return { ok: true, message: "Search Console disconnected." };
}

/** Submit microsite sitemap after publish — no-op when not connected/linked. */
export async function submitShopSitemapToGsc(shopId: string): Promise<void> {
  const integration = await getGoogleGscIntegration(shopId);
  if (!integration.connected) return;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      bookingSlug: true,
      code: true,
      websiteConfig: { select: { published: true } },
    },
  });
  if (!shop?.websiteConfig?.published) return;

  const slug = siteSlugFromShop(shop.bookingSlug, shop.code);
  const sitePath = publicSitePath(slug);
  const hostname = new URL(publicUrl(sitePath)).hostname;

  const property = await prisma.seoProperty.findFirst({
    where: { shopId, domain: hostname },
  });
  const gscSite =
    property?.gscPropertyUrl ??
    matchGscSiteForHost(integration.sites, hostname);
  if (!gscSite) return;

  const tokens = await ensureGscAccessToken(integration.config);
  const sitemapUrl = publicUrl(`${sitePath}/sitemap.xml`);

  await submitGscSitemap(gscSite, sitemapUrl, tokens.accessToken);

  const site = await getPublishedShopWebsite(slug);
  const indexUrls = [
    publicUrl(sitePath),
    publicUrl(`${sitePath}/services`),
    publicUrl(`${sitePath}/contact`),
  ];
  if (site) {
    for (const svc of site.services) {
      const part = serviceSlug(svc.title);
      if (part) indexUrls.push(publicUrl(`${sitePath}/services/${part}`));
    }
  }

  for (const pageUrl of indexUrls) {
    try {
      await publishUrlToGoogleIndexing(pageUrl, tokens.accessToken);
    } catch (err) {
      console.warn("[gsc] Indexing API skipped for", pageUrl, err);
    }
  }

  await upsertGoogleGscConfig(shopId, {
    ...integration.config,
    accessToken: tokens.accessToken,
    tokenExpiresAt: tokens.expiresAt.toISOString(),
  });

  if (property && !property.gscPropertyUrl) {
    await prisma.seoProperty.update({
      where: { id: property.id },
      data: { gscPropertyUrl: gscSite },
    });
  }
}
