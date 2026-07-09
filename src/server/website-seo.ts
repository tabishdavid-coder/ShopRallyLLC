import "server-only";

import { prisma } from "@/db/client";
import { publicUrl } from "@/lib/app-url";
import { customDomainCnameTarget } from "@/lib/custom-domain";
import { SeoPropertySource } from "@/generated/prisma";
import { serviceSlug } from "@/lib/service-slugs";
import { parseBookingSettings } from "@/lib/booking-settings";
import {
  SEO_CHECKLIST,
  computeSeoScore,
  defaultAboutText,
  defaultHeroHeadline,
  defaultHeroSubtext,
  defaultMetaDescription,
  defaultMetaTitle,
  defaultWebsiteServices,
  publicSitePath,
  siteSlugFromShop,
  type WebsiteService,
} from "@/lib/website-seo";
import { GOOGLE_REVIEWS_VENDOR_KEY, isGoogleReviewsConnected, parseGoogleReviewsConfig } from "@/server/services/google-reviews";

export type ShopWebsitePublic = {
  slug: string;
  shopName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  heroHeadline: string;
  heroSubtext: string;
  aboutText: string;
  services: WebsiteService[];
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  schemaEnabled: boolean;
  googleAnalyticsId: string | null;
  bookingSlug: string | null;
  onlineBookingEnabled: boolean;
  bookingServices: string[];
  hoursLabel: string;
  reviews: { reviewerName: string; starRating: number; comment: string | null }[];
  averageRating: number | null;
  reviewCount: number;
};

export type ShopWebsiteAdmin = {
  slug: string;
  siteUrl: string;
  published: boolean;
  hasFeature: boolean;
  heroHeadline: string;
  heroSubtext: string;
  aboutText: string;
  services: WebsiteService[];
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  googleAnalyticsId: string | null;
  schemaEnabled: boolean;
  seoChecklist: { id: string; label: string; description: string; completed: boolean; auto: boolean }[];
  seoScore: number;
  onlineBookingEnabled: boolean;
  bookingUrl: string | null;
  gbpConnected: boolean;
  businessInfoComplete: boolean;
  customDomain: string | null;
  cnameTarget: string;
  customDomainVerified: boolean;
};

function parseServicesJson(raw: unknown, shopName: string): WebsiteService[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultWebsiteServices(shopName);
  const parsed: WebsiteService[] = [];
  for (const row of raw) {
    if (
      row &&
      typeof row === "object" &&
      "title" in row &&
      typeof (row as { title: unknown }).title === "string"
    ) {
      parsed.push({
        title: (row as WebsiteService).title,
        description: String((row as WebsiteService).description ?? ""),
      });
    }
  }
  return parsed.length ? parsed : defaultWebsiteServices(shopName);
}

function parseChecklist(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, boolean>;
}

function formatHours(settings: ReturnType<typeof parseBookingSettings>): string {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const enabled = days.filter((d) => settings.availability[d]?.enabled);
  if (enabled.length === 0) return "Hours vary — call for availability";
  const first = settings.availability[enabled[0]!]!;
  const same = enabled.every(
    (d) =>
      settings.availability[d]?.start === first.start &&
      settings.availability[d]?.end === first.end,
  );
  if (same && enabled.length >= 5) {
    return `Mon–Fri ${first.start}–${first.end}`;
  }
  return enabled
    .map((d) => `${d.slice(0, 3).toUpperCase()} ${settings.availability[d]!.start}–${settings.availability[d]!.end}`)
    .join(" · ");
}

function resolveWebsiteFields(
  shop: {
    name: string;
    city: string | null;
    state: string | null;
    phone: string | null;
    address: string | null;
    websiteConfig: {
      heroHeadline: string | null;
      heroSubtext: string | null;
      aboutText: string | null;
      servicesJson: unknown;
      metaTitle: string | null;
      metaDescription: string | null;
      keywords: string[];
      schemaEnabled: boolean;
      googleAnalyticsId: string | null;
    } | null;
  },
) {
  const config = shop.websiteConfig;
  return {
    heroHeadline: config?.heroHeadline?.trim() || defaultHeroHeadline(shop.name, shop.city),
    heroSubtext: config?.heroSubtext?.trim() || defaultHeroSubtext(),
    aboutText: config?.aboutText?.trim() || defaultAboutText(shop.name, shop.city, shop.state),
    services: parseServicesJson(config?.servicesJson, shop.name),
    metaTitle: config?.metaTitle?.trim() || defaultMetaTitle(shop.name, shop.city),
    metaDescription: config?.metaDescription?.trim() || defaultMetaDescription(shop.name, shop.city),
    keywords: config?.keywords?.length ? config.keywords : [],
    schemaEnabled: config?.schemaEnabled ?? true,
    googleAnalyticsId: config?.googleAnalyticsId ?? null,
  };
}

