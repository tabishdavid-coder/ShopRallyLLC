/**
 * Cosine distance helpers for L1 vehicle-config inheritance.
 * Distance = 1 - cosine_similarity (matches pgvector <=> on normalized vectors).
 */

const AUTO_INHERIT_MAX = 0.12;
const CHASSIS_RECHECK_MAX = 0.18;

export type VectorAcceptBand = "AUTO_INHERIT" | "INHERIT_RECHECK_CHASSIS" | "REJECT";

export function cosineDistance(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    throw new Error("embedding dimension mismatch");
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 1;
  const sim = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return Math.max(0, Math.min(2, 1 - sim));
}

export function vectorAcceptBand(distance: number): VectorAcceptBand {
  if (distance <= AUTO_INHERIT_MAX) return "AUTO_INHERIT";
  if (distance <= CHASSIS_RECHECK_MAX) return "INHERIT_RECHECK_CHASSIS";
  return "REJECT";
}

/** Confidence from distance — higher when neighbors are closer. */
export function confidenceFromDistance(distance: number): number {
  if (distance <= AUTO_INHERIT_MAX) return Math.max(0.85, 1 - distance);
  if (distance <= CHASSIS_RECHECK_MAX) return Math.max(0.55, 0.9 - distance);
  return 0;
}
