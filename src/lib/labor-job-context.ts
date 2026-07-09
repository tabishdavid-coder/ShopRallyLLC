/**
 * Job-context guards for labor variant splits and browse facets.
 * Keeps distinct billable jobs separate (CV axle ≠ wheel bearing/hub combo).
 */

/** CV axle / halfshaft / driveshaft — never wheel-bearing combo scope. */
const CV_AXLE_RE =
  /\b(?:cv\s+axle|cv\s+joint|axle\s+shaft|half\s*shaft|halfshaft|drive\s*shaft|driveshaft|u-?joint)\b/i;

/** Wheel bearing / hub assembly jobs — valid combo-split context only. */
const WHEEL_BEARING_RE = /\b(?:wheel\s+bearing|hub\s+bearing|hub\s+assembly)\b/i;

const BRAKE_RE = /\bbrake\b/i;
const STEERING_RE = /\b(?:steering\s+rack|rack\s*(?:and|&)\s*pinion|tie\s+rod|steering\s+pump|power\s+steering)\b/i;
const ELECTRICAL_STARTING_RE = /\b(?:starter|alternator|battery|charging)\b/i;

/** Protect R&R from being treated as an "and" / "&" conjunction separator. */
export function protectRnR(text: string): string {
  return text.replace(/\br\s*&\s*r\b/gi, "RR");
}

/** Split job text on real conjunctions — not ampersands inside R&R. */
export function splitCombinedClauses(text: string): string[] {
  const safe = protectRnR(text);
  return safe
    .split(/\s*(?:\band\b|,|(?<![rR])\s*&\s*(?![rR]))\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function hasCombinedPair(text: string, a: RegExp, b: RegExp): boolean {
  const parts = splitCombinedClauses(text);
  if (parts.length >= 2) {
    const hasA = parts.some((p) => a.test(p));
    const hasB = parts.some((p) => b.test(p));
    if (hasA && hasB) return true;
  }
  const safe = protectRnR(text);
  return (
    a.test(safe) &&
    b.test(safe) &&
    (/\band\b/i.test(safe) || /,/.test(safe) || /(?<![rR])\s*&\s*(?![rR])/i.test(safe))
  );
}

export function isCvAxleJob(text: string): boolean {
  return CV_AXLE_RE.test(text);
}

export function isWheelBearingJob(text: string): boolean {
  if (isCvAxleJob(text)) return false;
  if (WHEEL_BEARING_RE.test(text)) return true;
  return /\bbearing\b/i.test(text) && /\bhub\b/i.test(text) && /\bwheel\b/i.test(text);
}

export function isBrakeJob(text: string): boolean {
  return BRAKE_RE.test(text) && /\b(?:pads?|rotors?|caliper|drum)\b/i.test(text);
}

export function isSteeringJob(text: string): boolean {
  return STEERING_RE.test(text);
}

export function isElectricalStartingJob(text: string): boolean {
  return ELECTRICAL_STARTING_RE.test(text);
}

/** Subcategory ids where wheel-bearing combo splits are never valid. */
const CV_AXLE_SUBCATEGORIES = new Set(["trans-axle", "trans-diff"]);

/** Subcategory ids where wheel-bearing combo splits may apply. */
const WHEEL_BEARING_SUBCATEGORIES = new Set(["tires-bearing", "tires-wheels"]);

/**
 * Whether a combo rule may expand variants for this hit.
 * Job name + query text take precedence over polluted laborOperations.
 */
export function comboRuleApplies(
  ruleId: string,
  text: string,
  subcategoryId?: string,
): boolean {
  const jobText = text; // caller passes jobName + queryText only for gating

  switch (ruleId) {
    case "wheel_bearing_hub":
      if (isCvAxleJob(jobText)) return false;
      if (subcategoryId && CV_AXLE_SUBCATEGORIES.has(subcategoryId)) return false;
      if (subcategoryId && WHEEL_BEARING_SUBCATEGORIES.has(subcategoryId)) {
        return isWheelBearingJob(jobText) || /\bbearing\b/i.test(jobText);
      }
      return isWheelBearingJob(jobText);

    case "pads_rotors":
      if (isSteeringJob(jobText) && !isBrakeJob(jobText)) return false;
      return isBrakeJob(jobText);

    case "starter_alternator":
      if (isSteeringJob(jobText)) return false;
      return isElectricalStartingJob(jobText);

    case "timing_belt_water_pump":
    case "serpentine_belt_tensioner":
      return !isCvAxleJob(jobText) && !isWheelBearingJob(jobText);

    default:
      return true;
  }
}

/** Primary job identity for variant gating — job name + query, not cache op lines. */
export function primaryJobText(parts: {
  jobName: string;
  queryText?: string;
}): string {
  return [parts.jobName, parts.queryText ?? ""].join(" ").toLowerCase();
}
