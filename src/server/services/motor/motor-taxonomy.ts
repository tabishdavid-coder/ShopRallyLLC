import "server-only";

import { prisma } from "@/db/client";
import { motorGet } from "@/server/services/motor/motor-client";
import { resolveMotorBaseVehicleId } from "@/server/services/motor/motor-vehicle";
import type { Vehicle } from "@/server/services/labor-guide";

import {
  buildMotorTaxonomyTreeFromFlat,
  type MotorTaxonomyFlatNode,
  type MotorTaxonomyLevel,
  type MotorTaxonomyTreeNode,
} from "@/lib/labor-motor-tree";

export type MotorTaxonomyFetchResult = {
  baseVehicleId: number;
  nodes: MotorTaxonomyFlatNode[];
  counts: { systems: number; groups: number; subgroups: number };
};

type MotorDrillDownSubGroup = {
  SubGroupID?: number;
  Name?: string;
};

type MotorDrillDownGroup = {
  GroupID?: number;
  Name?: string;
  SubGroups?: MotorDrillDownSubGroup[];
};

type MotorDrillDownSystem = {
  SystemID?: number;
  Name?: string;
  Groups?: MotorDrillDownGroup[];
};

const DEFAULT_SANDBOX_BASE_VEHICLE_ID = 22124;
const DEFAULT_SANDBOX_VIN = "19XFA1F51AE028415";

function unwrapDrillDownSystems(payload: unknown): MotorDrillDownSystem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const body = (root.Body ?? root.body ?? root) as Record<string, unknown>;
  const systems = body.Systems ?? body.systems;
  if (Array.isArray(systems)) return systems as MotorDrillDownSystem[];
  if (systems && typeof systems === "object") return [systems as MotorDrillDownSystem];
  return [];
}

export function motorTaxonomyNodeKey(
  baseVehicleId: number,
  level: MotorTaxonomyLevel,
  ids: { motorSystemId: number; motorGroupId?: number; motorSubGroupId?: number },
): string {
  const parts = [String(baseVehicleId), "s", String(ids.motorSystemId)];
  if (level === "system") return parts.join("|");
  parts.push("g", String(ids.motorGroupId));
  if (level === "group") return parts.join("|");
  parts.push("sg", String(ids.motorSubGroupId));
  return parts.join("|");
}

async function fetchDrillDown(
  baseVehicleId: number,
  filters: { systemId?: number; groupId?: number; subGroupId?: number } = {},
): Promise<MotorDrillDownSystem[]> {
  const res = await motorGet(
    `/Information/Vehicles/Attributes/BaseVehicleID/${baseVehicleId}/Content/Taxonomies/Of/EstimatedWorkTimes`,
    {
      ResultType: "DrillDown",
      AttributeStandard: "MOTOR",
      SystemID: filters.systemId,
      GroupID: filters.groupId,
      SubGroupID: filters.subGroupId,
    },
  );
  if (!res.ok) {
    throw new Error(`MOTOR DrillDown failed (${res.status}): ${res.error}`);
  }
  return unwrapDrillDownSystems(res.data);
}

/** Fetch full MOTOR EWT taxonomy tree for a BaseVehicleID via DrillDown. */
export async function fetchMotorTaxonomy(baseVehicleId: number): Promise<MotorTaxonomyFetchResult> {
  const nodes: MotorTaxonomyFlatNode[] = [];
  const topSystems = await fetchDrillDown(baseVehicleId);

  for (const system of topSystems) {
    const motorSystemId = system.SystemID;
    const systemName = system.Name?.trim();
    if (!motorSystemId || !systemName) continue;

    const systemKey = motorTaxonomyNodeKey(baseVehicleId, "system", { motorSystemId });
    nodes.push({
      nodeKey: systemKey,
      level: "system",
      motorSystemId,
      name: systemName,
    });

    const systemDetail = await fetchDrillDown(baseVehicleId, { systemId: motorSystemId });
    const groups = systemDetail[0]?.Groups ?? system.Groups ?? [];

    for (const group of groups) {
      const motorGroupId = group.GroupID;
      const groupName = group.Name?.trim();
      if (!motorGroupId || !groupName) continue;

      const groupKey = motorTaxonomyNodeKey(baseVehicleId, "group", {
        motorSystemId,
        motorGroupId,
      });
      nodes.push({
        nodeKey: groupKey,
        level: "group",
        motorSystemId,
        motorGroupId,
        name: groupName,
        parentNodeKey: systemKey,
      });

      const groupDetail = await fetchDrillDown(baseVehicleId, {
        systemId: motorSystemId,
        groupId: motorGroupId,
      });
      const subGroups = groupDetail[0]?.Groups?.[0]?.SubGroups ?? group.SubGroups ?? [];

      for (const subGroup of subGroups) {
        const motorSubGroupId = subGroup.SubGroupID;
        const subGroupName = subGroup.Name?.trim();
        if (!motorSubGroupId || !subGroupName) continue;

        nodes.push({
          nodeKey: motorTaxonomyNodeKey(baseVehicleId, "subgroup", {
            motorSystemId,
            motorGroupId,
            motorSubGroupId,
          }),
          level: "subgroup",
          motorSystemId,
          motorGroupId,
          motorSubGroupId,
          name: subGroupName,
          parentNodeKey: groupKey,
        });
      }
    }
  }

  return {
    baseVehicleId,
    nodes,
    counts: {
      systems: nodes.filter((n) => n.level === "system").length,
      groups: nodes.filter((n) => n.level === "group").length,
      subgroups: nodes.filter((n) => n.level === "subgroup").length,
    },
  };
}