async function loadShopBySlug(slug: string) {
  return prisma.shop.findFirst({
    where: {
      OR: [{ bookingSlug: slug }, { code: slug.toUpperCase() }, { code: slug }],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      address2: true,
      city: true,
      state: true,
      zip: true,
      bookingSlug: true,
      code: true,
      onlineBookingEnabled: true,
      bookingSettings: true,
      apptDayStart: true,
      apptDayEnd: true,
      websiteConfig: true,
      googleReviews: {
        orderBy: { googleCreatedAt: "desc" },
        take: 3,
        select: { reviewerName: true, starRating: true, comment: true },
      },
      integrations: {
        where: { vendorKey: GOOGLE_REVIEWS_VENDOR_KEY },
        select: { config: true },
        take: 1,
      },
    },
  });
}

/** Public microsite payload — only when published. */
export async function getPublishedShopWebsite(slug: string): Promise<ShopWebsitePublic | null> {
  const shop = await loadShopBySlug(slug);
  if (!shop?.websiteConfig?.published) return null;

  const fields = resolveWebsiteFields(shop);
  const bookingSettings = parseBookingSettings(shop.bookingSettings, {
    dayStart: shop.apptDayStart,
    dayEnd: shop.apptDayEnd,
  });
  const reviews = shop.googleReviews;
  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.starRating, 0) / reviews.length
      : null;

  return {
    slug: siteSlugFromShop(shop.bookingSlug, shop.code),
    shopName: shop.name,
    phone: shop.phone,
    email: shop.email,
    address: shop.address,
    address2: shop.address2,
    city: shop.city,
    state: shop.state,
    zip: shop.zip,
    ...fields,
    bookingSlug: shop.bookingSlug,
    onlineBookingEnabled: shop.onlineBookingEnabled,
    bookingServices: bookingSettings.services.map((s) => s.name).filter(Boolean),
    hoursLabel: formatHours(bookingSettings),
    reviews,
    averageRating: avg,
    reviewCount: reviews.length,
  };
}

/** Preview payload for admins (works even when draft). */
export async function getShopWebsitePreview(slug: string, shopId: string): Promise<ShopWebsitePublic | null> {
  const shop = await loadShopBySlug(slug);
  if (!shop || shop.id !== shopId) return null;

  const fields = resolveWebsiteFields(shop);
  const bookingSettings = parseBookingSettings(shop.bookingSettings, {
    dayStart: shop.apptDayStart,
    dayEnd: shop.apptDayEnd,
  });
  const reviews = shop.googleReviews;
  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.starRating, 0) / reviews.length
      : null;

  return {
    slug: siteSlugFromShop(shop.bookingSlug, shop.code),
    shopName: shop.name,
    phone: shop.phone,
    email: shop.email,
    address: shop.address,
    address2: shop.address2,
    city: shop.city,
    state: shop.state,
    zip: shop.zip,
    ...fields,
    bookingSlug: shop.bookingSlug,
    onlineBookingEnabled: shop.onlineBookingEnabled,
    bookingServices: bookingSettings.services.map((s) => s.name).filter(Boolean),
    hoursLabel: formatHours(bookingSettings),
    reviews,
    averageRating: avg,
    reviewCount: reviews.length,
  };
}

export function buildLocalBusinessJsonLd(site: ShopWebsitePublic, siteUrl: string): object {
  const street = [site.address, site.address2].filter(Boolean).join(", ");
  return {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: site.shopName,
    description: site.metaDescription,
    url: siteUrl,
    telephone: site.phone ?? undefined,
    email: site.email ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: street || undefined,
      addressLocality: site.city ?? undefined,
      addressRegion: site.state ?? undefined,
      postalCode: site.zip ?? undefined,
      addressCountry: "US",
    },
    ...(site.averageRating && site.reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: site.averageRating.toFixed(1),
            reviewCount: site.reviewCount,
          },
        }
      : {}),
  };
}

/** Ensure a website config row exists for the shop. */
export async function ensureWebsiteConfig(shopId: string) {
  const existing = await prisma.shopWebsiteConfig.findUnique({ where: { shopId } });
  if (existing) return existing;

  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    select: { name: true, city: true, state: true },
  });

  return prisma.shopWebsiteConfig.create({
    data: {
      shopId,
      heroHeadline: defaultHeroHeadline(shop.name, shop.city),
      heroSubtext: defaultHeroSubtext(),
      aboutText: defaultAboutText(shop.name, shop.city, shop.state),
      servicesJson: defaultWebsiteServices(shop.name),
      metaTitle: defaultMetaTitle(shop.name, shop.city),
      metaDescription: defaultMetaDescription(shop.name, shop.city),
      keywords: shop.city ? [`auto repair ${shop.city.toLowerCase()}`, "brake service", "oil change"] : [],
    },
  });
}

