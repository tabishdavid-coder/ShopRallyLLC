import { z } from "zod";

/** One service block on the public shop microsite. */
export type WebsiteService = {
  title: string;
  description: string;
};

export const WebsiteServiceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500),
});

export const WebsiteServicesSchema = z.array(WebsiteServiceSchema).min(1).max(12);

export const WebsiteConfigPatchSchema = z.object({
  heroHeadline: z.string().trim().max(120).optional(),
  heroSubtext: z.string().trim().max(240).optional(),
  aboutText: z.string().trim().max(4000).optional(),
  servicesJson: WebsiteServicesSchema.optional(),
  metaTitle: z.string().trim().max(70).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  keywords: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  googleAnalyticsId: z.string().trim().max(30).optional(),
  customDomain: z.string().trim().max(253).optional(),
  schemaEnabled: z.boolean().optional(),
  seoChecklistCompleted: z.record(z.string(), z.boolean()).optional(),
});

export type WebsiteConfigPatch = z.infer<typeof WebsiteConfigPatchSchema>;

export const WebsiteBuildRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  goals: z.string().trim().min(20).max(3000),
  notes: z.string().trim().max(2000).optional(),
});

export type SeoChecklistItem = {
  id: string;
  label: string;
  description: string;
  /** When true, completion is inferred from shop/config data (not manual toggle). */
  auto?: boolean;
};

/** Local SEO checklist shown in the CRM admin module. */
export const SEO_CHECKLIST: SeoChecklistItem[] = [
  {
    id: "meta_title",
    label: "Meta title set",
    description: "Unique page title with shop name and city (50–60 chars ideal).",
    auto: true,
  },
  {
    id: "meta_description",
    label: "Meta description written",
    description: "Compelling summary with services and location (150–160 chars ideal).",
    auto: true,
  },
  {
    id: "hero_content",
    label: "Hero headline customized",
    description: "Replace the default headline with your shop's value proposition.",
    auto: true,
  },
  {
    id: "about_text",
    label: "About section filled in",
    description: "Tell customers who you are, certifications, and years in business.",
    auto: true,
  },
  {
    id: "services_listed",
    label: "Services listed",
    description: "At least three service offerings with descriptions.",
    auto: true,
  },
  {
    id: "business_info",
    label: "Address & phone complete",
    description: "NAP (name, address, phone) matches your Google Business Profile.",
    auto: true,
  },
  {
    id: "site_published",
    label: "Site published",
    description: "Turn on publishing so search engines can index your microsite.",
    auto: true,
  },
  {
    id: "booking_linked",
    label: "Online booking enabled",
    description: "Customers can book directly from your site CTA.",
    auto: true,
  },
  {
    id: "gbp_connected",
    label: "Google Business Profile connected",
    description: "Sync reviews and reinforce local trust signals.",
    auto: true,
  },
  {
    id: "schema_markup",
    label: "LocalBusiness schema enabled",
    description: "JSON-LD structured data helps Google understand your shop.",
    auto: true,
  },
  {
    id: "keywords_defined",
    label: "Target keywords added",
    description: "Primary local keywords (e.g. “auto repair Schenectady”).",
    auto: true,
  },
  {
    id: "analytics_connected",
    label: "Google Analytics ID added",
    description: "Track traffic and conversions from your microsite.",
    auto: true,
  },
];

export function defaultWebsiteServices(shopName: string): WebsiteService[] {
  return [
    {
      title: "General Repair & Maintenance",
      description: `Full-service auto repair at ${shopName} — oil changes, brakes, diagnostics, and factory-scheduled maintenance.`,
    },
    {
      title: "Brake Service",
      description: "Pads, rotors, calipers, and brake fluid service with quality parts and a safety-first inspection.",
    },
    {
      title: "Engine & Diagnostics",
      description: "Check-engine light, performance issues, and computer diagnostics from experienced technicians.",
    },
    {
      title: "Tires & Alignment",
      description: "Tire sales, rotation, balancing, and wheel alignment to keep your vehicle safe on the road.",
    },
  ];
}

export function defaultHeroHeadline(shopName: string, city?: string | null): string {
  if (city) return `Trusted Auto Repair in ${city}`;
  return `Welcome to ${shopName}`;
}

export function defaultHeroSubtext(): string {
  return "Honest estimates, expert technicians, and convenient online booking.";
}

export function defaultAboutText(shopName: string, city?: string | null, state?: string | null): string {
  const place = [city, state].filter(Boolean).join(", ");
  return `${shopName} is a locally owned auto repair shop${place ? ` serving ${place}` : ""}. We combine modern diagnostics with old-fashioned customer service — clear communication, fair pricing, and work you can trust.`;
}

export function defaultMetaTitle(shopName: string, city?: string | null): string {
  if (city) return `${shopName} | Auto Repair in ${city}`;
  return `${shopName} | Auto Repair Shop`;
}

export function defaultMetaDescription(shopName: string, city?: string | null): string {
  if (city) {
    return `${shopName} provides honest auto repair in ${city}. Brakes, maintenance, diagnostics & more. Book online today.`;
  }
  return `${shopName} — professional auto repair, maintenance, and diagnostics. Book your appointment online.`;
}

export function siteSlugFromShop(bookingSlug: string | null, code: string): string {
  return bookingSlug ?? code.toLowerCase();
}

export function publicSitePath(slug: string): string {
  return `/sites/${slug}`;
}

export function computeSeoScore(completed: Record<string, boolean>): number {
  const total = SEO_CHECKLIST.length;
  if (total === 0) return 0;
  const done = SEO_CHECKLIST.filter((item) => completed[item.id]).length;
  return Math.round((done / total) * 100);
}
