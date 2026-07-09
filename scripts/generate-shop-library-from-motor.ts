/**
 * Regenerate static MOTOR-shaped shop library tree from synced taxonomy JSON.
 *
 * Usage:
 *   npx tsx scripts/generate-shop-library-from-motor.ts
 *   npx tsx scripts/generate-shop-library-from-motor.ts --baseVehicleId=22124
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildMotorTaxonomyTreeFromFlat,
  shopGroupId,
  shopSubGroupId,
  shopSystemId,
  subgroupKeywords,
  type MotorTaxonomyFlatNode,
} from "../src/lib/labor-motor-tree";

type Snapshot = {
  baseVehicleId: number;
  counts: { systems: number; groups: number; subgroups: number };
  nodes: MotorTaxonomyFlatNode[];
};

function parseArgs(argv: string[]) {
  let baseVehicleId = 22124;
  for (const arg of argv) {
    if (arg.startsWith("--baseVehicleId=")) {
      baseVehicleId = Number(arg.slice("--baseVehicleId=".length));
    }
  }
  return { baseVehicleId };
}

async function main() {
  const { baseVehicleId } = parseArgs(process.argv.slice(2));
  const jsonPath = path.join(
    process.cwd(),
    "prisma",
    "data",
    `motor-taxonomy-${baseVehicleId}.json`,
  );

  const raw = await readFile(jsonPath, "utf8");
  const snapshot = JSON.parse(raw) as Snapshot;
  const tree = buildMotorTaxonomyTreeFromFlat(snapshot.nodes);

  const systems = tree.map((system) => ({
    id: shopSystemId(system.motorSystemId),
    label: system.name,
    motorSystemId: system.motorSystemId,
    groups: system.children.map((group) => ({
      id: shopGroupId(group.motorGroupId!),
      label: group.name,
      motorSystemId: group.motorSystemId,
      motorGroupId: group.motorGroupId!,
      subgroups: group.children.map((sub) => ({
        id: shopSubGroupId(sub.motorSubGroupId!),
        label: sub.name,
        motorSystemId: sub.motorSystemId,
        motorGroupId: sub.motorGroupId!,
        motorSubGroupId: sub.motorSubGroupId!,
        nodeKey: `${baseVehicleId}|s|${sub.motorSystemId}|g|${sub.motorGroupId}|sg|${sub.motorSubGroupId}`,
        keywords: subgroupKeywords(sub.name),
      })),
    })),
  }));

  const flatSubcategories = systems.flatMap((sys) =>
    sys.groups.flatMap((grp) =>
      grp.subgroups.map((sub) => ({
        id: sub.id,
        label: `${grp.label} › ${sub.label}`,
        groupLabel: grp.label,
        motorSystemId: sub.motorSystemId,
        motorGroupId: sub.motorGroupId,
        motorSubGroupId: sub.motorSubGroupId,
        nodeKey: sub.nodeKey,
        keywords: sub.keywords,
      })),
    ),
  );

  const legacyMap: Record<string, string> = {
    "brakes-pads": shopSubGroupId(44),
    "brakes-rotors": shopSubGroupId(45),
    "brakes-calipers": shopSubGroupId(41),
    "suspension-struts": shopSubGroupId(81),
    "hvac-compressor": shopSubGroupId(51),
  };

  const outPath = path.join(process.cwd(), "src", "lib", "labor-motor-tree-static.ts");
  const content = `/** AUTO-GENERATED from prisma/data/motor-taxonomy-${baseVehicleId}.json — do not edit by hand. */
/* eslint-disable @typescript-eslint/no-loss-of-precision */

export const MOTOR_REFERENCE_BASE_VEHICLE_ID = ${baseVehicleId} as const;

export type MotorLaborSubGroup = {
  id: string;
  label: string;
  motorSystemId: number;
  motorGroupId: number;
  motorSubGroupId: number;
  nodeKey: string;
  keywords: string[];
};

export type MotorLaborGroup = {
  id: string;
  label: string;
  motorSystemId: number;
  motorGroupId: number;
  subgroups: MotorLaborSubGroup[];
};

export type MotorLaborSystem = {
  id: string;
  label: string;
  motorSystemId: number;
  groups: MotorLaborGroup[];
};

/** 3-level MOTOR taxonomy reference (System → Group → SubGroup). */
export const MOTOR_LABOR_SYSTEMS: MotorLaborSystem[] = ${JSON.stringify(systems, null, 2)} as MotorLaborSystem[];

/** Flat subcategories for 2-level backward compat (label = Group › SubGroup). */
export const MOTOR_FLAT_SUBCATEGORIES = ${JSON.stringify(flatSubcategories, null, 2)} as Array<{
  id: string;
  label: string;
  groupLabel: string;
  motorSystemId: number;
  motorGroupId: number;
  motorSubGroupId: number;
  nodeKey: string;
  keywords: string[];
}>;

/** Legacy shop-library subcategoryId → MOTOR SubGroup shop id. */
export const LEGACY_SUBCATEGORY_TO_MOTOR: Record<string, string> = ${JSON.stringify(legacyMap, null, 2)};

export const MOTOR_REFERENCE_COUNTS = {
  systems: ${snapshot.counts.systems},
  groups: ${snapshot.counts.groups},
  subgroups: ${snapshot.counts.subgroups},
} as const;
`;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, content, "utf8");

  console.log(`Wrote ${outPath}`);
  console.log(
    `Counts — systems: ${snapshot.counts.systems}, groups: ${snapshot.counts.groups}, subgroups: ${snapshot.counts.subgroups}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
