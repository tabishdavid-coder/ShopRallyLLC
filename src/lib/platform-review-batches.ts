/** Master CRM release review batches — current vs planned operator changes. */

export type PlatformReviewBatchStatus = "approved" | "review" | "upcoming";

export type PlatformReviewStop = {
  id: string;
  label: string;
  /** Live route under Master CRM (planned state on branch). */
  href: string;
};

export type PlatformReviewBatch = {
  id: string;
  title: string;
  status: PlatformReviewBatchStatus;
  summary: string;
  platformPath: string;
  designReviewPath: string;
  stops: PlatformReviewStop[];
};

export const CURRENT_PLATFORM_REVIEW_BATCH_ID = "batch-04";

export const PLATFORM_REVIEW_BATCHES: PlatformReviewBatch[] = [
  {
    id: "batch-04",
    title: "Master CRM platform tools",
    status: "approved",
    summary: "Stripe Connect visibility, billing columns, add-shop intake, websites/SEO navigation.",
    platformPath: "/platform/review/batch-04",
    designReviewPath: "/design-review/batch-04-platform",
    stops: [
      { id: "PLAT-01", label: "Shops + Connect column", href: "/platform/shops" },
      { id: "PLAT-02", label: "Billing overview", href: "/platform/billing" },
      { id: "PLAT-03", label: "Add shop intake", href: "/platform/shops/new" },
      { id: "PLAT-04", label: "Growth Engine SEO", href: "/platform/seo-automation" },
      { id: "PLAT-05", label: "Customer websites", href: "/platform/websites" },
      { id: "PLAT-06", label: "Platform home", href: "/platform" },
    ],
  },
];

export function getPlatformReviewBatch(id: string): PlatformReviewBatch | undefined {
  return PLATFORM_REVIEW_BATCHES.find((b) => b.id === id);
}

export function getCurrentPlatformReviewBatch(): PlatformReviewBatch | undefined {
  return getPlatformReviewBatch(CURRENT_PLATFORM_REVIEW_BATCH_ID);
}

/** Live platform URL with review tour query (highlights planned UI). */
export function platformReviewLiveHref(batchId: string, stop: PlatformReviewStop): string {
  const q = new URLSearchParams({ review: batchId, stop: stop.id });
  return `${stop.href}?${q.toString()}`;
}
