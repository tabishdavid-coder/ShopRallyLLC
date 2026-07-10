import type { LaborGridRow } from "@/lib/labor-book-v4-helpers";
import type { LaborGuideHit, LaborVariant } from "@/lib/labor-guide-types";
import { MOTOR_CHIP_SUBGROUP_IDS } from "@/lib/labor-categories";
import type { MotorLaborSystem } from "@/lib/labor-motor-tree-static";

/** Client-safe MOTOR application row (from server action). */
export type LaborBookMotorApplicationDto = {
  motorApplicationId: number;
  literalName: string;
  displayName?: string;
  operationType?: string;
  estimatedHours: number;
  positionQualifier?: string;
  motorSystemId: number;
  motorGroupId: number;
  motorSubGroupId: number;
  nodeKey?: string;
};

/** Sidebar tree node for MOTOR catalog browse (System → Group → SubGroup). */
export type LaborBookMotorSidebarNode = {
  id: string;
  nodeKey: string;
  level: "system" | "group" | "subgroup";
  name: string;
  motorSystemId: number;
  motorGroupId?: number;
  motorSubGroupId?: number;
  children: LaborBookMotorSidebarNode[];
};

/** Legacy shop-library chip / subcategory → MOTOR SubGroupID (Civic 22124 reference). */
export { MOTOR_CHIP_SUBGROUP_IDS };

export type MotorSubGroupSelection = {
  nodeKey: string;
  motorSystemId: number;
  motorGroupId: number;
  motorSubGroupId: number;
  /** Breadcrumb after vehicle: System › Group › SubGroup */
  path: string[];
};

type MotorTreeInput = {
  motorSystemId: number;
  motorGroupId?: number;
  motorSubGroupId?: number;
  level: "system" | "group" | "subgroup";
  name: string;
  children: MotorTreeInput[];
};

/** Map static MOTOR_LABOR_SYSTEMS → Labor Book sidebar accordion. */
export function mapMotorLaborSystemsToSidebar(systems: MotorLaborSystem[]): LaborBookMotorSidebarNode[] {
  return systems.map((system) => ({
    id: `motor|s|${system.motorSystemId}`,
    nodeKey: `motor|s|${system.motorSystemId}`,
    level: "system" as const,
    name: system.label,
    motorSystemId: system.motorSystemId,
    children: system.groups.map((group) => ({
      id: `motor|s|${system.motorSystemId}|g|${group.motorGroupId}`,
      nodeKey: `motor|s|${system.motorSystemId}|g|${group.motorGroupId}`,
      level: "group" as const,
      name: group.label,
      motorSystemId: system.motorSystemId,
      motorGroupId: group.motorGroupId,
      children: group.subgroups.map((sub) => ({
        id: `motor|s|${sub.motorSystemId}|g|${sub.motorGroupId}|sg|${sub.motorSubGroupId}`,
        nodeKey: `motor|s|${sub.motorSystemId}|g|${sub.motorGroupId}|sg|${sub.motorSubGroupId}`,
        level: "subgroup" as const,
        name: sub.label,
        motorSystemId: sub.motorSystemId,
        motorGroupId: sub.motorGroupId,
        motorSubGroupId: sub.motorSubGroupId,
        children: [],
      })),
    })),
  }));
}

/** Map persisted MOTOR taxonomy tree → Labor Book sidebar accordion. */
export function mapMotorTreeToSidebar(tree: MotorTreeInput[]): LaborBookMotorSidebarNode[] {
  function mapNode(node: MotorTreeInput): LaborBookMotorSidebarNode {
    const nodeKey =
      node.level === "system"
        ? `motor|s|${node.motorSystemId}`
        : node.level === "group"
          ? `motor|s|${node.motorSystemId}|g|${node.motorGroupId}`
          : `motor|s|${node.motorSystemId}|g|${node.motorGroupId}|sg|${node.motorSubGroupId}`;

    return {
      id: nodeKey,
      nodeKey,
      level: node.level,
      name: node.name,
      motorSystemId: node.motorSystemId,
      motorGroupId: node.motorGroupId,
      motorSubGroupId: node.motorSubGroupId,
      children: node.children.map((child) => mapNode(child)),
    };
  }

  return tree.map((node) => mapNode(node));
}

/** Find a SubGroup node by MOTOR SubGroupID (first match in tree). */
export function findMotorSubGroupInTree(
  tree: LaborBookMotorSidebarNode[],
  motorSubGroupId: number,
): MotorSubGroupSelection | null {
  for (const system of tree) {
    for (const group of system.children) {
      for (const sub of group.children) {
        if (sub.motorSubGroupId === motorSubGroupId) {
          return {
            nodeKey: sub.nodeKey,
            motorSystemId: sub.motorSystemId,
            motorGroupId: group.motorGroupId!,
            motorSubGroupId: sub.motorSubGroupId!,
            path: [system.name, group.name, sub.name],
          };
        }
      }
    }
  }
  return null;
}

/** Resolve breadcrumb path for a selected SubGroup nodeKey. */
export function motorBreadcrumbForNodeKey(
  tree: LaborBookMotorSidebarNode[],
  nodeKey: string,
): string[] {
  for (const system of tree) {
    for (const group of system.children) {
      for (const sub of group.children) {
        if (sub.nodeKey === nodeKey) {
          return [system.name, group.name, sub.name];
        }
      }
    }
  }
  return [];
}

