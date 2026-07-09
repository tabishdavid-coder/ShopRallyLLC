/**
 * Format a phone number for display AS THE USER TYPES, e.g. "5182279897" →
 * "518-227-9897". Strips non-digits, caps at 10 (a leading US "1" is dropped),
 * and groups 3-3-4 with hyphens. Safe for partial input (no trailing hyphen).
 */
export function formatPhoneInput(value: string): string {
  let d = value.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** True if a string looks like a phone number (mostly digits). */
export function looksLikePhone(value: string): boolean {
  const d = value.replace(/\D/g, "");
  return d.length >= 7 && /^[\d\s()+.-]+$/.test(value.trim());
}

/** Digits only, e.g. "(518) 227-9897" → "5182279897". */
export function digitsOf(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Normalize to E.164 for Twilio (US 10-digit → +1XXXXXXXXXX). */
export function normalizePhoneE164(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = digitsOf(trimmed);
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : trimmed;
}

/** Last 10 digits for matching stored phone formats. */
export function phoneMatchKey(raw: string | null | undefined): string {
  const d = digitsOf(raw);
  return d.length >= 10 ? d.slice(-10) : d;
}

/** True when two phone strings refer to the same US number. */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = phoneMatchKey(a);
  const kb = phoneMatchKey(b);
  return Boolean(ka && kb && ka === kb);
}

/**
 * Build the searchable phone key for a customer: each phone's digits, space-
 * separated (the space stops a `contains` query from matching across numbers).
 * Returns null when there are no phones.
 */
export function phoneDigitsKey(...phones: (string | null | undefined)[]): string | null {
  const parts = phones.map(digitsOf).filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}
