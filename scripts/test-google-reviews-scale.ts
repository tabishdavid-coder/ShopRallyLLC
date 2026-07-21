/**
 * Scale test for Google Reviews pagination + fleet concurrency helpers.
 * No live Google API calls — simulates multi-page sync and multi-shop fan-out.
 *
 * Usage:
 *   npm run test:google-reviews-scale
 */
import {
  chunkArray,
  fetchAllReviewPages,
  GOOGLE_REVIEWS_MAX_PAGES,
  GOOGLE_REVIEWS_PAGE_SIZE,
  stripGbpResourceId,
  type GoogleReviewApiItem,
} from "../src/lib/google-reviews-fetch";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function makeReview(i: number): GoogleReviewApiItem {
  return {
    reviewId: `rev-${i}`,
    starRating: "FIVE",
    comment: `Review ${i}`,
    createTime: new Date(Date.now() - i * 60_000).toISOString(),
    reviewer: { displayName: `User ${i}` },
  };
}

async function testPaginationWalksAllPages() {
  const total = 125; // 3 pages at pageSize 50
  const all = Array.from({ length: total }, (_, i) => makeReview(i + 1));
  let calls = 0;

  const result = await fetchAllReviewPages({
    fetchPage: async (pageToken) => {
      calls += 1;
      const page = pageToken ? Number.parseInt(pageToken, 10) : 0;
      const start = page * GOOGLE_REVIEWS_PAGE_SIZE;
      const slice = all.slice(start, start + GOOGLE_REVIEWS_PAGE_SIZE);
      const nextStart = start + GOOGLE_REVIEWS_PAGE_SIZE;
      return {
        reviews: slice,
        nextPageToken: nextStart < total ? String(page + 1) : undefined,
        averageRating: 4.8,
        totalReviewCount: total,
      };
    },
  });

  assert(calls === 3, `expected 3 page fetches, got ${calls}`);
  assert(result.pagesFetched === 3, `pagesFetched=${result.pagesFetched}`);
  assert(result.reviews.length === total, `synced ${result.reviews.length}, expected ${total}`);
  assert(result.truncated === false, "should not truncate at 125 reviews");
  assert(result.totalCount === total, "totalCount should pass through");
  console.log("✓ pagination walks all pages (125 reviews / 3 pages)");
}

async function testMaxPagesCap() {
  const pagesAvailable = GOOGLE_REVIEWS_MAX_PAGES + 5;
  let calls = 0;

  const result = await fetchAllReviewPages({
    maxPages: GOOGLE_REVIEWS_MAX_PAGES,
    fetchPage: async (pageToken) => {
      calls += 1;
      const page = pageToken ? Number.parseInt(pageToken, 10) : 0;
      return {
        reviews: Array.from({ length: GOOGLE_REVIEWS_PAGE_SIZE }, (_, i) =>
          makeReview(page * GOOGLE_REVIEWS_PAGE_SIZE + i + 1),
        ),
        nextPageToken: page + 1 < pagesAvailable ? String(page + 1) : undefined,
        totalReviewCount: pagesAvailable * GOOGLE_REVIEWS_PAGE_SIZE,
      };
    },
  });

  assert(calls === GOOGLE_REVIEWS_MAX_PAGES, `calls=${calls}`);
  assert(result.truncated === true, "should mark truncated when more pages exist");
  assert(
    result.reviews.length === GOOGLE_REVIEWS_MAX_PAGES * GOOGLE_REVIEWS_PAGE_SIZE,
    `got ${result.reviews.length} reviews`,
  );
  console.log(
    `✓ max-pages cap stops at ${GOOGLE_REVIEWS_MAX_PAGES} pages (${result.reviews.length} reviews)`,
  );
}

function testChunking() {
  const items = Array.from({ length: 53 }, (_, i) => i);
  const chunks = chunkArray(items, 25);
  assert(chunks.length === 3, `chunks=${chunks.length}`);
  assert(chunks[0]!.length === 25 && chunks[1]!.length === 25 && chunks[2]!.length === 3, "chunk sizes");
  console.log("✓ upsert chunking (25-row batches)");
}

function testResourceIdStrip() {
  assert(stripGbpResourceId("accounts/123", "accounts") === "123", "account strip");
  assert(stripGbpResourceId("locations/456", "locations") === "456", "location strip");
  assert(stripGbpResourceId("789", "accounts") === "789", "bare id");
  console.log("✓ GBP resource id strip");
}

async function testFleetConcurrencySimulation() {
  const shopCount = 40;
  const concurrency = 3;
  let inFlight = 0;
  let maxInFlight = 0;
  let completed = 0;

  const shopIds = Array.from({ length: shopCount }, (_, i) => `shop_${i + 1}`);
  let next = 0;
  const results: string[] = new Array(shopCount);

  async function worker() {
    while (next < shopIds.length) {
      const i = next;
      next += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      results[i] = shopIds[i]!;
      completed += 1;
      inFlight -= 1;
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, () => worker()),
  );

  assert(completed === shopCount, `completed=${completed}`);
  assert(results.every(Boolean), "all shops processed");
  assert(maxInFlight <= concurrency, `maxInFlight=${maxInFlight} exceeded concurrency ${concurrency}`);
  assert(maxInFlight === concurrency, `expected to reach concurrency ${concurrency}, got ${maxInFlight}`);
  console.log(`✓ fleet concurrency (40 shops, max in-flight ${maxInFlight} ≤ ${concurrency})`);
}

async function main() {
  console.log("Google Reviews scale test\n");
  await testPaginationWalksAllPages();
  await testMaxPagesCap();
  testChunking();
  testResourceIdStrip();
  await testFleetConcurrencySimulation();
  console.log("\nAll scale checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
