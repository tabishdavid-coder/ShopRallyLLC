import "server-only";

import { prisma } from "@/db/client";
import { GOOGLE_REVIEWS_VENDOR_KEY, isGoogleReviewsConnected, parseGoogleReviewsConfig } from "@/server/services/google-reviews";
import { syncGoogleReviewsForShop } from "@/server/google-reviews-sync";

export type GoogleReviewsFleetSyncResult = {
  scanned: number;
  synced: number;
  skipped: number;
  failed: number;
  reviewsUpserted: number;
  errors: Array<{ shopId: string; error: string }>;
};

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await fn(items[i]!);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

/**
 * Sync Google reviews for every shop with a connected GBP integration.
 * Concurrency-limited so a large tenant fleet does not stampede Google's API.
 */
export async function syncAllConnectedGoogleReviews(opts?: {
  concurrency?: number;
  limit?: number;
}): Promise<GoogleReviewsFleetSyncResult> {
  const concurrency = Math.max(1, Math.min(opts?.concurrency ?? 3, 10));
  const rows = await prisma.shopIntegration.findMany({
    where: { vendorKey: GOOGLE_REVIEWS_VENDOR_KEY, enabled: true },
    select: { shopId: true, config: true },
    take: opts?.limit,
  });

  const eligible = rows.filter((r) => isGoogleReviewsConnected(parseGoogleReviewsConfig(r.config)));

  let synced = 0;
  let skipped = rows.length - eligible.length;
  let failed = 0;
  let reviewsUpserted = 0;
  const errors: Array<{ shopId: string; error: string }> = [];

  const outcomes = await mapPool(eligible, concurrency, async ({ shopId }) => {
    const result = await syncGoogleReviewsForShop(shopId);
    return { shopId, result };
  });

  for (const { shopId, result } of outcomes) {
    if (!result.ok) {
      failed += 1;
      errors.push({ shopId, error: result.error });
      continue;
    }
    if (result.mock) {
      skipped += 1;
      continue;
    }
    synced += 1;
    reviewsUpserted += result.synced;
  }

  return {
    scanned: rows.length,
    synced,
    skipped,
    failed,
    reviewsUpserted,
    errors: errors.slice(0, 25),
  };
}
