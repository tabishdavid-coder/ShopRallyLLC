import { compactOperationName } from "@/lib/labor-guide-helpers";

const PROCEDURE_STEP_RE = /^\s*(?:\d+[\.)]|[-•*])\s+/m;
const PROCEDURE_VERB_RE =
  /\b(remove|reinstall|inspect|torque|bleed|clean|adjust|drain|refill|disconnect|connect|measure)\b/i;

const JOB_STOP_WORDS = new Set([
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
  "job",
  "service",
  "repair",
  "replace",
  "replacement",
  "remove",
  "r",
  "rnr",
  "rr",
]);

/** True when text looks like a multi-step procedure — belongs in job notes, not labor grid. */
export function isVerboseProcedureText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.length > 120) return true;
  if (t.includes("\n")) return true;
  if (PROCEDURE_STEP_RE.test(t)) return true;
  const sentences = t.split(/[.;]\s+/).filter(Boolean);
  if (sentences.length >= 3 && PROCEDURE_VERB_RE.test(t)) return true;
  if ((t.match(/;/g)?.length ?? 0) >= 2) return true;
  return false;
}

/** Short labor line + optional procedure notes — mirrors Smart RO intake / labor-guide patterns. */
export function cleanEstimateLaborLine(
  jobName: string,
  rawDescription: string,
  laborOperations: string[] = [],
  aiNotes = "",
): { laborDescription: string; jobNotes: string | null } {
  const opsText = laborOperations.filter(Boolean).join("; ");
  const shortFromName = compactOperationName(jobName);
  const shortFromDesc = compactOperationName(rawDescription);

  let laborDescription = shortFromName;
  if (!isVerboseProcedureText(rawDescription) && rawDescription.trim().length <= 80) {
    laborDescription = shortFromDesc || shortFromName;
  } else if (
    shortFromDesc &&
    shortFromDesc.length <= 80 &&
    !isVerboseProcedureText(shortFromDesc)
  ) {
    laborDescription = shortFromDesc;
  }

  const noteParts: string[] = [];
  if (isVerboseProcedureText(rawDescription)) noteParts.push(rawDescription.trim());
  if (laborOperations.length > 1 || isVerboseProcedureText(opsText)) {
    noteParts.push(opsText || laborOperations.join("\n"));
  }
  if (aiNotes.trim()) noteParts.push(aiNotes.trim());

  return {
    laborDescription: laborDescription.slice(0, 300),
    jobNotes: noteParts.length ? noteParts.join("\n\n").slice(0, 1000) : null,
  };
}

function normalizeToken(token: string): string {
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const na = normalizeToken(a);
  const nb = normalizeToken(b);
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.startsWith(nb) || nb.startsWith(na))) return true;
  return false;
}

function countTokenOverlap(aTokens: string[], bTokens: string[]): number {
  let overlap = 0;
  for (const a of aTokens) {
    if (bTokens.some((b) => tokensMatch(a, b))) overlap++;
  }
  return overlap;
}

export function tokenizeJobText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !JOB_STOP_WORDS.has(t));
}

const AMEND_INTENT_RE =
  /\b(?:add|include|also\s+need|need\s+to\s+add|throw\s+in|put)\b[\s\S]{0,80}?\b(?:to|onto|on|for|in|with)\b[\s\S]{0,40}?\b(?:current|existing|this|that|the)\b[\s\S]{0,40}?\bjob\b/i;

const AMEND_JOB_PHRASE_RE =
  /\b(?:to|onto|on|for|in|with)\s+(?:the\s+|this\s+|current\s+|existing\s+)?(?:[\w-]+\s+){0,6}job\b/i;

const AMEND_CURRENT_JOB_RE =
  /\b(?:current|existing|this|that)\s+(?:[\w-]+\s+){0,6}job\b/i;

const UPDATE_JOB_RE = /\bupdate\s+(?:the\s+|this\s+|current\s+|existing\s+)?(?:[\w-]+\s+){0,6}job\b/i;

/** User wants to amend an existing estimate job, not create a duplicate. */
export function detectAmendExistingJobIntent(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    AMEND_INTENT_RE.test(t) ||
    AMEND_JOB_PHRASE_RE.test(t) ||
    AMEND_CURRENT_JOB_RE.test(t) ||
    UPDATE_JOB_RE.test(t)
  );
}

