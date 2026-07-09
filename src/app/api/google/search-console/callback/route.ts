import { NextRequest, NextResponse } from "next/server";

import { publicUrl } from "@/lib/app-url";
import { decodeGoogleGscOAuthState } from "@/lib/google-gsc-oauth";
import { completeGoogleGscOAuth } from "@/server/actions/google-search-console";

export const dynamic = "force-dynamic";

/** Google OAuth redirect — Search Console readonly scope. */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const returnUrl = publicUrl("/marketing/seo-automation");

  if (error) {
    const url = new URL(returnUrl);
    url.searchParams.set("gsc_error", error);
    return NextResponse.redirect(url);
  }

  if (!code || !state) {
    const url = new URL(returnUrl);
    url.searchParams.set("gsc_error", "missing_code");
    return NextResponse.redirect(url);
  }

  const decoded = decodeGoogleGscOAuthState(state);
  if (!decoded) {
    const url = new URL(returnUrl);
    url.searchParams.set("gsc_error", "invalid_state");
    return NextResponse.redirect(url);
  }

  try {
    const res = await completeGoogleGscOAuth(decoded.shopId, code);
    const url = new URL(returnUrl);
    if (res.ok) {
      url.searchParams.set("gsc_connected", "1");
      if (res.message) url.searchParams.set("gsc_message", res.message);
    } else {
      url.searchParams.set("gsc_error", res.error);
    }
    return NextResponse.redirect(url);
  } catch (err) {
    const url = new URL(returnUrl);
    url.searchParams.set(
      "gsc_error",
      err instanceof Error ? err.message : "oauth_failed",
    );
    return NextResponse.redirect(url);
  }
}
