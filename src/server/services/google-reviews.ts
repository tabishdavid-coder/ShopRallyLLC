import "server-only";

import { publicUrl } from "@/lib/app-url";
import { MOCK_GOOGLE_REVIEWS } from "@/lib/google-reviews-mock";

/**
 * Google Business Profile reviews — provider interface with mock fallback.
 * Live mode requires platform OAuth credentials + per-shop refresh token stored
 * in ShopIntegration (vendorKey: google_reviews).
 *
 * API reference: https://developers.google.com/my-business/content/review-data
 */

export const GOOGLE_REVIEWS_SCOPE = "https://www.googleapis.com/auth/business.manage";
export const GOOGLE_REVIEWS_VENDOR_KEY = "google_reviews";

export type GoogleReviewRecord = {
  googleReviewId: string;
  reviewerName: string;
  starRating: number;
  comment: string | null;
  reviewReply: string | null;
  googleCreatedAt: Date;
};

export type GoogleOAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type GoogleReviewsConnectionConfig = {
  googleBusinessAccountId?: string;
  googleLocationId?: string;
  googleLocationName?: string;
  refreshToken?: string;
  accessToken?: string;
  tokenExpiresAt?: string;
};

export interface GoogleReviewsProvider {
  readonly mode: "live" | "mock";
  getOAuthUrl(state: string): { ok: true; url: string } | { ok: false; error: string };
  exchangeCode(code: string): Promise<GoogleOAuthTokens>;
  listReviews(
    accountId: string,
    locationId: string,
    accessToken: string,
  ): Promise<{ reviews: GoogleReviewRecord[]; averageRating?: number; totalCount?: number }>;
  updateReply(
    accountId: string,
    locationId: string,
    reviewId: string,
    comment: string,
    accessToken: string,
  ): Promise<string>;
}

const OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVIEWS_BASE = "https://mybusiness.googleapis.com/v4";

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function googleOAuthConfig() {
  const clientId = env("GOOGLE_CLIENT_ID");
  const clientSecret = env("GOOGLE_CLIENT_SECRET");
  const redirectUri =
    env("GOOGLE_REDIRECT_URI") ?? publicUrl("/api/google/reviews/callback");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

class LiveGoogleReviewsProvider implements GoogleReviewsProvider {
  readonly mode = "live" as const;

  getOAuthUrl(state: string) {
    const cfg = googleOAuthConfig();
    if (!cfg) {
      return {
        ok: false as const,
        error: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google OAuth.",
      };
    }
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: "code",
      scope: GOOGLE_REVIEWS_SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return { ok: true as const, url: `${OAUTH_AUTH_URL}?${params.toString()}` };
  }

  async exchangeCode(code: string): Promise<GoogleOAuthTokens> {
    const cfg = googleOAuthConfig();
    if (!cfg) throw new Error("Google OAuth is not configured.");

    const body = new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    });

    const res = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new Error(json.error_description ?? json.error ?? `Token exchange failed (${res.status}).`);
    }
    if (!json.refresh_token) {
      throw new Error("No refresh token returned — revoke app access in Google Account and reconnect.");
    }
    const expiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000);
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<GoogleOAuthTokens> {
    const cfg = googleOAuthConfig();
    if (!cfg) throw new Error("Google OAuth is not configured.");

    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
    });

    const res = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new Error(json.error_description ?? json.error ?? `Token refresh failed (${res.status}).`);
    }
    return {
      accessToken: json.access_token,
      refreshToken,
      expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
    };
  }

  async listReviews(accountId: string, locationId: string, accessToken: string) {
    const parent = `accounts/${accountId}/locations/${locationId}`;
    const url = `${REVIEWS_BASE}/${parent}/reviews?pageSize=50&orderBy=updateTime desc`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as {
      reviews?: Array<{
        reviewId?: string;
        name?: string;
        starRating?: string;
        comment?: string;
        createTime?: string;
        updateTime?: string;
        reviewer?: { displayName?: string };
        reviewReply?: { comment?: string; updateTime?: string };
      }>;
      averageRating?: number;
      totalReviewCount?: number;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(json.error?.message ?? `Google reviews list failed (${res.status}).`);
    }

    const reviews: GoogleReviewRecord[] = (json.reviews ?? []).map((r) => {
      const id = r.reviewId ?? r.name?.split("/").pop() ?? `unknown-${Math.random()}`;
      return {
        googleReviewId: id,
        reviewerName: r.reviewer?.displayName ?? "Google user",
        starRating: starRatingToInt(r.starRating),
        comment: r.comment?.trim() || null,
        reviewReply: r.reviewReply?.comment?.trim() || null,
        googleCreatedAt: new Date(r.createTime ?? r.updateTime ?? Date.now()),
      };
    });

    return {
      reviews,
      averageRating: json.averageRating,
      totalCount: json.totalReviewCount,
    };
  }

  async updateReply(
    accountId: string,
    locationId: string,
    reviewId: string,
    comment: string,
    accessToken: string,
  ) {
    const name = `accounts/${accountId}/locations/${locationId}/reviews/${reviewId}`;
    const url = `${REVIEWS_BASE}/${name}/reply`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json()) as { comment?: string; error?: { message?: string } };
    if (!res.ok) {
      throw new Error(json.error?.message ?? `Google reply update failed (${res.status}).`);
    }
    return json.comment ?? comment;
  }
}

