import type { LaborGuideHit } from "@/lib/labor-guide-types";
import {
  derivePositionVariants,
  expandOperationVariants,
  filterVariantsByPosition,
  isPositionDerivableHit,
} from "@/lib/labor-guide-variants";

/** Parsed position intent from a shop-library search query. */
export type PositionQuery = {
  /** Normalized position labels, e.g. ["Rear"] or ["Front"]. Empty when none specified. */
  positions: string[];
  /** Query with position tokens removed — used for fuzzy/sibling matching. */
  coreQuery: string;
  raw: string;
};

const POSITION_PHRASES: { pattern: RegExp; positions: string[] }[] = [
  { pattern: /\bfront\s*(?:and|&)\s*rear\b/i, positions: ["Front & Rear"] },
  { pattern: /\bboth\s+sides\b/i, positions: ["Both Sides"] },
  { pattern: /\bfront\b/i, positions: ["Front"] },
  { pattern: /\brear\b/i, positions: ["Rear"] },
  { pattern: /\bleft\b/i, positions: ["Left"] },
  { pattern: /\bright\b/i, positions: ["Right"] },
];

function normalizeQuery(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Strip position tokens from query text for broader cache matching. */
function stripPositionTokens(query: string): string {
  return query
    .replace(/\bfront\s*(?:and|&)\s*rear\b/gi, " ")
    .replace(/\bboth\s+sides\b/gi, " ")
    .replace(/\b(?:front|rear|left|right)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract requested position(s) from a search query. */
export function parsePositionQuery(query: string): PositionQuery {
  const raw = query.trim();
  if (!raw) return { positions: [], coreQuery: "", raw };

  const positions: string[] = [];
  let working = raw;

  for (const { pattern, positions: pos } of POSITION_PHRASES) {
    if (pattern.test(working)) {
      for (const p of pos) {
        if (!positions.includes(p)) positions.push(p);
      }
      working = working.replace(pattern, " ");
    }
  }

  const coreQuery = stripPositionTokens(raw);
  return { positions, coreQuery, raw };
}

function hitText(hit: LaborGuideHit): string {
  return [hit.jobName, hit.queryText ?? "", ...hit.laborOperations].join(" ").toLowerCase();
}

/** True when hit text explicitly names a position the user did not ask for. */
function hitConflictsWithPosition(hit: LaborGuideHit, wanted: string[]): boolean {
  if (!wanted.length) return false;
  const text = hitText(hit);
  const wantsFront = wanted.some((p) => /^front$/i.test(p));
  const wantsRear = wanted.some((p) => /^rear$/i.test(p));
  const hasFront = /\bfront\b/.test(text);
  const hasRear = /\brear\b/.test(text);

  if (wantsRear && !wantsFront && hasFront && !hasRear) return true;
  if (wantsFront && !wantsRear && hasRear && !hasFront) return true;
  return false;
}

function variantMatchesQueryPosition(
  hit: LaborGuideHit,
  positions: string[],
): boolean {
  if (!positions.length) return true;
  const variants = expandOperationVariants(hit);
  const filtered = filterVariantsByPosition(variants, positions);
  return filtered.length > 0;
}

/**
 * Enrich search hits with position filtering and sibling derivation.
 * When user searches "rear brake pads" but cache has "front brake pads and rotors",
 * marks the hit as derived and attaches rear variants.
 */
export function enrichHitsWithPosition(
  hits: LaborGuideHit[],
  query: string,
): LaborGuideHit[] {
  const pq = parsePositionQuery(query);
  if (!pq.positions.length) return hits;

  const out: LaborGuideHit[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    const variants = expandOperationVariants(hit);
    let matching = filterVariantsByPosition(variants, pq.positions);

    // Sibling derivation: front-only cache row → rear variants when user asked rear
    if (matching.length === 0 && isPositionDerivableHit(hit)) {
      for (const pos of pq.positions) {
        const derived = derivePositionVariants(hit, pos);
        if (derived.length) matching = [...matching, ...derived];
      }
    }

    if (matching.length === 0) continue;

    const derived = hitConflictsWithPosition(hit, pq.positions);
    const displayHours = matching[0]?.hours ?? hit.totalHours;

    const enriched: LaborGuideHit = {
      ...hit,
      id: derived ? `${hit.id}:pos-${pq.positions.join("-").toLowerCase()}` : hit.id,
      totalHours: displayHours,
      positionFilter: pq.positions,
      derivedFrom: derived ? hit.jobName : undefined,
      notes: derived
        ? "Derived from opposite position — verify hours before quoting."
        : hit.notes,
    };

    const key = `${enriched.jobName.toLowerCase()}|${pq.positions.join(",")}|${derived ? "d" : "m"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(enriched);
  }

  return out;
}

/** Score how well a hit matches a position-stripped core query (for sibling ranking). */
export function coreQueryMatchScore(hit: LaborGuideHit, coreQuery: string): number {
  const needle = normalizeQuery(coreQuery);
  if (!needle) return 0;
  const hay = normalizeQuery(hitText(hit));
  if (hay.includes(needle)) return 100;
  const words = needle.split(" ").filter((w) => w.length > 1);
  const matched = words.filter((w) => hay.includes(w)).length;
  return words.length ? Math.round((matched / words.length) * 80) : 0;
}

/** Whether a hit is worth considering for sibling position derivation. */
export function isSiblingCandidate(hit: LaborGuideHit, pq: PositionQuery): boolean {
  if (!pq.positions.length || !pq.coreQuery) return false;
  if (!isPositionDerivableHit(hit)) return false;
  if (coreQueryMatchScore(hit, pq.coreQuery) < 40) return false;
  return hitConflictsWithPosition(hit, pq.positions) || !variantMatchesQueryPosition(hit, pq.positions);
}
