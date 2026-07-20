import type { MetadataRoute } from "next";

import { MARKETING_SITEMAP_ROUTES, marketingAbsoluteUrl } from "@/lib/marketing-seo";

/** getShopRally.com public sitemap — marketing + legal only. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return MARKETING_SITEMAP_ROUTES.map((route) => ({
    url: marketingAbsoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
