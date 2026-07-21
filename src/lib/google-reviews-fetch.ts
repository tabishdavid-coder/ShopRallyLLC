/**
 * Pure Google Reviews list helpers — paginate + map API rows (no I/O).
 * Used by the live provider and the scale test script.
 */

export const GOOGLE_REVIEWS_PAGE_SIZE = 50;
/** Cap sync volume per run (50 × 40 = 2,000 reviews). */
export const GOOGLE_REVIEWS_MAX_PAGES = 40;

export type GoogleReviewApiItem = {
  reviewId?: string;
  name?: string;
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewer?: { displayName?: string };
  reviewReply?: { comment?: string; updateTime?: string };
};

export type GoogleReviewRecord = {
  googleReviewId: string;
  reviewerName: string;
  starRating: number;
  comment: string | null;
  reviewReply: string | null;
  googleCreatedAt: Date;
};

export type GoogleReviewsPageResult = {
  reviews: GoogleReviewApiItem[];
  nextPageToken?: string;
  averageRating?: number;
  totalReviewCount?: number;
};

function starRatingToInt(raw: string | undefined): number {
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  if (!raw) return 5;
  if (map[raw]) return map[raw];
  const n = Number.parseInt(raw, 10);
  return n >= 1 && n <= 5 ? n : 5;
}

export function mapGoogleReviewApiItem(r: GoogleReviewApiItem): GoogleReviewRecord {
  const id = r.reviewId ?? r.name?.split("/").pop() ?? `unknown-${Math.random()}`;
  return {
    googleReviewId: id,
    reviewerName: r.reviewer?.displayName ?? "Google user",
    starRating: starRatingToInt(r.starRating),
    comment: r.comment?.trim() || null,
    reviewReply: r.reviewReply?.comment?.trim() || null,
    googleCreatedAt: new Date(r.createTime ?? r.updateTime ?? Date.now()),
  };
}

/** Strip `accounts/` / `locations/` prefixes from GBP resource names. */
export function stripGbpResourceId(raw: string, kind: "accounts" | "locations"): string {
  const prefix = `${kind}/`;
  const trimmed = raw.trim();
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}

/**
 * Walk Google list pages until exhausted or maxPages hit.
 * Dedupes by googleReviewId (last page wins on collision).
 */
export async function fetchAllReviewPages(opts: {
  fetchPage: (pageToken: string | undefined) => Promise<GoogleReviewsPageResult>;
  maxPages?: number;
}): Promise<{
  reviews: GoogleReviewRecord[];
  averageRating?: number;
  totalCount?: number;
  pagesFetched: number;
  truncated: boolean;
}> {
  const maxPages = opts.maxPages ?? GOOGLE_REVIEWS_MAX_PAGES;
  const byId = new Map<string, GoogleReviewRecord>();
  let pageToken: string | undefined;
  let pagesFetched = 0;
  let averageRating: number | undefined;
  let totalCount: number | undefined;
  let truncated = false;

  while (pagesFetched < maxPages) {
    const page = await opts.fetchPage(pageToken);
    pagesFetched += 1;
    if (page.averageRating != null) averageRating = page.averageRating;
    if (page.totalReviewCount != null) totalCount = page.totalReviewCount;

    for (const item of page.reviews) {
      const mapped = mapGoogleReviewApiItem(item);
      byId.set(mapped.googleReviewId, mapped);
    }

    if (!page.nextPageToken) break;
    pageToken = page.nextPageToken;
    if (pagesFetched >= maxPages) {
      truncated = true;
      break;
    }
  }

  if (pageToken && pagesFetched >= maxPages) truncated = true;

  return {
    reviews: [...byId.values()],
    averageRating,
    totalCount,
    pagesFetched,
    truncated,
  };
}

/** Chunk an array for batched DB writes. */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be > 0");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