/** Upsert synced taxonomy nodes for one BaseVehicleID (idempotent). */
export async function persistMotorTaxonomyNodes(
  baseVehicleId: number,
  nodes: MotorTaxonomyFlatNode[],
): Promise<{ upserted: number; deleted: number }> {
  const syncedAt = new Date();
  let upserted = 0;

  for (const node of nodes) {
    await prisma.motorCatalogNode.upsert({
      where: {
        baseVehicleId_nodeKey: {
          baseVehicleId,
          nodeKey: node.nodeKey,
        },
      },
      create: {
        baseVehicleId,
        nodeKey: node.nodeKey,
        level: node.level,
        motorSystemId: node.motorSystemId,
        motorGroupId: node.motorGroupId ?? null,
        motorSubGroupId: node.motorSubGroupId ?? null,
        name: node.name,
        parentNodeKey: node.parentNodeKey ?? null,
        syncedAt,
      },
      update: {
        level: node.level,
        motorSystemId: node.motorSystemId,
        motorGroupId: node.motorGroupId ?? null,
        motorSubGroupId: node.motorSubGroupId ?? null,
        name: node.name,
        parentNodeKey: node.parentNodeKey ?? null,
        syncedAt,
      },
    });
    upserted += 1;
  }

  const keepKeys = nodes.map((n) => n.nodeKey);
  const deleted = await prisma.motorCatalogNode.deleteMany({
    where: {
      baseVehicleId,
      nodeKey: { notIn: keepKeys },
    },
  });

  return { upserted, deleted: deleted.count };
}

export type SyncMotorTaxonomyInput = {
  vin?: string | null;
  baseVehicleId?: number | null;
  vehicle?: Partial<Vehicle> | null;
  persist?: boolean;
};

export type SyncMotorTaxonomyResult = MotorTaxonomyFetchResult & {
  resolvedFromVin: boolean;
  persisted?: { upserted: number; deleted: number };
};

/** Resolve vehicle, fetch DrillDown taxonomy, optionally persist to DB. */
export async function syncMotorTaxonomyForVehicle(
  input: SyncMotorTaxonomyInput = {},
): Promise<SyncMotorTaxonomyResult> {
  let baseVehicleId = input.baseVehicleId ?? null;
  let resolvedFromVin = false;

  if (!baseVehicleId) {
    const vehicle: Vehicle = {
      year: input.vehicle?.year ?? 2010,
      make: input.vehicle?.make ?? "Honda",
      model: input.vehicle?.model ?? "Civic",
      trim: input.vehicle?.trim ?? null,
      engine: input.vehicle?.engine ?? null,
      vin: input.vin ?? input.vehicle?.vin ?? DEFAULT_SANDBOX_VIN,
    };
    baseVehicleId = await resolveMotorBaseVehicleId(vehicle);
    resolvedFromVin = Boolean(vehicle.vin);
  }

  if (!baseVehicleId) {
    baseVehicleId = DEFAULT_SANDBOX_BASE_VEHICLE_ID;
  }

  const fetched = await fetchMotorTaxonomy(baseVehicleId);
  const result: SyncMotorTaxonomyResult = { ...fetched, resolvedFromVin };

  if (input.persist !== false) {
    result.persisted = await persistMotorTaxonomyNodes(baseVehicleId, fetched.nodes);
  }

  return result;
}

/** Build nested tree from flat DrillDown nodes (in-memory / JSON snapshots). */
export { buildMotorTaxonomyTreeFromFlat };
export type { MotorTaxonomyFlatNode, MotorTaxonomyLevel, MotorTaxonomyTreeNode };

/** Read persisted MOTOR catalog tree for Labor Book UI (future). */
export async function getMotorCatalogTree(baseVehicleId: number): Promise<MotorTaxonomyTreeNode[]> {
  const rows = await prisma.motorCatalogNode.findMany({
    where: { baseVehicleId },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });

  const nodes: MotorTaxonomyFlatNode[] = rows.map((row) => ({
    nodeKey: row.nodeKey,
    level: row.level as MotorTaxonomyLevel,
    motorSystemId: row.motorSystemId,
    motorGroupId: row.motorGroupId ?? undefined,
    motorSubGroupId: row.motorSubGroupId ?? undefined,
    name: row.name,
    parentNodeKey: row.parentNodeKey ?? undefined,
  }));

  return buildMotorTaxonomyTreeFromFlat(nodes);
}

export function findMotorTaxonomyBranch(
  tree: MotorTaxonomyTreeNode[],
  systemName: string,
): MotorTaxonomyTreeNode | null {
  return (
    tree.find((node) => node.level === "system" && node.name.toLowerCase() === systemName.toLowerCase()) ??
    null
  );
}

export function formatMotorTaxonomyBranch(node: MotorTaxonomyTreeNode, indent = 0): string[] {
  const prefix = "  ".repeat(indent);
  const idPart =
    node.level === "system"
      ? `SystemID=${node.motorSystemId}`
      : node.level === "group"
        ? `GroupID=${node.motorGroupId}`
        : `SubGroupID=${node.motorSubGroupId}`;
  const lines = [`${prefix}${node.name} (${idPart})`];
  for (const child of node.children) {
    lines.push(...formatMotorTaxonomyBranch(child, indent + 1));
  }
  return lines;
}
