"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";
import { PLANS } from "@/lib/plans";
import {
  ensureAccessToken,
  getGoogleReviewsProvider,
  getLiveGoogleReviewsProvider,
  GOOGLE_REVIEWS_VENDOR_KEY,
  isGoogleReviewsConnected,
  parseGoogleReviewsConfig,
} from "@/server/services/google-reviews";
import {
  ensureMockGoogleReviews,
  getGoogleReviewsIntegration,
  upsertGoogleReviews,
} from "@/server/google-reviews";
import { encodeGoogleOAuthState } from "@/lib/google-reviews-oauth";
import { parseReviewReplyTone, type ReviewReplyTone, type ReviewReplyVariant } from "@/lib/review-reply-tone";
import { suggestGoogleReviewReply } from "@/server/services/ai/review-reply";
import { isAiConfigured } from "@/server/services/ai/client";
import { gates } from "@/server/permission-gates";

export type GoogleReviewsActionResult =
  | { ok: true; message?: string; url?: string; draft?: string }
  | { ok: false; error: string };

function revalidateReviews() {
  revalidatePath("/marketing/reviews");
  revalidatePath("/marketing/reviews/settings");
  revalidatePath("/vendors/integrations");
  revalidatePath("/vendors/integrations/google-reviews");
}

/** Start Google OAuth — redirects shop owner to consent screen. */
export async function connectGoogleReviews(): Promise<GoogleReviewsActionResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const provider = getGoogleReviewsProvider();
  const state = encodeGoogleOAuthState(shopId);
  const res = provider.getOAuthUrl(state);
  if (!res.ok) {
    await ensureMockGoogleReviews(shopId);
    return { ok: false, error: res.error };
  }
  return { ok: true, url: res.url };
}

const LocationInput = z.object({
  googleBusinessAccountId: z.string().trim().min(1, "Account ID is required."),
  googleLocationId: z.string().trim().min(1, "Location ID is required."),
  googleLocationName: z.string().trim().optional(),
});

/** Manually set GBP account/location IDs (for testing before full OAuth location picker). */
export async function saveGoogleReviewsLocation(raw: unknown): Promise<GoogleReviewsActionResult> {
  const parsed = LocationInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const existing = await prisma.shopIntegration.findUnique({
    where: { shopId_vendorKey: { shopId, vendorKey: GOOGLE_REVIEWS_VENDOR_KEY } },
  });
  const prev = parseGoogleReviewsConfig(existing?.config);

  const config = {
    ...prev,
    googleBusinessAccountId: parsed.data.googleBusinessAccountId,
    googleLocationId: parsed.data.googleLocationId,
    googleLocationName: parsed.data.googleLocationName ?? prev.googleLocationName,
  };

  const ready = isGoogleReviewsConnected(config);

  await prisma.shopIntegration.upsert({
    where: { shopId_vendorKey: { shopId, vendorKey: GOOGLE_REVIEWS_VENDOR_KEY } },
    create: {
      shopId,
      vendorKey: GOOGLE_REVIEWS_VENDOR_KEY,
      config: config as Prisma.InputJsonValue,
      enabled: true,
      connectedAt: ready ? new Date() : null,
    },
    update: {
      config: config as Prisma.InputJsonValue,
      connectedAt: ready ? (existing?.connectedAt ?? new Date()) : null,
    },
  });

  revalidateReviews();
  return {
    ok: true,
    message: ready
      ? "Location saved. Use Sync now to pull reviews from Google."
      : "Location IDs saved — connect Google OAuth to enable live sync.",
  };
}

