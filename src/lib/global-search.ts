/** Client-safe helpers for header global search routing. */

const RO_NUMBER = /^(?:#|ro\s*#?\s*)?(\d{3,})$/i;

export function normalizeVinToken(q: string): string {
  return q.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
}

/** True when the query looks like a full or partial VIN token. */
export function looksLikeVinSearch(q: string): boolean {
  const v = normalizeVinToken(q);
  return v.length >= 11 && v.length <= 17;
}

/** True when the query looks like an RO number (#1021, RO 1021, 1021). */
export function parseRoSearchNumber(q: string): number | null {
  const raw = q.trim();
  if (!raw) return null;
  const tagged = raw.match(RO_NUMBER);
  if (tagged) {
    const n = Number(tagged[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (/^\d{3,}$/.test(raw)) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/** Fallback route when server resolution is unavailable. */
export function fallbackGlobalSearchHref(q: string): string {
  const term = q.trim();
  if (!term) return "/customers";
  const ro = parseRoSearchNumber(term);
  if (ro) return `/job-board?q=${encodeURIComponent(String(ro))}`;
  if (looksLikeVinSearch(term)) return `/customers?q=${encodeURIComponent(normalizeVinToken(term))}`;
  return `/customers?q=${encodeURIComponent(term)}`;
}
