import { NextRequest, NextResponse } from "next/server";

import { publicUrl } from "@/lib/app-url";
import { decodeGoogleOAuthState } from "@/lib/google-reviews-oauth";
import { completeGoogleReviewsOAuth } from "@/server/actions/google-reviews";

export const dynamic = "force-dynamic";

/** Google OAuth redirect handler — exchanges code for refresh token per shop. */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const setupUrl = publicUrl("/vendors/integrations/google-reviews");
  const reviewsUrl = publicUrl("/marketing/reviews");

  if (error) {
    const url = new URL(setupUrl);
    url.searchParams.set("error", error);
    return NextResponse.redirect(url);
  }

  if (!code || !state) {
    const url = new URL(setupUrl);
    url.searchParams.set("error", "missing_code");
    return NextResponse.redirect(url);
  }

  const decoded = decodeGoogleOAuthState(state);
  if (!decoded) {
    const url = new URL(setupUrl);
    url.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(url);
  }

  try {
    const res = await completeGoogleReviewsOAuth(decoded.shopId, code);
    if (res.ok) {
      const url = new URL(reviewsUrl);
      url.searchParams.set("connected", "1");
      url.searchParams.set(
        "message",
        res.message ??
          "Google account connected. Sync reviews to import your latest feedback.",
      );
      return NextResponse.redirect(url);
    }
    const url = new URL(setupUrl);
    url.searchParams.set("error", res.error);
    return NextResponse.redirect(url);
  } catch (err) {
    const url = new URL(setupUrl);
    url.searchParams.set("error", err instanceof Error ? err.message : "oauth_failed");
    return NextResponse.redirect(url);
  }
}
