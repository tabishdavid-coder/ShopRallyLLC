/**
 * Export static reference taxonomy labels to JSON (docs / audit only).
 * Run: npx tsx scripts/seed-reference-taxonomy-labels.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  MOTOR_LABOR_SYSTEMS,
  MOTOR_REFERENCE_BASE_VEHICLE_ID,
  MOTOR_REFERENCE_COUNTS,
} from "../src/lib/labor-motor-tree-static";

const outPath = resolve(
  process.cwd(),
  "prisma/data/reference-taxonomy-labels.json",
);

const payload = {
  generatedAt: new Date().toISOString(),
  source: "labor-motor-tree-static.ts",
  referenceBaseVehicleId: MOTOR_REFERENCE_BASE_VEHICLE_ID,
  counts: MOTOR_REFERENCE_COUNTS,
  systems: MOTOR_LABOR_SYSTEMS.map((system) => ({
    motorSystemId: system.motorSystemId,
    label: system.label,
    groups: system.groups.map((group) => ({
      motorGroupId: group.motorGroupId,
      label: group.label,
      subgroups: group.subgroups.map((sub) => ({
        motorSubGroupId: sub.motorSubGroupId,
        label: sub.label,
        nodeKey: sub.nodeKey,
        keywords: sub.keywords,
      })),
    })),
  })),
};

writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${outPath} (${MOTOR_REFERENCE_COUNTS.subgroups} subgroups)`);