/** Demo reviews returned when shop is not connected to Google. */
export { MOCK_GOOGLE_REVIEWS } from "@/lib/google-reviews-mock";

class MockGoogleReviewsProvider implements GoogleReviewsProvider {
  readonly mode = "mock" as const;

  getOAuthUrl() {
    return {
      ok: false as const,
      error: "Google OAuth credentials not configured — viewing seeded demo reviews in mock mode.",
    };
  }

  async exchangeCode(): Promise<GoogleOAuthTokens> {
    throw new Error("Google OAuth is not configured.");
  }

  async listReviews(_accountId?: string, _locationId?: string, _accessToken?: string) {
    return { reviews: MOCK_GOOGLE_REVIEWS, averageRating: 4.2, totalCount: MOCK_GOOGLE_REVIEWS.length };
  }

  async updateReply(
    _accountId: string,
    _locationId: string,
    reviewId: string,
    comment: string,
  ) {
    console.log(`[mock Google Reviews] reply to ${reviewId}: ${comment}`);
    return comment;
  }
}

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

let liveCached: LiveGoogleReviewsProvider | null = null;
let mockCached: MockGoogleReviewsProvider | null = null;

export function getLiveGoogleReviewsProvider(): LiveGoogleReviewsProvider {
  if (!liveCached) liveCached = new LiveGoogleReviewsProvider();
  return liveCached;
}

export function getMockGoogleReviewsProvider(): MockGoogleReviewsProvider {
  if (!mockCached) mockCached = new MockGoogleReviewsProvider();
  return mockCached;
}

/** Pick live when platform OAuth env is set; mock otherwise. */
export function getGoogleReviewsProvider(): GoogleReviewsProvider {
  return googleOAuthConfig() ? getLiveGoogleReviewsProvider() : getMockGoogleReviewsProvider();
}

export function parseGoogleReviewsConfig(raw: unknown): GoogleReviewsConnectionConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const c = raw as Record<string, unknown>;
  const str = (k: string) => (typeof c[k] === "string" && c[k].trim() ? c[k].trim() : undefined);
  return {
    googleBusinessAccountId: str("googleBusinessAccountId"),
    googleLocationId: str("googleLocationId"),
    googleLocationName: str("googleLocationName"),
    refreshToken: str("refreshToken"),
    accessToken: str("accessToken"),
    tokenExpiresAt: str("tokenExpiresAt"),
  };
}

export function isGoogleReviewsConnected(config: GoogleReviewsConnectionConfig): boolean {
  return Boolean(
    config.refreshToken && config.googleBusinessAccountId && config.googleLocationId,
  );
}

/** Public Google review URL when Business Profile is connected. */
export function buildGoogleReviewLink(config: GoogleReviewsConnectionConfig): string | null {
  const raw = config.googleLocationId?.trim();
  if (!raw) return null;
  const placeId = raw.replace(/^locations\//, "");
  if (placeId.length < 8) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export async function ensureAccessToken(
  config: GoogleReviewsConnectionConfig,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const live = getLiveGoogleReviewsProvider();
  if (!config.refreshToken) throw new Error("Google Reviews not connected for this shop.");

  const expiresAt = config.tokenExpiresAt ? new Date(config.tokenExpiresAt) : null;
  const stillValid =
    config.accessToken && expiresAt && expiresAt.getTime() > Date.now() + 60_000;

  if (stillValid && config.accessToken) {
    return {
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      expiresAt: expiresAt!,
    };
  }

  const refreshed = await live.refreshAccessToken(config.refreshToken);
  return refreshed;
}