function motorApplicationToHit(row: LaborBookMotorApplicationDto): LaborGuideHit {
  return {
    id: `motor:${row.motorApplicationId}`,
    jobName: row.literalName,
    queryText: row.displayName,
    totalHours: row.estimatedHours,
    laborOperations: row.operationType ? [row.operationType] : [row.literalName],
    notes: row.operationType ? `Operation: ${row.operationType}` : undefined,
    source: "catalog",
    // Licensed MOTOR Estimated Work Time → BOOK tier (see laborTierFromDataSource).
    // Carried through variantToCartLine so cart/job lines keep the BOOK badge.
    dataSource: "motor_ewt",
    categoryPath: undefined,
  };
}

function motorApplicationToVariant(row: LaborBookMotorApplicationDto): LaborVariant {
  const pos = row.positionQualifier?.trim();
  return {
    id: `motor:${row.motorApplicationId}:v`,
    label: pos ? `${row.literalName} — ${pos}` : row.literalName,
    position: pos,
    hours: row.estimatedHours,
    quantityDefault: 1,
  };
}

/** Map MOTOR application rows → grid rows (dedupe by applicationId, no brake variant expansion). */
export function motorApplicationsToGridRows(
  rows: LaborBookMotorApplicationDto[],
): LaborGridRow[] {
  const seen = new Set<number>();
  const out: LaborGridRow[] = [];

  for (const row of rows) {
    if (seen.has(row.motorApplicationId)) continue;
    seen.add(row.motorApplicationId);

    const hit = motorApplicationToHit(row);
    const variant = motorApplicationToVariant(row);

    out.push({
      id: variant.id,
      hit,
      variant,
      name: row.literalName,
      position: row.positionQualifier ?? null,
      hours: row.estimatedHours,
      system: null,
      includes: row.operationType ? `Operation: ${row.operationType}` : undefined,
      source: "catalog",
      sourceLabel: "BOOK",
    });
  }

  return out.sort((a, b) => {
    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) return nameCmp;
    return (a.position ?? "").localeCompare(b.position ?? "");
  });
}

/** Highlight MOTOR tree nodes matching a search query. */
export function motorTreeSearchHighlight(
  tree: LaborBookMotorSidebarNode[],
  query: string,
): Set<string> {
  const matchIds = new Set<string>();
  const q = query.trim().toLowerCase();
  if (!q) return matchIds;

  for (const system of tree) {
    let systemMatch = system.name.toLowerCase().includes(q);
    for (const group of system.children) {
      let groupMatch = group.name.toLowerCase().includes(q);
      for (const sub of group.children) {
        if (sub.name.toLowerCase().includes(q)) {
          matchIds.add(sub.id);
          matchIds.add(group.id);
          matchIds.add(system.id);
          groupMatch = true;
          systemMatch = true;
        }
      }
      if (groupMatch) {
        matchIds.add(group.id);
        matchIds.add(system.id);
      }
    }
    if (systemMatch) matchIds.add(system.id);
  }

  return matchIds;
}

/** Resolve system/group node keys + selection for a MOTOR SubGroupID. */
export function motorKeysForSubGroup(
  tree: LaborBookMotorSidebarNode[],
  motorSubGroupId: number,
): { systemKey: string; groupKey: string; selection: MotorSubGroupSelection } | null {
  for (const system of tree) {
    for (const group of system.children) {
      for (const sub of group.children) {
        if (sub.motorSubGroupId === motorSubGroupId) {
          return {
            systemKey: system.nodeKey,
            groupKey: group.nodeKey,
            selection: {
              nodeKey: sub.nodeKey,
              motorSystemId: sub.motorSystemId,
              motorGroupId: group.motorGroupId!,
              motorSubGroupId: sub.motorSubGroupId!,
              path: [system.name, group.name, sub.name],
            },
          };
        }
      }
    }
  }
  return null;
}

/** Resolve chip label/query to a MOTOR SubGroup selection when possible. */
export function motorSelectionForChip(
  tree: LaborBookMotorSidebarNode[],
  chip: { label: string; query: string; browsePath?: { subcategoryId?: string } },
): MotorSubGroupSelection | null {
  const labelKey = chip.label.toLowerCase().replace(/\s+/g, "-");
  const subId =
    MOTOR_CHIP_SUBGROUP_IDS[labelKey] ??
    (chip.browsePath?.subcategoryId
      ? MOTOR_CHIP_SUBGROUP_IDS[chip.browsePath.subcategoryId]
      : undefined);

  if (subId != null) {
    const found = findMotorSubGroupInTree(tree, subId);
    if (found) return found;
  }

  const q = chip.query.toLowerCase();
  for (const system of tree) {
    for (const group of system.children) {
      for (const sub of group.children) {
        const text = `${system.name} ${group.name} ${sub.name}`.toLowerCase();
        if (text.includes(q) || q.split(/\s+/).every((w) => text.includes(w))) {
          return {
            nodeKey: sub.nodeKey,
            motorSystemId: sub.motorSystemId,
            motorGroupId: group.motorGroupId!,
            motorSubGroupId: sub.motorSubGroupId!,
            path: [system.name, group.name, sub.name],
          };
        }
      }
    }
  }

  return null;
}
