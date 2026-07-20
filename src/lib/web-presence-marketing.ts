/**
 * Public marketing packaging for ShopSite + Local SEO — companion product line,
 * billed separately from Ignition CRM. Do not merge into Ignition plan bullets.
 */

import { WEB_PRESENCE_SERVICES, webPresenceAlaCarteMonthlyDollars } from "@/lib/plans";

export const WEB_PRESENCE_MARKETING = {
  crmTabLabel: "Shop CRM",
  websiteTabLabel: "Website & SEO",
  /** Query flag on /demo, /launch, /pricing */
  needQuery: "website" as const,
  eyebrow: "Companion product · not Ignition CRM",
  /** Outcome-first — used in WebsiteSeoOffer + pricing tab hero */
  headline: "Get found. Book more work.",
  /** One short bridge under the headline — not a paragraph */
  subhead:
    "ShopSite, local SEO, and Google Business Profile — plus local Google Ads help when you advertise.",
  /** Pricing-page tab hero only — keeps companion framing without repeating the offer */
  heroBridge: "Separate from Ignition CRM. Request a setup — we don't bury this in the CRM plan.",
  /** Reciprocity band — concrete deliverables before the ask */
  valueLead: "What you get before you request",
  whatYouGet: [
    {
      title: "ShopSite",
      bullets: [
        "Hosted branded shop website",
        "Services, contact & custom domain",
        "Booking hook-up from your profile",
      ],
    },
    {
      title: "Local SEO",
      bullets: [
        "On-page SEO & structured data",
        "Search Console monitoring",
        "Growth Engine SEO runs",
      ],
    },
    {
      title: "Local Google presence",
      bullets: [
        "Google Business Profile optimization",
        "Organic local / Maps visibility work",
        "Local Google Ads tuning when you advertise",
      ],
    },
    {
      title: "Launch setup",
      bullets: [
        "One-time build & configure at go-live",
        "Then monthly only — no surprise retainers",
        "Ignition CRM itself has no setup fee",
      ],
    },
  ] as const,
  /** Calm contrast — agency reality, not spam urgency */
  agencyContrast:
    "Agency site retainers often run $150–300/mo · SEO retainers often $500+/mo. We publish flat rates.",
  honestyNote:
    "Billed separately from Ignition CRM. We don't promise rankings, Map Pack placement, or a specific ROI.",
  ctaPrimary: "Request a website & SEO setup",
  ctaHint: "Tell us you need a site + local SEO — separate from Ignition founding seats.",
  ctaSecondary: "Ignition CRM pricing",
  crossLinkLabel: "Website & SEO — separate from Ignition",
} as const;

export function webPresenceRequestDemoHref(): string {
  return `/demo?need=${WEB_PRESENCE_MARKETING.needQuery}`;
}

export function webPresenceRequestWaitlistHref(): string {
  return `/launch?need=${WEB_PRESENCE_MARKETING.needQuery}`;
}

export function webPresencePricingTabHref(): string {
  return `/pricing?tab=${WEB_PRESENCE_MARKETING.needQuery}`;
}

/** Lead-body interest line when `need=website`. */
export function webPresenceInterestLabel(): string {
  return "Website & SEO (separate from Ignition CRM)";
}

export function webPresenceBundleService() {
  return WEB_PRESENCE_SERVICES.find((s) => s.id === "web-seo-bundle-monthly");
}

export function webPresenceAlaCarteLabel(): string {
  return `$${webPresenceAlaCarteMonthlyDollars()}/mo à la carte`;
}
