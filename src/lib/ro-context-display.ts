import { formatVehicleDisplayLabel, type VehicleDisplayInput } from "@/lib/vehicle-display";

export function formatVehicleContextLabel(
  vehicle: VehicleDisplayInput | null,
  maxLen = 32,
): { display: string; full: string } {
  if (!vehicle) return { display: "—", full: "—" };
  const full = formatVehicleDisplayLabel(vehicle);
  const display = full.length > maxLen ? `${full.slice(0, maxLen - 1)}…` : full;
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
