import "server-only";

import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/db/client";
import { shopHasFeature, type ShopPlanContext } from "@/lib/plans";
import {
  ensureAccessToken,
  getLiveGoogleReviewsProvider,
  GOOGLE_REVIEWS_VENDOR_KEY,
  isGoogleReviewsConnected,
  parseGoogleReviewsConfig,
} from "@/server/services/google-reviews";
import { ensureMockGoogleReviews, upsertGoogleReviews } from "@/server/google-reviews";

export type SyncGoogleReviewsResult =
  | {
      ok: true;
      synced: number;
      averageRating?: number;
      totalCount?: number;
      pagesFetched: number;
      truncated: boolean;
      message: string;
      mock?: boolean;
    }
  | { ok: false; error: string };

/** Sync one shop — used by the UI action and background runner (no session required). */
export async function syncGoogleReviewsForShop(shopId: string): Promise<SyncGoogleReviewsResult> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { plan: true, planFeatures: true },
  });
  if (!shop) return { ok: false, error: "Shop not found." };

  const planCtx: ShopPlanContext = {
    plan: shop.plan,
    planFeatures: shop.planFeatures,
  };
  if (!shopHasFeature(planCtx, "googleReviews")) {
    return { ok: false, error: "Google Reviews is not included on this shop’s plan." };
  }

  const row = await prisma.shopIntegration.findUnique({
    where: { shopId_vendorKey: { shopId, vendorKey: GOOGLE_REVIEWS_VENDOR_KEY } },
    select: { config: true, connectedAt: true },
  });
  const config = parseGoogleReviewsConfig(row?.config);
  const connected = isGoogleReviewsConnected(config);

  if (!connected) {
    await ensureMockGoogleReviews(shopId);
    return {
      ok: true,
      synced: 0,
      pagesFetched: 0,
      truncated: false,
      mock: true,
      message: "Mock mode — demo reviews loaded. Connect Google Business to sync live reviews.",
    };
  }

  const provider = getLiveGoogleReviewsProvider();
  if (provider.mode !== "live") {
    return { ok: false, error: "Google OAuth env vars not configured on this platform." };
  }

  try {
    const tokens = await ensureAccessToken(config);
    const { reviews, averageRating, totalCount, pagesFetched, truncated } =
      await provider.listReviews(
        config.googleBusinessAccountId!,
        config.googleLocationId!,
        tokens.accessToken,
      );

    await upsertGoogleReviews(shopId, reviews);

    const nextConfig = {
      ...config,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt.toISOString(),
    };
    await prisma.shopIntegration.update({
      where: { shopId_vendorKey: { shopId, vendorKey: GOOGLE_REVIEWS_VENDOR_KEY } },
      data: {
        config: nextConfig as Prisma.InputJsonValue,
        connectedAt: new Date(),
      },
    });

    const avg = averageRating != null ? ` · avg ${averageRating.toFixed(1)}★` : "";
    const total = totalCount != null ? ` (${totalCount} on Google)` : "";
    const more = truncated ? " · more pages available on next sync" : "";
    return {
      ok: true,
      synced: reviews.length,
      averageRating,
      totalCount,
      pagesFetched,
      truncated,
      message: `Synced ${reviews.length} reviews across ${pagesFetched} page(s)${avg}${total}${more}.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    return { ok: false, error: message };
  }
}
