import type { MetadataRoute } from "next";

import { getMarketingSiteUrl, marketingAbsoluteUrl } from "@/lib/marketing-seo";

/**
 * Crawl rules for getShopRally.com.
 * Marketing pages are allowed by default; shop CRM / platform / tokens stay out.
 */
export default function robots(): MetadataRoute.Robots {
  const host = new URL(getMarketingSiteUrl()).host;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/job-board",
        "/customers",
        "/repair-orders",
        "/appointments",
        "/inventory",
        "/reports",
        "/settings",
        "/support",
        "/vendors",
        "/maintenance-programs",
        "/marketing/",
        "/platform/",
        "/design-review/",
        "/approve/",
        "/invoice/",
        "/member/",
        "/onboard/",
        "/onboarding/",
        "/core-plan-offering-mock",
        "/login",
      ],
    },
    sitemap: marketingAbsoluteUrl("/sitemap.xml"),
    host,
  };
}
