import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function rateLimitLocal(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (existing.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  return { ok: true };
}

async function rateLimitUpstash(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<RateLimitResult | null> {
  const base = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!base || !token) return null;

  const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000));
  const bucket = `${key}:${Math.floor(Date.now() / opts.windowMs)}`;

  try {
    const incrRes = await fetch(`${base}/incr/${encodeURIComponent(bucket)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!incrRes.ok) return null;

    const incrBody = (await incrRes.json()) as { result?: number };
    const count = incrBody.result ?? 0;

    if (count === 1) {
      await fetch(`${base}/expire/${encodeURIComponent(bucket)}/${windowSec}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    }

    if (count > opts.limit) {
      return { ok: false, retryAfterSec: windowSec };
    }
    return { ok: true };
  } catch {
    return null;
  }
}

/** Distributed rate limit when Upstash is configured; otherwise in-process. */
export async function rateLimitDistributed(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const remote = await rateLimitUpstash(key, opts);
  return remote ?? rateLimitLocal(key, opts);
}

export function rateLimitKey(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(":");
}

export function rateLimitAction(
  scope: string,
  actorId: string,
  limit = 30,
  windowMs = 60_000,
): RateLimitResult {
  return rateLimitLocal(rateLimitKey(["action", scope, actorId]), { limit, windowMs });
}

export function rateLimitRoute(
  route: string,
  ip: string | null,
  limit = 120,
  windowMs = 60_000,
): RateLimitResult {
  return rateLimitLocal(rateLimitKey(["route", route, ip ?? "unknown"]), { limit, windowMs });
}

export async function rateLimitRouteAsync(
  route: string,
  ip: string | null,
  limit = 120,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  return rateLimitDistributed(rateLimitKey(["route", route, ip ?? "unknown"]), { limit, windowMs });
}

export function checkRateLimit(
  key: string,
  opts: { max: number; windowMs: number },
): boolean {
  return rateLimitLocal(key, { limit: opts.max, windowMs: opts.windowMs }).ok;
}