export type EstimateAiJobRef = {
  id: string;
  name: string;
  laborLineId?: string | null;
  laborDescription?: string | null;
  note?: string | null;
};

/** Score how well a free-text note matches an existing RO job title. */
export function scoreJobTitleMatch(queryText: string, jobName: string): number {
  const queryTokens = tokenizeJobText(queryText);
  const jobTokens = tokenizeJobText(jobName);
  if (queryTokens.length === 0 || jobTokens.length === 0) return 0;

  let overlap = countTokenOverlap(jobTokens, queryTokens);

  const reference = extractJobReferencePhrase(queryText);
  if (reference) {
    const refTokens = tokenizeJobText(reference);
    overlap += countTokenOverlap(jobTokens, refTokens);
  }

  const queryNorm = queryText.toLowerCase();
  const jobNorm = jobName.toLowerCase();
  if (queryNorm.includes("brake") && jobNorm.includes("brake")) overlap += 1;
  if (/\brotors?\b/i.test(queryText) && /\bbrake\b/i.test(jobName)) overlap += 1;

  return overlap;
}

function extractJobReferencePhrase(text: string): string | null {
  const patterns = [
    /\b(?:to|onto|on|for|in|with)\s+(?:the\s+|this\s+|current\s+|existing\s+)?([\w\s-]{3,40}?)\s+job\b/i,
    /\b(?:current|existing|this|that)\s+([\w\s-]{3,40}?)\s+job\b/i,
    /\bupdate\s+(?:the\s+|this\s+|current\s+|existing\s+)?([\w\s-]{3,40}?)\s+job\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

export function jobsAreSemanticallyRelated(
  existingName: string,
  proposedName: string,
  repairRequest: string,
): boolean {
  const existingTokens = tokenizeJobText(existingName);
  const proposedTokens = tokenizeJobText(`${proposedName} ${repairRequest}`);
  return countTokenOverlap(existingTokens, proposedTokens) >= 1;
}

export function findBestMatchingJob<T extends EstimateAiJobRef>(
  jobs: T[],
  sourceText: string,
  opts?: { focusJobId?: string | null; amendIntent?: boolean },
): T | null {
  if (jobs.length === 0) return null;

  if (opts?.focusJobId) {
    const focused = jobs.find((j) => j.id === opts.focusJobId);
    if (focused) return focused;
  }

  let best: T | null = null;
  let bestScore = 0;

  for (const job of jobs) {
    const score = scoreJobTitleMatch(sourceText, job.name);
    if (score > bestScore) {
      bestScore = score;
      best = job;
    }
  }

  const minScore = opts?.amendIntent ? 1 : 2;
  return bestScore >= minScore ? best : null;
}

function titleCaseWords(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Expand an existing job title when AI proposes additional scope (e.g. rotors onto brake pads). */
export function mergeExpandedJobName(existingName: string, proposedName: string): string {
  const existing = existingName.trim();
  const proposed = proposedName.trim();
  if (!existing) return proposed;
  if (!proposed) return existing;
  if (existing.toLowerCase() === proposed.toLowerCase()) return existing;

  const existingTokens = new Set(tokenizeJobText(existing));
  const newTokens = tokenizeJobText(proposed).filter((t) => !existingTokens.has(t));
  if (newTokens.length === 0) return existing;

  if (/^remove and replace /i.test(existing)) {
    const work = existing.replace(/^remove and replace /i, "").trim();
    const additions = newTokens.join(" ");
    if (additions && !work.toLowerCase().includes(additions.toLowerCase())) {
      return `Remove and Replace ${work} and ${titleCaseWords(additions)}`;
    }
    return existing;
  }

  return proposed.length > existing.length ? proposed : existing;
}

export function appendJobNotes(existingNote: string | null | undefined, addition: string | null): string | null {
  const base = existingNote?.trim() ?? "";
  const extra = addition?.trim() ?? "";
  if (!extra) return base || null;
  if (!base) return extra;
  if (base.includes(extra)) return base;
  return `${base}\n\n${extra}`.slice(0, 1000);
}
