/**
 * Heuristic splitter for compound repair descriptions that the LLM merged into one job.
 *
 * Test case (canonical):
 *   Input:  "water pump and battery replacement"
 *   Output: ["water pump replacement", "battery replacement"]
 *
 * Prefer LLM splitting via freeform-ro-intake prompt; this module is a safety net when the
 * model still returns one repairRequests entry for multiple independent systems.
 */

export type RepairRequestSegment = {
  description: string;
  positionHint?: string | null;
};

/** Single-job phrases — do not split on internal "and". */
const KEEP_TOGETHER_RE = [
  /\bpads?\s+and\s+rotors?\b/i,
  /\brotors?\s+and\s+pads?\b/i,
  /\bshocks?\s+and\s+struts?\b/i,
  /\bstruts?\s+and\s+shocks?\b/i,
  /\binspect\s+and\s+advise\b/i,
  /\bdiagnos(?:e|is)\s+and\s+repair\b/i,
  /\bremove\s+and\s+replace\b/i,
  /\br\s*&\s*r\b/i,
  /\bcheck\s+and\s+(?:top\s+off|adjust)\b/i,
  /\bresurface\s+and\s+replace\b/i,
];

const WORK_SUFFIX_RE =
  /\b(replacement|repair|service|flush|change|r&r|r\/r|install|rebuild|overhaul)\s*$/i;

const GENERIC_TOKENS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "to",
  "of",
  "on",
  "in",
  "with",
  "front",
  "rear",
  "left",
  "right",
  "new",
  "customer",
  "needs",
  "need",
  "wants",
  "want",
  "replace",
  "replacement",
  "repair",
  "service",
]);

function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function shouldKeepTogether(text: string): boolean {
  return KEEP_TOGETHER_RE.some((re) => re.test(text));
}

function significantTokens(text: string): string[] {
  return normalizeWhitespace(text)
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length >= 3 && !GENERIC_TOKENS.has(t));
}

/** True when two sides look like different components/systems (not one assembly job). */
function looksLikeDistinctSystems(left: string, right: string): boolean {
  const leftTokens = significantTokens(left);
  const rightTokens = significantTokens(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return false;

  const overlap = leftTokens.filter((t) =>
    rightTokens.some((r) => r === t || r.startsWith(t) || t.startsWith(r)),
  );
  if (overlap.length === 0) return true;

  // Same primary system (e.g. "brake" on both sides) — keep as one job.
  const sharedSystem = overlap.some((t) =>
    ["brake", "brakes", "suspension", "engine", "transmission", "ac", "hvac", "cooling"].includes(t),
  );
  return !sharedSystem;
}

function propagateSharedWorkSuffix(left: string, right: string): [string, string] {
  const leftMatch = left.match(WORK_SUFFIX_RE);
  const rightMatch = right.match(WORK_SUFFIX_RE);

  if (rightMatch && !leftMatch) {
    return [`${left} ${rightMatch[1]}`, right];
  }
  if (leftMatch && !rightMatch) {
    return [left, `${right} ${leftMatch[1]}`];
  }
  return [left, right];
}

function splitOnListDelimiters(text: string): string[] | null {
  for (const re of [/,/, /;/, /\s+\+\s+/, /\n+/]) {
    const parts = text
      .split(re)
      .map((p) => normalizeWhitespace(p))
      .filter((p) => p.length >= 3);
    if (parts.length >= 2) return parts;
  }
  return null;
}

/**
 * Split one freeform repair description into independent jobs when clear multi-system
 * patterns are present. Returns a single-element array when no split applies.
 */
export function splitCompoundRepairDescription(description: string): string[] {
  const text = normalizeWhitespace(description);
  if (!text || shouldKeepTogether(text)) return [text];

  const listParts = splitOnListDelimiters(text);
  if (listParts && listParts.every((p) => !shouldKeepTogether(p))) {
    return listParts;
  }

  const andMatch = text.match(/^(.+?)\s+and\s+(.+)$/i);
  if (!andMatch) return [text];

  const [, rawLeft, rawRight] = andMatch;
  const [left, right] = propagateSharedWorkSuffix(
    normalizeWhitespace(rawLeft ?? ""),
    normalizeWhitespace(rawRight ?? ""),
  );

  if (!left || !right || shouldKeepTogether(text)) return [text];
  if (!looksLikeDistinctSystems(left, right)) return [text];

  return [left, right];
}

/** Expand merged repairRequests from LLM/fallback parse into one entry per independent job. */
export function splitMergedRepairRequests(
  requests: RepairRequestSegment[],
): RepairRequestSegment[] {
  const expanded: RepairRequestSegment[] = [];

  for (const req of requests) {
    const parts = splitCompoundRepairDescription(req.description);
    if (parts.length <= 1) {
      expanded.push(req);
      continue;
    }
    for (const description of parts) {
      expanded.push({
        description,
        positionHint: req.positionHint ?? null,
      });
    }
  }

  return expanded.length > 0 ? expanded : requests;
}
