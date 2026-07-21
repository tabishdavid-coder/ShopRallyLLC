import "server-only";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { chunkArray } from "@/lib/google-reviews-fetch";
import {
  getGoogleReviewsProvider,
  getMockGoogleReviewsProvider,
  GOOGLE_REVIEWS_VENDOR_KEY,
  isGoogleReviewsConnected,
  parseGoogleReviewsConfig,
  type GoogleReviewRecord,
} from "@/server/services/google-reviews";

export type GoogleReviewFilter = "all" | "needs-reply" | "low" | "five-star";

export type GoogleReviewRow = {
  id: string;
  googleReviewId: string;
  reviewerName: string;
  starRating: number;
  comment: string | null;
  reviewReply: string | null;
  googleCreatedAt: Date;
  replyUpdatedAt: Date | null;
};

export type GoogleReviewsInbox = {
  reviews: GoogleReviewRow[];
  averageRating: number;
  totalCount: number;
  needsReplyCount: number;
  mode: "live" | "mock";
  connected: boolean;
  locationName: string | null;
};

function filterWhere(filter: GoogleReviewFilter) {
  switch (filter) {
    case "needs-reply":
      return { reviewReply: null };
    case "low":
      return { starRating: { lte: 2 } };
    case "five-star":
      return { starRating: 5 };
    default:
      return {};
  }
}

export async function getGoogleReviewsIntegration(shopId?: string) {
  const id = shopId ?? (await getShopId());
  const row = await prisma.shopIntegration.findUnique({
    where: { shopId_vendorKey: { shopId: id, vendorKey: GOOGLE_REVIEWS_VENDOR_KEY } },
    select: { config: true, connectedAt: true, enabled: true },
  });
  const config = parseGoogleReviewsConfig(row?.config);
  const provider = getGoogleReviewsProvider();
  const connected = isGoogleReviewsConnected(config);
  return {
    row,
    config,
    connected,
    mode: connected && provider.mode === "live" ? ("live" as const) : ("mock" as const),
    connectedAt: row?.connectedAt ?? null,
  };
}

export async function getGoogleReviewsInbox(
  filter: GoogleReviewFilter = "all",
): Promise<GoogleReviewsInbox> {
  const shopId = await getShopId();
  const integration = await getGoogleReviewsIntegration(shopId);

  const rows = await prisma.googleReview.findMany({
    where: { shopId, ...filterWhere(filter) },
    orderBy: { googleCreatedAt: "desc" },
  });

  const allRows = await prisma.googleReview.findMany({
    where: { shopId },
    select: { starRating: true, reviewReply: true },
  });

  const totalCount = allRows.length;
  const averageRating =
    totalCount > 0
      ? Math.round((allRows.reduce((s, r) => s + r.starRating, 0) / totalCount) * 10) / 10
      : 0;
  const needsReplyCount = allRows.filter((r) => !r.reviewReply).length;

  return {
    reviews: rows,
    averageRating,
    totalCount,
    needsReplyCount,
    mode: integration.mode,
    connected: integration.connected,
    locationName: integration.config.googleLocationName ?? null,
  };
}

/** Upsert review rows from provider sync (batched transactions for scale). */
export async function upsertGoogleReviews(shopId: string, records: GoogleReviewRecord[]) {
  const chunks = chunkArray(records, 25);
  for (const chunk of chunks) {
    await prisma.$transaction(
      chunk.map((r) =>
        prisma.googleReview.upsert({
          where: {
            shopId_googleReviewId: { shopId, googleReviewId: r.googleReviewId },
          },
          create: {
            shopId,
            googleReviewId: r.googleReviewId,
            reviewerName: r.reviewerName,
            starRating: r.starRating,
            comment: r.comment,
            reviewReply: r.reviewReply,
            googleCreatedAt: r.googleCreatedAt,
          },
          update: {
            reviewerName: r.reviewerName,
            starRating: r.starRating,
            comment: r.comment,
            reviewReply: r.reviewReply,
            googleCreatedAt: r.googleCreatedAt,
            syncedAt: new Date(),
          },
        }),
      ),
    );
  }
}

/** Seed mock reviews when DB is empty and shop is not connected. */
export async function ensureMockGoogleReviews(shopId: string) {
  const count = await prisma.googleReview.count({ where: { shopId } });
  if (count > 0) return;
  const mock = getMockGoogleReviewsProvider();
  const { reviews } = await mock.listReviews("", "", "");
  await upsertGoogleReviews(shopId, reviews);
}
