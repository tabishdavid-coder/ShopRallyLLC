/** OAuth state helpers for Google Search Console connect flow. */

export function encodeGoogleGscOAuthState(shopId: string): string {
  return Buffer.from(JSON.stringify({ shopId, purpose: "gsc", ts: Date.now() }), "utf8").toString(
    "base64url",
  );
}

export function decodeGoogleGscOAuthState(state: string): { shopId: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      shopId?: string;
      purpose?: string;
      ts?: number;
    };
    if (parsed.purpose !== "gsc") return null;
    if (!parsed.shopId || typeof parsed.shopId !== "string") return null;
    if (!parsed.ts || Date.now() - parsed.ts > 15 * 60 * 1000) return null;
    return { shopId: parsed.shopId };
  } catch {
    return null;
  }
}