/** Pull reviews from Google (live) or ensure mock seed (dev). */
export async function syncGoogleReviews(): Promise<GoogleReviewsActionResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const integration = await getGoogleReviewsIntegration(shopId);

  if (!integration.connected) {
    await ensureMockGoogleReviews(shopId);
    revalidateReviews();
    return {
      ok: true,
      message: "Mock mode — demo reviews loaded. Connect Google Business to sync live reviews.",
    };
  }

  const provider = getLiveGoogleReviewsProvider();
  if (provider.mode !== "live") {
    return { ok: false, error: "Google OAuth env vars not configured on this platform." };
  }

  try {
    const tokens = await ensureAccessToken(integration.config);
    const { reviews, averageRating, totalCount } = await provider.listReviews(
      integration.config.googleBusinessAccountId!,
      integration.config.googleLocationId!,
      tokens.accessToken,
    );

    await upsertGoogleReviews(shopId, reviews);

    const config = {
      ...integration.config,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt.toISOString(),
    };
    await prisma.shopIntegration.update({
      where: { shopId_vendorKey: { shopId, vendorKey: GOOGLE_REVIEWS_VENDOR_KEY } },
      data: {
        config: config as Prisma.InputJsonValue,
        connectedAt: new Date(),
      },
    });

    revalidateReviews();
    const avg = averageRating != null ? ` · avg ${averageRating.toFixed(1)}★` : "";
    const total = totalCount != null ? ` (${totalCount} on Google)` : "";
    return { ok: true, message: `Synced ${reviews.length} reviews${avg}${total}.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    return { ok: false, error: message };
  }
}

const ReplyInput = z.object({
  reviewId: z.string().min(1),
  comment: z.string().trim().min(1, "Reply cannot be empty.").max(4096),
});

/** Save reply locally and push to Google when connected. */
export async function replyToGoogleReview(raw: unknown): Promise<GoogleReviewsActionResult> {
  const parsed = ReplyInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopId = await getShopId();
  const denied = await gates.customersMessage(shopId);
  if (denied) return denied;
  const review = await prisma.googleReview.findFirst({
    where: { id: parsed.data.reviewId, shopId },
  });
  if (!review) return { ok: false, error: "Review not found." };

  const integration = await getGoogleReviewsIntegration(shopId);
  let replyText = parsed.data.comment;

  if (integration.connected && integration.mode === "live") {
    try {
      const provider = getLiveGoogleReviewsProvider();
      const tokens = await ensureAccessToken(integration.config);
      replyText = await provider.updateReply(
        integration.config.googleBusinessAccountId!,
        integration.config.googleLocationId!,
        review.googleReviewId,
        parsed.data.comment,
        tokens.accessToken,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not post reply to Google.";
      return { ok: false, error: message };
    }
  }

  await prisma.googleReview.update({
    where: { id: review.id },
    data: {
      reviewReply: replyText,
      replyUpdatedAt: new Date(),
    },
  });

  revalidateReviews();
  return {
    ok: true,
    message: integration.connected
      ? "Reply saved and posted to Google."
      : "Reply saved locally (mock mode — will sync to Google when connected).",
  };
}

const DraftReplyInput = z.object({
  reviewId: z.string().min(1),
  variant: z.enum(["default", "shorter", "longer"]).optional(),
  currentDraft: z.string().trim().max(4096).optional(),
});

export async function getReviewReplyAiSettings(): Promise<
  { tone: ReviewReplyTone; aiEnabled: boolean }
> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) throw new Error(denied.error);
  const [shop, aiEnabled] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { aiReviewReplyTone: true },
    }),
    canUseFeature(shopId, "ai_review_replies"),
  ]);
  return {
    tone: parseReviewReplyTone(shop?.aiReviewReplyTone),
    aiEnabled,
  };
}

export async function updateReviewReplyTone(
  tone: ReviewReplyTone,
): Promise<GoogleReviewsActionResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  if (!(await canUseFeature(shopId, "ai_review_replies"))) {
    return {
      ok: false,
      error: `AI review reply settings require the ${PLANS.ENTERPRISE.name} plan.`,
    };
  }
  if (tone !== "friendly" && tone !== "formal") {
    return { ok: false, error: "Invalid tone." };
  }

  await prisma.shop.update({
    where: { id: shopId },
    data: { aiReviewReplyTone: tone },
  });

  revalidateReviews();
  return { ok: true, message: "Reply tone saved." };
}

/** Generate an AI draft reply — Overdrive only; human must review before posting. */
export async function draftGoogleReviewReply(raw: unknown): Promise<GoogleReviewsActionResult> {
  const parsed = DraftReplyInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid review." };
  }

  const shopId = await getShopId();
  const denied = await gates.customersMessage(shopId);
  if (denied) return denied;

  if (!(await canUseFeature(shopId, "ai_review_replies"))) {
    return {
      ok: false,
      error: `AI review replies are included on the ${PLANS.ENTERPRISE.name} plan. Upgrade in Billing to unlock.`,
    };
  }

  if (!isAiConfigured()) {
    return {
      ok: false,
      error: "AI drafting is not configured on this platform yet. Write a reply manually.",
    };
  }

  const [review, shop] = await Promise.all([
    prisma.googleReview.findFirst({
      where: { id: parsed.data.reviewId, shopId },
      select: {
        reviewerName: true,
        starRating: true,
        comment: true,
      },
    }),
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true, city: true, state: true, phone: true, aiReviewReplyTone: true },
    }),
  ]);

  if (!review) return { ok: false, error: "Review not found." };
  if (!shop) return { ok: false, error: "Shop not found." };

  try {
    let draft = await suggestGoogleReviewReply(shopId, {
      shopName: shop.name,
      city: shop.city,
      state: shop.state,
      reviewerName: review.reviewerName,
      starRating: review.starRating,
      comment: review.comment,
      tone: parseReviewReplyTone(shop.aiReviewReplyTone),
      variant: (parsed.data.variant ?? "default") as ReviewReplyVariant,
      currentDraft: parsed.data.currentDraft,
    });

    if (shop.phone && review.starRating <= 3 && !draft.includes(shop.phone)) {
      draft = `${draft} Please call us at ${shop.phone} so we can help.`.slice(0, 4096);
    }

    return { ok: true, draft };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate a draft.";
    return { ok: false, error: message };
  }
}

/** Disconnect Google Reviews for the current shop. */
export async function disconnectGoogleReviews(): Promise<GoogleReviewsActionResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  await prisma.shopIntegration.deleteMany({
    where: { shopId, vendorKey: GOOGLE_REVIEWS_VENDOR_KEY },
  });
  revalidateReviews();
  return { ok: true, message: "Google Reviews disconnected." };
}

/** Complete OAuth callback — store tokens (called from API route). */
export async function completeGoogleReviewsOAuth(
  shopId: string,
  code: string,
): Promise<GoogleReviewsActionResult> {
  const provider = getLiveGoogleReviewsProvider();
  const tokens = await provider.exchangeCode(code);

  const existing = await prisma.shopIntegration.findUnique({
    where: { shopId_vendorKey: { shopId, vendorKey: GOOGLE_REVIEWS_VENDOR_KEY } },
  });
  const prev = parseGoogleReviewsConfig(existing?.config);

  const config = {
    ...prev,
    refreshToken: tokens.refreshToken,
    accessToken: tokens.accessToken,
    tokenExpiresAt: tokens.expiresAt.toISOString(),
  };

  await prisma.shopIntegration.upsert({
    where: { shopId_vendorKey: { shopId, vendorKey: GOOGLE_REVIEWS_VENDOR_KEY } },
    create: {
      shopId,
      vendorKey: GOOGLE_REVIEWS_VENDOR_KEY,
      config: config as Prisma.InputJsonValue,
      enabled: true,
      connectedAt: isGoogleReviewsConnected(config) ? new Date() : null,
    },
    update: {
      config: config as Prisma.InputJsonValue,
      connectedAt: new Date(),
    },
  });

  revalidateReviews();
  return {
    ok: true,
    message: isGoogleReviewsConnected(config)
      ? "Google account connected."
      : "Google authorized — add your Business Profile location IDs, then sync.",
  };
}
