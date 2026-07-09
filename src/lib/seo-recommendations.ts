import { SEO_AUTOPILOT_BASE } from "@/lib/seo-autopilot-nav";

/** Map audit recommendation text to a fix-it route. */
export function seoRecommendationFixHref(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("search console") || lower.includes("gsc")) {
    return `${SEO_AUTOPILOT_BASE}/sites`;
  }
  if (lower.includes("business profile") || lower.includes("gbp") || lower.includes("reviews")) {
    return "/marketing/reviews";
  }
  if (lower.includes("analytics") || lower.includes("ga4")) {
    return "/marketing/website";
  }
  if (lower.includes("booking")) {
    return "/marketing/online-booking";
  }
  if (lower.includes("publish") || lower.includes("meta") || lower.includes("hero")) {
    return "/marketing/website";
  }
  if (lower.includes("domain") || lower.includes("dns") || lower.includes("verify")) {
    return `${SEO_AUTOPILOT_BASE}/sites`;
  }
  return `${SEO_AUTOPILOT_BASE}/health`;
}
