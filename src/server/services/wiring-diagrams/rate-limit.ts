import "server-only";

import { prisma } from "@/db/client";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_PER_WINDOW = 6;

type RateLimitState = {
  windowStart: number;
  count: number;
};

const shopWindows = new Map<string, RateLimitState>();

function shopKey(shopId: string, brand: string): string {
  return `${shopId}:${brand}`;
}

function windowMs(): number {
  const raw = Number(process.env.WIRING_DIAGRAM_RATE_WINDOW_MS ?? DEFAULT_WINDOW_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_WINDOW_MS;
}

function maxPerWindow(): number {
  const raw = Number(process.env.WIRING_DIAGRAM_RATE_MAX ?? DEFAULT_MAX_PER_WINDOW);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_PER_WINDOW;
}

/** In-process OEM rate limit per shop+brand. Resets on cold start (acceptable for dev). */
export function checkWiringDownloadRateLimit(
  shopId: string,
  brand: string,
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const key = shopKey(shopId, brand);
  const now = Date.now();
  const win = windowMs();
  const max = maxPerWindow();
  const state = shopWindows.get(key);

  if (!state || now - state.windowStart >= win) {
    shopWindows.set(key, { windowStart: now, count: 1 });
    return { allowed: true };
  }

  if (state.count >= max) {
    const retryAfterMs = win - (now - state.windowStart);
    return { allowed: false, retryAfterMs: Math.max(1000, retryAfterMs) };
  }

  state.count += 1;
  return { allowed: true };
}

/** Persist rate-limit audit row count (optional ops visibility). */
export async function countRecentDownloads(shopId: string, brand: string, minutes = 60): Promise<number> {
  const since = new Date(Date.now() - minutes * 60_000);
  return prisma.wiringDiagramDownloadJob.count({
    where: {
      shopId,
      sourceBrand: brand,
      createdAt: { gte: since },
      status: { in: ["COMPLETED", "RUNNING", "PENDING"] },
    },
  });
}
