import type { Metadata } from "next";

import { BRAND, BRAND_ASSETS, BRAND_OG_IMAGE_SIZE } from "@/lib/brand";
import { getAppUrl } from "@/lib/app-url";

const defaultDescription =
  "Cloud shop management for independent repair shops — CRM, job board, estimates, payments, and Growth Engine marketing.";

const ogShareImage = {
  url: BRAND_ASSETS.ogImage,
  width: BRAND_OG_IMAGE_SIZE.width,
  height: BRAND_OG_IMAGE_SIZE.height,
  alt: `${BRAND.name} — Auto repair shop management software`,
} as const;

/** Shared Next.js metadata for ShopRally (root + marketing pages). */
export function shoprallyMetadata(overrides?: Metadata): Metadata {
  const baseUrl = getAppUrl();
  /** Google Search Console HTML-tag verify — paste token only (not the full meta tag). */
  const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: `${BRAND.name} — Auto Repair Shop Management Software`,
      template: `%s — ${BRAND.name}`,
    },
    description: defaultDescription,
    applicationName: BRAND.name,
    icons: {
      icon: [
        { url: BRAND_ASSETS.appIcon, type: "image/svg+xml" },
        { url: BRAND_ASSETS.markSvg, type: "image/svg+xml" },
      ],
      apple: BRAND_ASSETS.appleMark,
    },
    ...(googleSiteVerification
      ? { verification: { google: googleSiteVerification } }
      : {}),
    openGraph: {
      type: "website",
      locale: "en_US",
      url: baseUrl,
      siteName: BRAND.name,
      title: `${BRAND.name} — Auto Repair Shop Management Software`,
      description: BRAND.tagline,
      images: [ogShareImage],
    },
    twitter: {
      card: "summary_large_image",
      title: BRAND.name,
      description: BRAND.tagline,
      images: [ogShareImage.url],
    },
    ...overrides,
  };
}

export { defaultDescription as SHOPRALLY_DEFAULT_DESCRIPTION };
