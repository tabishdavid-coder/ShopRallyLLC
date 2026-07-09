import "server-only";

import { prisma } from "@/db/client";
import {
  normalizeCustomDomain,
  slugFromSitesSubdomain,
} from "@/lib/custom-domain";
import { SeoPropertySource, SeoPropertyStatus } from "@/generated/prisma";
import { siteSlugFromShop } from "@/lib/website-seo";

/** Map incoming Host header to published microsite slug. */
export async function resolveHostToSiteSlug(host: string): Promise<string | null> {
  const normalizedHost = host.toLowerCase().split(":")[0]!;

  const fromSubdomain = slugFromSitesSubdomain(normalizedHost);
  if (fromSubdomain) {
    const published = await isSlugPublished(fromSubdomain);
    return published ? fromSubdomain : null;
  }

  const domain = normalizeCustomDomain(normalizedHost);
  const config = await prisma.shopWebsiteConfig.findFirst({
    where: {
      published: true,
      customDomain: domain,
      shop: {
        seoProperties: {
          some: {
            domain,
            source: SeoPropertySource.CUSTOM_DOMAIN,
            verifiedAt: { not: null },
            status: SeoPropertyStatus.ACTIVE,
          },
        },
      },
    },
    select: {
      shop: { select: { bookingSlug: true, code: true } },
    },
  });

  if (!config) return null;
  return siteSlugFromShop(config.shop.bookingSlug, config.shop.code);
}

async function isSlugPublished(slug: string): Promise<boolean> {
  const shop = await prisma.shop.findFirst({
    where: {
      OR: [{ bookingSlug: slug }, { code: slug.toUpperCase() }, { code: slug }],
      websiteConfig: { published: true },
    },
    select: { id: true },
  });
  return Boolean(shop);
}