function computeAutoChecklist(input: {
  config: {
    published: boolean;
    heroHeadline: string | null;
    heroSubtext: string | null;
    aboutText: string | null;
    servicesJson: unknown;
    metaTitle: string | null;
    metaDescription: string | null;
    keywords: string[];
    schemaEnabled: boolean;
    googleAnalyticsId: string | null;
    seoChecklistCompleted: unknown;
  };
  shop: {
    name: string;
    city: string | null;
    state: string | null;
    phone: string | null;
    address: string | null;
    onlineBookingEnabled: boolean;
    bookingSlug: string | null;
  };
  gbpConnected: boolean;
  defaults: ReturnType<typeof resolveWebsiteFields>;
}): Record<string, boolean> {
  const manual = parseChecklist(input.config.seoChecklistCompleted);
  const services = parseServicesJson(input.config.servicesJson, input.shop.name);

  const auto: Record<string, boolean> = {
    meta_title: Boolean(input.config.metaTitle?.trim()),
    meta_description: Boolean(input.config.metaDescription?.trim()),
    hero_content: Boolean(
      input.config.heroHeadline?.trim() &&
        input.config.heroHeadline !== defaultHeroHeadline(input.shop.name, input.shop.city),
    ),
    about_text: Boolean(
      input.config.aboutText?.trim() &&
        input.config.aboutText !==
          defaultAboutText(input.shop.name, input.shop.city, input.shop.state ?? null),
    ),
    services_listed: services.length >= 3,
    business_info: Boolean(input.shop.phone && input.shop.address && input.shop.city),
    site_published: input.config.published,
    booking_linked: input.shop.onlineBookingEnabled && Boolean(input.shop.bookingSlug),
    gbp_connected: input.gbpConnected,
    schema_markup: input.config.schemaEnabled,
    keywords_defined: input.config.keywords.length > 0,
    analytics_connected: Boolean(input.config.googleAnalyticsId?.trim()),
  };

  return { ...auto, ...manual };
}

/** CRM admin payload for /marketing/website. */
export async function getWebsiteAdmin(shopId: string, hasFeature: boolean): Promise<ShopWebsiteAdmin> {
  const config = await ensureWebsiteConfig(shopId);

  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    select: {
      name: true,
      city: true,
      state: true,
      phone: true,
      address: true,
      bookingSlug: true,
      code: true,
      onlineBookingEnabled: true,
      websiteConfig: true,
      integrations: {
        where: { vendorKey: GOOGLE_REVIEWS_VENDOR_KEY },
        select: { config: true },
        take: 1,
      },
    },
  });

  const slug = siteSlugFromShop(shop.bookingSlug, shop.code);
  const siteUrl = publicUrl(publicSitePath(slug));
  const bookingUrl = shop.bookingSlug && shop.onlineBookingEnabled
    ? publicUrl(`/book/${shop.bookingSlug}`)
    : null;

  const gbpConfig = shop.integrations[0]?.config;
  const gbpConnected = isGoogleReviewsConnected(parseGoogleReviewsConfig(gbpConfig));

  const defaults = resolveWebsiteFields({ ...shop, websiteConfig: config });
  const completed = computeAutoChecklist({
    config,
    shop,
    gbpConnected,
    defaults,
  });

  const customDomain = config.customDomain?.trim() ?? null;
  const customDomainProperty = customDomain
    ? await prisma.seoProperty.findFirst({
        where: {
          shopId,
          source: SeoPropertySource.CUSTOM_DOMAIN,
          domain: customDomain,
        },
        select: { verifiedAt: true },
      })
    : null;

  return {
    slug,
    siteUrl,
    published: config.published,
    hasFeature,
    heroHeadline: defaults.heroHeadline,
    heroSubtext: defaults.heroSubtext,
    aboutText: defaults.aboutText,
    services: defaults.services,
    metaTitle: defaults.metaTitle,
    metaDescription: defaults.metaDescription,
    keywords: defaults.keywords,
    googleAnalyticsId: config.googleAnalyticsId,
    schemaEnabled: config.schemaEnabled,
    seoChecklist: SEO_CHECKLIST.map((item) => ({
      ...item,
      completed: Boolean(completed[item.id]),
      auto: item.auto ?? false,
    })),
    seoScore: computeSeoScore(completed),
    onlineBookingEnabled: shop.onlineBookingEnabled,
    bookingUrl,
    gbpConnected,
    businessInfoComplete: Boolean(shop.phone && shop.address && shop.city),
    customDomain,
    cnameTarget: customDomainCnameTarget(slug),
    customDomainVerified: Boolean(customDomainProperty?.verifiedAt),
  };
}

/** Sitemap XML for a published shop microsite. */
export async function generateShopSitemap(slug: string): Promise<string | null> {
  const site = await getPublishedShopWebsite(slug);
  if (!site) return null;

  const base = publicUrl(publicSitePath(slug));
  const paths = ["", "/services", "/contact"];
  for (const svc of site.services) {
    const slugPart = serviceSlug(svc.title);
    if (slugPart) paths.push(`/services/${slugPart}`);
  }
  const urls = paths
    .map(
      (p) =>
        `  <url>\n    <loc>${base}${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p === "" ? "1.0" : "0.8"}</priority>\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
