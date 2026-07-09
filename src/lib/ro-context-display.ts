/** Title-case a single vehicle token (make/model/trim); years pass through unchanged. */
function titleCaseToken(token: string): string {
  if (/^\d+$/.test(token)) return token;
  const lower = token.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function formatVehicleContextLabel(
  vehicle: {
    year?: number | string | null;
    make?: string | null;
    model?: string | null;
    trim?: string | null;
  } | null,
  maxLen = 32,
): { display: string; full: string } {
  if (!vehicle) return { display: "—", full: "—" };
  const parts = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(
    (p) => p != null && String(p).trim() !== "",
  ) as (string | number)[];
  const full = parts.map(String).join(" ");
  const titled = parts.map((p, i) => (i === 0 ? String(p) : titleCaseToken(String(p)))).join(" ");
  const display = titled.length > maxLen ? `${titled.slice(0, maxLen - 1)}…` : titled;
  return { display, full };
}

/** Full VIN split into prefix + highlighted last 8 for context-bar rendering. */
export function splitVinForDisplay(vin: string): {
  full: string;
  prefix: string;
  last8: string;
} {
  const full = vin.trim().toUpperCase();
  if (full.length <= 8) {
    return { full, prefix: "", last8: full };
  }
  return {
    full,
    prefix: full.slice(0, -8),
    last8: full.slice(-8),
  };
}

/** Last 8 characters of a VIN for compact context-bar display. */
export function vinLast8(vin: string): string {
  return splitVinForDisplay(vin).last8;
}

/** `sms:` deep link from a stored phone value (digits-only body). */
export function smsPhoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `sms:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `sms:+${digits}`;
  return `sms:${digits}`;
}
