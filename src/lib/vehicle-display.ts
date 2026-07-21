import { formatDisplacementL, parseEngineString } from "@/lib/engine-details";

export type VehicleDisplayInput = {
  year?: number | string | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  engine?: string | null;
  drivetrain?: string | null;
  transmission?: string | null;
};

/** Title-case a single vehicle token (make/model/trim); years pass through unchanged. */
function titleCaseToken(token: string): string {
  if (/^\d+$/.test(token)) return token;
  const lower = token.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

const DRIVE_TRIM_NOISE =
  /\b(?:AWD|FWD|RWD|4WD|2WD|4x4)(?:\/[^\s,]+(?:\s+Drive)?)?\b|\bAll[- ]?Wheel[- ]?Drive\b|\bFront[- ]?Wheel[- ]?Drive\b|\bRear[- ]?Wheel[- ]?Drive\b|\bFour[- ]?Wheel[- ]?Drive\b|\bTwo[- ]?Wheel[- ]?Drive\b/gi;

const TRANS_TRIM_NOISE =
  /\b(?:CVT|Automatic|Manual|Auto(?:matic)?(?:\s+Transmission)?)\b/gi;

/** Strip option-package appendages (+Moonroof, w/Nav, with Sunroof, etc.). */
function stripTrimPackageSuffixes(trim: string): string {
  let t = trim;
  t = t.replace(/\+[A-Za-z][A-Za-z0-9]*(?:\/[A-Za-z][A-Za-z0-9]*)*/g, "");
  t = t.replace(/\bw\/\s*[A-Za-z][A-Za-z0-9]*(?:\/[A-Za-z][A-Za-z0-9]*)*/gi, "");
  t = t.replace(/\bwith\s+[A-Za-z][A-Za-z0-9]*(?:\/[A-Za-z][A-Za-z0-9]*)*/gi, "");
  return t;
}

/** Remove option-pack noise and drive/transmission tokens from a raw trim string. */
export function sanitizeVehicleTrim(trim: string | null | undefined): string | null {
  if (!trim?.trim()) return null;
  let t = trim.trim();
  t = stripTrimPackageSuffixes(t);
  t = t.replace(DRIVE_TRIM_NOISE, "");
  t = t.replace(TRANS_TRIM_NOISE, "");
  t = t.replace(/\s{2,}/g, " ").replace(/[,;/\-–—]+\s*$/g, "").trim();
  return t || null;
}

/** Compact engine token for title lines — prefers displacement (e.g. 2.5L). */
export function formatVehicleEngineShort(engine: string | null | undefined): string | null {
  if (!engine?.trim()) return null;
  const parsed = parseEngineString(engine);
  const disp = formatDisplacementL(parsed.displacementL);
  if (disp) return disp;
  const trimmed = engine.trim();
  if (trimmed.length <= 16 && /\d/.test(trimmed)) return trimmed;
  return null;
}

export type FormatVehicleDisplayOptions = {
  /** Append ` · {engine}` when an engine value exists. Default true. */
  includeEngine?: boolean;
  /** Title-case make/model/trim tokens. Default true. */
  titleCase?: boolean;
};

/**
 * Primary CRM vehicle line: Year Make Model Trim · Engine
 * Strips package suffixes from trim; never embeds drivetrain/transmission.
 */
export function formatVehicleDisplayLabel(
  vehicle: VehicleDisplayInput | null | undefined,
  opts?: FormatVehicleDisplayOptions,
): string {
  if (!vehicle) return "Vehicle";

  const includeEngine = opts?.includeEngine !== false;
  const titleCase = opts?.titleCase !== false;
  const cleanTrim = sanitizeVehicleTrim(vehicle.trim);

  const rawParts = [
    vehicle.year != null && String(vehicle.year).trim() !== "" ? String(vehicle.year) : null,
    vehicle.make?.trim() || null,
    vehicle.model?.trim() || null,
    cleanTrim,
  ].filter(Boolean) as string[];

  if (rawParts.length === 0) return "Vehicle";

  const ymmt = titleCase
    ? rawParts.map((p, i) => (i === 0 && /^\d+$/.test(p) ? p : titleCaseToken(p))).join(" ")
    : rawParts.join(" ");

  if (!includeEngine) return ymmt;

  const engineShort = formatVehicleEngineShort(vehicle.engine);
  return engineShort ? `${ymmt} · ${engineShort}` : ymmt;
}

/** Secondary spec line — drivetrain / transmission only (not engine). */
export function formatVehicleSpecSubtitle(
  vehicle: VehicleDisplayInput | null | undefined,
): string | null {
  if (!vehicle) return null;
  const parts = [vehicle.drivetrain?.trim(), vehicle.transmission?.trim()].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
