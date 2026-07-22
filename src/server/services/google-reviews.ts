import "server-only";

import { publicUrl } from "@/lib/app-url";
import { MOCK_GOOGLE_REVIEWS } from "@/lib/google-reviews-mock";
import {
  fetchAllReviewPages,
  GOOGLE_REVIEWS_PAGE_SIZE,
  stripGbpResourceId,
  type GoogleReviewApiItem,
  type GoogleReviewRecord,
  type GoogleReviewsPageResult,
} from "@/lib/google-reviews-fetch";
import type { GoogleBusinessAccount, GoogleBusinessLocation } from "@/lib/google-reviews-types";

export type { GoogleBusinessAccount, GoogleBusinessLocation };

/**
 * Google Business Profile reviews — provider interface with mock fallback.
 * Live mode requires platform OAuth credentials + per-shop refresh token stored
 * in ShopIntegration (vendorKey: google_reviews).
 *
 * API reference: https://developers.google.com/my-business/content/review-data
 */

export const GOOGLE_REVIEWS_SCOPE = "https://www.googleapis.com/auth/business.manage";
export const GOOGLE_REVIEWS_VENDOR_KEY = "google_reviews";

export type { GoogleReviewRecord };

export type GoogleOAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type GoogleReviewsConnectionConfig = {
  googleBusinessAccountId?: string;
  googleLocationId?: string;
  googleLocationName?: string;
  /** Maps Place ID for public writereview links (not the GBP location resource id). */
  googlePlaceId?: string;
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
  ): Promise<{
    reviews: GoogleReviewRecord[];
    averageRating?: number;
    totalCount?: number;
    pagesFetched: number;
    truncated: boolean;
  }>;
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
const ACCOUNT_MGMT_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFO_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";

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
      // Force account picker + consent so Testing-mode shops aren't auto-denied
      // on a non–test-user Google session already in the browser.
      prompt: "select_account consent",
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

  async listAccounts(accessToken: string): Promise<GoogleBusinessAccount[]> {
    const accounts: GoogleBusinessAccount[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    const maxPages = 10;

    while (pages < maxPages) {
      const url = new URL(`${ACCOUNT_MGMT_BASE}/accounts`);
      url.searchParams.set("pageSize", "20");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(20_000),
      });
      const json = (await res.json()) as {
        accounts?: Array<{ name?: string; accountName?: string }>;
        nextPageToken?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(json.error?.message ?? `Google accounts list failed (${res.status}).`);
      }

      for (const a of json.accounts ?? []) {
        if (!a.name) continue;
        accounts.push({
          accountId: stripGbpResourceId(a.name, "accounts"),
          displayName: a.accountName?.trim() || stripGbpResourceId(a.name, "accounts"),
        });
      }

      pages += 1;
      if (!json.nextPageToken) break;
      pageToken = json.nextPageToken;
    }

    return accounts;
  }

  async listLocations(accountId: string, accessToken: string): Promise<GoogleBusinessLocation[]> {
    const account = stripGbpResourceId(accountId, "accounts");
    const locations: GoogleBusinessLocation[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    const maxPages = 20;
    const readMask = "name,title,storefrontAddress,metadata";

    while (pages < maxPages) {
      const url = new URL(`${BUSINESS_INFO_BASE}/accounts/${account}/locations`);
      url.searchParams.set("pageSize", "100");
      url.searchParams.set("readMask", readMask);
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(20_000),
      });
      const json = (await res.json()) as {
        locations?: Array<{
          name?: string;
          title?: string;
          storefrontAddress?: {
            addressLines?: string[];
            locality?: string;
            administrativeArea?: string;
          };
          metadata?: { placeId?: string };
        }>;
        nextPageToken?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(json.error?.message ?? `Google locations list failed (${res.status}).`);
      }

      for (const loc of json.locations ?? []) {
        if (!loc.name) continue;
        const addressBits = [
          ...(loc.storefrontAddress?.addressLines ?? []),
          loc.storefrontAddress?.locality,
          loc.storefrontAddress?.administrativeArea,
        ].filter(Boolean);
        locations.push({
          locationId: stripGbpResourceId(loc.name, "locations"),
          displayName: loc.title?.trim() || stripGbpResourceId(loc.name, "locations"),
          placeId: loc.metadata?.placeId?.trim() || null,
          addressLine: addressBits.length ? addressBits.join(", ") : null,
        });
      }

      pages += 1;
      if (!json.nextPageToken) break;
      pageToken = json.nextPageToken;
    }

    return locations;
  }

  async listReviews(accountId: string, locationId: string, accessToken: string) {
    const account = stripGbpResourceId(accountId, "accounts");
    const location = stripGbpResourceId(locationId, "locations");
    const parent = `accounts/${account}/locations/${location}`;

    const fetchPage = async (pageToken: string | undefined): Promise<GoogleReviewsPageResult> => {
      const url = new URL(`${REVIEWS_BASE}/${parent}/reviews`);
      url.searchParams.set("pageSize", String(GOOGLE_REVIEWS_PAGE_SIZE));
      url.searchParams.set("orderBy", "updateTime desc");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(20_000),
      });
      const json = (await res.json()) as {
        reviews?: GoogleReviewApiItem[];
        averageRating?: number;
        totalReviewCount?: number;
        nextPageToken?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(json.error?.message ?? `Google reviews list failed (${res.status}).`);
      }
      return {
        reviews: json.reviews ?? [],
        nextPageToken: json.nextPageToken,
        averageRating: json.averageRating,
        totalReviewCount: json.totalReviewCount,
      };
    };

    return fetchAllReviewPages({ fetchPage });
  }

  async updateReply(
    accountId: string,
    locationId: string,
    reviewId: string,
    comment: string,
    accessToken: string,
  ) {
    const account = stripGbpResourceId(accountId, "accounts");
    const location = stripGbpResourceId(locationId, "locations");
    const name = `accounts/${account}/locations/${location}/reviews/${reviewId}`;
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
    return {
      reviews: MOCK_GOOGLE_REVIEWS,
      averageRating: 4.2,
      totalCount: MOCK_GOOGLE_REVIEWS.length,
      pagesFetched: 1,
      truncated: false,
    };
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
    googlePlaceId: str("googlePlaceId"),
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
  const placeId = config.googlePlaceId?.trim();
  if (placeId && placeId.length >= 8) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }
  // Legacy: some shops stored Place ID in googleLocationId before the picker existed.
  const raw = config.googleLocationId?.trim();
  if (!raw) return null;
  const legacy = raw.replace(/^locations\//, "");
  if (legacy.startsWith("ChIJ") || legacy.length > 20) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(legacy)}`;
  }
  return null;
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
