import type { Metadata } from "next";

import { BRAND, BRAND_ASSETS, BRAND_OG_IMAGE_SIZE } from "@/lib/brand";
import { getAppUrl } from "@/lib/app-url";
import { HOME_FAQ } from "@/lib/marketing-launch";
import {
  shoprallyStarterMonthly,
  shoprallyStarterPricePairLabel,
} from "@/lib/plans";

/**
 * Canonical marketing host for getShopRally.com SEO.
 * Prefer MARKETING_SITE_URL / APP_URL in env; production fallback is BRAND.url.
 */
export function getMarketingSiteUrl(): string {
  const explicit =
    process.env.MARKETING_SITE_URL?.trim() || process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return BRAND.url;
  return getAppUrl();
}

export function marketingAbsoluteUrl(path: string = "/"): string {
  const base = getMarketingSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Public marketing URLs that belong in the sitemap (indexable). */
export const MARKETING_SITEMAP_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/pricing", changeFrequency: "weekly" as const, priority: 0.95 },
  { path: "/features", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/integrations", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/compare", changeFrequency: "monthly" as const, priority: 0.85 },
  {
    path: "/compare/tekmetric-alternative",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    path: "/compare/autoleap-alternative",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    path: "/compare/shopmonkey-alternative",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    path: "/compare/garage360-alternative",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    path: "/compare/torque360-alternative",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    path: "/compare/shop-ware-alternative",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    path: "/compare/repairshopr-alternative",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    path: "/compare/ari-alternative",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  { path: "/demo", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/launch", changeFrequency: "weekly" as const, priority: 0.85 },
  { path: "/signup", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/legal/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/legal/terms", changeFrequency: "yearly" as const, priority: 0.3 },
] as const;

const DEFAULT_OG_IMAGE = {
  url: BRAND_ASSETS.ogImage,
  width: BRAND_OG_IMAGE_SIZE.width,
  height: BRAND_OG_IMAGE_SIZE.height,
  alt: `${BRAND.name} — Auto repair shop management software`,
} as const;

export type MarketingPageSeoInput = {
  path: string;
  /** Title segment — template adds " — ShopRally" unless absoluteTitle */
  title: string;
  description: string;
  /** Use full title as-is (home page) */
  absoluteTitle?: boolean;
  index?: boolean;
  follow?: boolean;
};

/** Per-page metadata with canonical + Open Graph for marketing routes. */
export function marketingPageMetadata(input: MarketingPageSeoInput): Metadata {
  const url = marketingAbsoluteUrl(input.path);
  const index = input.index ?? true;
  const follow = input.follow ?? index;
  const title = input.absoluteTitle
    ? { absolute: input.title }
    : input.title;

  return {
    title,
    description: input.description,
    alternates: { canonical: url },
    robots: { index, follow },
    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      siteName: BRAND.name,
      title: input.absoluteTitle ? input.title : `${input.title} — ${BRAND.name}`,
      description: input.description,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: input.absoluteTitle ? input.title : `${input.title} — ${BRAND.name}`,
      description: input.description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}

/** Organization + SoftwareApplication + FAQ JSON-LD for the marketing home. */
export function buildMarketingHomeJsonLd(): Record<string, unknown>[] {
  const site = getMarketingSiteUrl();

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    legalName: BRAND.legalName,
    url: site,
    email: BRAND.supportEmail,
    logo: marketingAbsoluteUrl(BRAND_ASSETS.logoLockup),
    sameAs: [] as string[],
  };

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: site,
    description:
      "Cloud shop management software for auto repair shops — job board, estimates, PartsTech, Carfax, two-way SMS, Google Reviews inbox, and digital vehicle inspections on Ignition.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: shoprallyStarterMonthly(true).toFixed(2),
      highPrice: shoprallyStarterMonthly(false).toFixed(2),
      offerCount: "2",
      description: `Ignition founding pricing — ${shoprallyStarterPricePairLabel()} (see /pricing)`,
      url: marketingAbsoluteUrl("/pricing"),
    },
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: site,
    },
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return [organization, software, faq];
}
