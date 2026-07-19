/** Human-readable shop Master ID — format: RP-{CODE}-{6 digits}.

Legacy `RP-` prefix from the RepairPilot era; kept for DB compatibility. Product brand is ShopRally.
*/

const MASTER_ID_RE = /^RP-[A-Z0-9]{1,6}-\d{6}$/;

/** Normalize a shop code for embedding in a Master ID. */
export function normalizeShopCodeForMasterId(code: string): string {
  const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (cleaned.slice(0, 6) || "SH").toUpperCase();
}

/** Build a Master ID candidate from a shop code and numeric suffix. */
export function formatMasterId(shopCode: string, suffix: string): string {
  const code = normalizeShopCodeForMasterId(shopCode);
  const digits = suffix.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `RP-${code}-${digits}`;
}

/** Generate a random 6-digit suffix (100000–999999). */
export function randomMasterIdSuffix(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

/** Produce a new Master ID candidate for a shop code. */
export function generateMasterId(shopCode: string): string {
  return formatMasterId(shopCode, randomMasterIdSuffix());
}

/** Validate Master ID shape (not uniqueness). */
export function isValidMasterId(value: string): boolean {
  return MASTER_ID_RE.test(value.trim());
}

/** Deterministic Master ID from a stable shop key (seed / backfill). */
export function deterministicMasterId(shopCode: string, stableKey: string): string {
  let hash = 0;
  for (let i = 0; i < stableKey.length; i++) {
    hash = (hash * 31 + stableKey.charCodeAt(i)) >>> 0;
  }
  const suffix = String((hash % 900_000) + 100_000);
  return formatMasterId(shopCode, suffix);
}
