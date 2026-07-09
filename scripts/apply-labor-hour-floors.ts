/**
 * Apply ShopRally hour floors to existing AI LaborOperation rows (no AI call).
 *
 *   DRY_RUN=1 npx tsx --tsconfig ./tsconfig.scripts.json scripts/apply-labor-hour-floors.ts
 *   npx tsx --tsconfig ./tsconfig.scripts.json scripts/apply-labor-hour-floors.ts --pattern=bearing
 *   npm run db:apply-labor-floors -- --pattern=bearing
 */
import { prisma } from "../src/db/client";
import {
  applyLaborHoursFloor,
  shouldCalibrateLaborDataSource,
} from "../src/lib/labor-hours-calibration";
import { LABOR_GUIDE_PROMPT_VERSION } from "../src/lib/labor-guide-prompt";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const BATCH_SIZE = Number(process.env.LABOR_FLOORS_BATCH_SIZE) || 500;

function parsePattern(argv: string[]): string | null {
  for (const arg of argv) {
    if (arg.startsWith("--pattern=")) return arg.slice("--pattern=".length).trim() || null;
  }
  return null;
}

function patternWhere(pattern: string | null) {
  if (!pattern) return {};
  return {
    OR: [
      { jobName: { contains: pattern, mode: "insensitive" as const } },
      { queryText: { contains: pattern, mode: "insensitive" as const } },
      { queryKey: { contains: pattern, mode: "insensitive" as const } },
    ],
  };
}

async function main() {
  try {
    (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
  } catch {
    /* optional */
  }

  const pattern = parsePattern(process.argv.slice(2));
  console.log(
    `apply-labor-hour-floors pattern=${pattern ?? "all-ai"} dryRun=${DRY_RUN} prompt=${LABOR_GUIDE_PROMPT_VERSION}`,
  );

  let cursor: string | undefined;
  let raised = 0;
  let skipped = 0;
  let scanned = 0;

  while (true) {
    const rows = await prisma.laborOperation.findMany({
      where: {
        AND: [
          patternWhere(pattern),
          { OR: [{ dataSource: null }, { dataSource: { startsWith: "ai" } }] },
        ],
      },
      select: {
        id: true,
        jobName: true,
        queryText: true,
        unitLabel: true,
        unitsOnVehicle: true,
        laborHoursPerUnit: true,
        laborOperations: true,
        notes: true,
        dataSource: true,
        motorApplicationId: true,
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (!rows.length) break;
    scanned += rows.length;
    cursor = rows[rows.length - 1]!.id;

    for (const row of rows) {
      if (row.motorApplicationId != null || !shouldCalibrateLaborDataSource(row.dataSource)) {
        skipped++;
        continue;
      }
      const result = applyLaborHoursFloor({
        jobName: row.jobName,
        queryText: row.queryText,
        unitLabel: row.unitLabel,
        unitsOnVehicle: row.unitsOnVehicle,
        laborHoursPerUnit: row.laborHoursPerUnit,
        laborOperations: row.laborOperations,
        notes: row.notes ?? "",
      });
      if (!result.applied || result.raisedFrom == null) {
        skipped++;
        continue;
      }
      raised++;
      console.log(
        `${result.raisedFrom.toFixed(2)} -> ${result.suggestion.laborHoursPerUnit.toFixed(2)}  ${row.jobName}  [${result.applied.id}]`,
      );
      if (!DRY_RUN) {
        await prisma.laborOperation.update({
          where: { id: row.id },
          data: {
            laborHoursPerUnit: result.suggestion.laborHoursPerUnit,
            notes: result.suggestion.notes || null,
            promptVersion: LABOR_GUIDE_PROMPT_VERSION,
          },
        });
      }
    }
  }

  console.log(`done scanned=${scanned} raised=${raised} skipped=${skipped} dryRun=${DRY_RUN}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
