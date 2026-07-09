/**
 * One-time / repeatable cleanup of LaborOperation cache rows that belong in
 * Canned Jobs (oil/filter, engine air filter) — not the labor guide matrix.
 *
 * Keeps cabin air filter rows (still in COMMON_SHOP_JOBS).
 *
 * Run:
 *   npm run db:cleanup-labor              # delete matching rows
 *   DRY_RUN=1 npm run db:cleanup-labor    # preview only
 */
import { prisma } from "../src/db/client";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

/** Same normalization as labor-guide-cache. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function rowText(row: {
  queryKey: string;
  queryText: string;
  jobName: string;
}): string {
  return normalize([row.queryKey, row.queryText, row.jobName].join(" "));
}

/** Cabin air filter stays in the labor guide — never delete. */
function isCabinAirFilter(text: string): boolean {
  return /\bcabin\b/.test(text) && /\bair filter\b/.test(text);
}

/**
 * Rows to remove: oil/filter and engine air filter canned jobs.
 * Patterns are case-insensitive (text is normalized first).
 */
export function isExcludedCannedJobLabor(text: string): boolean {
  if (isCabinAirFilter(text)) return false;

  // Engine air filter (generic "air filter" without cabin = engine)
  if (/\bengine air filter\b/.test(text)) return true;
  if (/\bair filter\b/.test(text) && !/\bcabin\b/.test(text)) return true;

  // Oil change / oil & filter
  if (/\boil and filter\b/.test(text)) return true;
  if (/\boil filter\b/.test(text)) return true;
  if (/\boil change\b/.test(text)) return true;
  if (/\blube oil filter\b/.test(text)) return true;
  if (/\boil filter change\b/.test(text)) return true;

  return false;
}

export const EXCLUSION_PATTERNS = [
  "oil and filter",
  "oil filter",
  "oil change",
  "lube oil filter",
  "engine air filter",
  "air filter (non-cabin)",
] as const;

async function main() {
  try {
    (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
  } catch {
    /* .env optional */
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const startCount = await prisma.laborOperation.count();
  const rows = await prisma.laborOperation.findMany({
    select: { id: true, queryKey: true, queryText: true, jobName: true },
  });

  const toDelete = rows.filter((row) => isExcludedCannedJobLabor(rowText(row)));

  console.log(
    `Labor cache cleanup${DRY_RUN ? " [DRY RUN]" : ""}\n` +
      `  rows now:     ${startCount}\n` +
      `  to delete:    ${toDelete.length}\n` +
      `  patterns:     ${EXCLUSION_PATTERNS.join(", ")}`,
  );

  if (toDelete.length === 0) {
    console.log("Nothing to delete.");
    await prisma.$disconnect();
    return;
  }

  // Sample breakdown by matched queryKey prefix
  const byQueryKey = new Map<string, number>();
  for (const row of toDelete) {
    const k = row.queryKey.slice(0, 40);
    byQueryKey.set(k, (byQueryKey.get(k) ?? 0) + 1);
  }
  const topKeys = [...byQueryKey.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log("  top queryKeys:");
  for (const [k, n] of topKeys) {
    console.log(`    ${n}×  ${k}`);
  }

  if (DRY_RUN) {
    console.log(`\nWould delete ${toDelete.length} rows. Re-run without DRY_RUN=1 to apply.`);
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.laborOperation.deleteMany({
    where: { id: { in: toDelete.map((r) => r.id) } },
  });

  const endCount = await prisma.laborOperation.count();
  console.log(`\nDeleted ${result.count} rows.  ${startCount} → ${endCount}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
