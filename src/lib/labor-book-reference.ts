import { hitsToGridRows, type LaborGridRow } from "@/lib/labor-book-v4-helpers";
import { dataSourceBadgeLabel } from "@/lib/labor-guide-helpers";
import type { LaborGuideHit } from "@/lib/labor-guide-types";
import {
  MOTOR_LABOR_SYSTEMS,
  MOTOR_REFERENCE_BASE_VEHICLE_ID,
} from "@/lib/labor-motor-tree-static";

export { MOTOR_REFERENCE_BASE_VEHICLE_ID };

export type StaticMotorSubGroupPath = {
  motorSystemId: number;
  motorGroupId: number;
  motorSubGroupId: number;
  systemLabel: string;
  groupLabel: string;
  subGroupLabel: string;
  categoryPath: string;
};

/** Resolve a SubGroupID against the static reference tree (no DB). */
export function findStaticMotorSubGroup(
  motorSubGroupId: number,
): StaticMotorSubGroupPath | null {
  for (const system of MOTOR_LABOR_SYSTEMS) {
    for (const group of system.groups) {
      for (const sub of group.subgroups) {
        if (sub.motorSubGroupId === motorSubGroupId) {
          return {
            motorSystemId: sub.motorSystemId,
            motorGroupId: sub.motorGroupId,
            motorSubGroupId: sub.motorSubGroupId,
            systemLabel: system.label,
            groupLabel: group.label,
            subGroupLabel: sub.label,
            categoryPath: `${system.label} › ${group.label} › ${sub.label}`,
          };
        }
      }
    }
  }
  return null;
}

/** Structured taxonomy block for AI prompts (reference mode — names + IDs only). */
export function buildReferenceTaxonomyPromptBlock(
  motorSubGroupId: number,
): string | null {
  const found = findStaticMotorSubGroup(motorSubGroupId);
  if (!found) return null;
  return [
    "Industry taxonomy context (reference structure — not licensed catalog hours):",
    `  System: ${found.systemLabel} (SystemID=${found.motorSystemId})`,
    `  Group: ${found.groupLabel} (GroupID=${found.motorGroupId})`,
    `  SubGroup: ${found.subGroupLabel} (SubGroupID=${found.motorSubGroupId})`,
  ].join("\n");
}

type LaborOperationRow = {
  id: string;
  jobName: string;
  laborHoursPerUnit: number;
  unitsOnVehicle: number;
  unitLabel: string;
  laborOperations: string[];
  notes: string | null;
  dataSource: string | null;
  queryText: string;
};

/** Map cached LaborOperation rows → Labor Book grid (reference mode jobs column). */
export function laborOperationsToReferenceGridRows(
  rows: LaborOperationRow[],
  categoryPath?: string,
): LaborGridRow[] {
  const hits: LaborGuideHit[] = rows.map((row) => {
    const hours =
      row.unitLabel.toLowerCase() === "vehicle"
        ? row.laborHoursPerUnit
        : row.laborHoursPerUnit * row.unitsOnVehicle;

    return {
      id: `cache:${row.id}`,
      jobName: row.jobName,
      queryText: row.queryText,
      totalHours: hours,
      laborHoursPerUnit: row.laborHoursPerUnit,
      unitLabel: row.unitLabel,
      unitsOnVehicle: row.unitsOnVehicle,
      laborOperations: row.laborOperations,
      notes: row.notes ?? undefined,
      source: "cached" as const,
      categoryPath,
      dataSource: row.dataSource ?? "ai_taxonomy_scoped",
    };
  });

  // Expand axle-scoped ops (brake pads/rotors/calipers, struts, tires) into
  // one pickable Jobs row per position — same helpers as shop-library browse.
  return hitsToGridRows(hits).map((gridRow) => {
    const ds = (gridRow.hit.dataSource ?? "").toLowerCase();
    const isMotorDs = ds === "motor_ewt" || ds.startsWith("motor");
    const dsLabel = dataSourceBadgeLabel(gridRow.hit.dataSource);
    return {
      ...gridRow,
      // Never surface a plain "MOTOR" badge from reference cache rows.
      sourceLabel: isMotorDs ? "Cached" : (dsLabel ?? gridRow.sourceLabel ?? "Cached"),
    };
  });
}
