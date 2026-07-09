/** OAuth state helpers for Google Reviews connect flow (no secrets). */

export function encodeGoogleOAuthState(shopId: string): string {
  return Buffer.from(JSON.stringify({ shopId, ts: Date.now() }), "utf8").toString("base64url");
}

export function decodeGoogleOAuthState(state: string): { shopId: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      shopId?: string;
      ts?: number;
    };
    if (!parsed.shopId || typeof parsed.shopId !== "string") return null;
    if (!parsed.ts || Date.now() - parsed.ts > 15 * 60 * 1000) return null;
    return { shopId: parsed.shopId };
  } catch {
    return null;
  }
}
