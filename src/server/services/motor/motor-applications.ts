import "server-only";

import { prisma } from "@/db/client";
import { motorGet } from "@/server/services/motor/motor-client";
import {
  motorTaxonomyNodeKey,
  syncMotorTaxonomyForVehicle,
  type MotorTaxonomyFlatNode,
} from "@/server/services/motor/motor-taxonomy";
import { resolveMotorBaseVehicleId } from "@/server/services/motor/motor-vehicle";
import type { Vehicle } from "@/server/services/labor-guide";

const DEFAULT_SANDBOX_BASE_VEHICLE_ID = 22124;
const DEFAULT_SANDBOX_VIN = "19XFA1F51AE028415";
const ITEMS_PER_PAGE = 30;
const SUBGROUP_DELAY_MS = 200;

type MotorTaxonomy = {
  LiteralName?: string;
  SystemName?: string;
  GroupName?: string;
  SubGroupName?: string;
  OperationTypeDescription?: string;
  SystemID?: number;
  GroupID?: number;
  SubGroupID?: number;
};

type MotorWorkTimeSummary = {
  BaseLaborTime?: number;
  LaborTimeInterval?: string;
  AllLaborTime?: number;
  AdditionalLaborTime?: number;
};

type MotorApplicationSummary = {
  ApplicationID?: number;
  DisplayName?: string;
  Taxonomy?: MotorTaxonomy;
  Items?: MotorWorkTimeSummary[] | { EstimatedWorkTimeSummary?: MotorWorkTimeSummary[] };
  Position?: { Name?: string };
  Qualifiers?: { QualifierInfo?: Array<{ Description?: string }> } | Array<{ Description?: string }>;
};

export type MotorApplicationRow = {
  motorApplicationId: number;
  baseVehicleId: number;
  motorSystemId: number;
  motorGroupId: number;
  motorSubGroupId: number;
  nodeKey?: string;
  literalName: string;
  displayName?: string;
  operationType?: string;
  estimatedHours: number;
  laborTimeInterval?: string;
  allLaborHours?: number;
  additionalLaborHours?: number;
  positionQualifier?: string;
  qualifiersJson?: unknown;
  rawJson?: unknown;
};

export type FetchMotorApplicationsResult = {
  applications: MotorApplicationRow[];
  pagesFetched: number;
  rawCount: number;
};

export type SubGroupSyncDetail = {
  index: number;
  total: number;
  motorSystemId: number;
  motorGroupId: number;
  motorSubGroupId: number;
  path: string;
  appCount: number;
  error?: string;
};

export type SyncMotorApplicationsInput = {
  vin?: string | null;
  baseVehicleId?: number | null;
  vehicle?: Partial<Vehicle> | null;
  systemFilter?: string | null;
  subGroupId?: number | null;
  limit?: number | null;
  persist?: boolean;
  ensureTaxonomy?: boolean;
  delayMs?: number;
  dryRun?: boolean;
  onProgress?: (detail: SubGroupSyncDetail) => void;
};

export type SyncMotorApplicationsResult = {
  baseVehicleId: number;
  resolvedFromVin: boolean;
  taxonomySynced: boolean;
  subgroupsProcessed: number;
  subgroupsSkippedEmpty: number;
  applicationsFetched: number;
  applicationsUpserted: number;
  applicationsDeleted: number;
  sampleRows: MotorApplicationRow[];
  errors: Array<{ motorSubGroupId: number; path: string; error: string }>;
  systemCounts: Record<string, number>;
  subgroupDetails: SubGroupSyncDetail[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unwrapApplications(payload: unknown): MotorApplicationSummary[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const body = (root.Body ?? root.body ?? root) as Record<string, unknown>;
  const apps = body.Applications ?? body.applications;
  if (Array.isArray(apps)) return apps as MotorApplicationSummary[];
  if (apps && typeof apps === "object") {
    const a = apps as Record<string, unknown>;
    const items = a.Application ?? a.application ?? a.Items ?? a.items;
    if (Array.isArray(items)) return items as MotorApplicationSummary[];
    if (items && typeof items === "object") return [items as MotorApplicationSummary];
  }
  return [];
}

function unwrapWorkTimeItems(app: MotorApplicationSummary): MotorWorkTimeSummary[] {
  const raw = app.Items;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const nested = (raw as Record<string, unknown>).EstimatedWorkTimeSummary;
    if (Array.isArray(nested)) return nested as MotorWorkTimeSummary[];
    if (nested && typeof nested === "object") return [nested as MotorWorkTimeSummary];
  }
  return [];
}

function intervalToHours(value: number, interval?: string): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const unit = (interval ?? "Hours").toLowerCase();
  if (unit.startsWith("min")) return value / 60;
  return value;
}

function qualifierJson(app: MotorApplicationSummary): unknown | undefined {
  const q = app.Qualifiers;
  if (!q) return undefined;
  if (Array.isArray(q)) return q;
  if (q.QualifierInfo) return q.QualifierInfo;
  return q;
}

function jobNameFromApplication(app: MotorApplicationSummary): string {
  return (
    app.Taxonomy?.LiteralName?.trim() ||
    app.DisplayName?.trim() ||
    [app.Taxonomy?.SystemName, app.Taxonomy?.GroupName, app.Taxonomy?.SubGroupName]
      .filter(Boolean)
      .join(" — ") ||
    "Labor operation"
  );
}

function mapApplicationToRow(
  app: MotorApplicationSummary,
  baseVehicleId: number,
  taxonomy: {
    motorSystemId: number;
    motorGroupId: number;
    motorSubGroupId: number;
    nodeKey?: string;
  },
): MotorApplicationRow | null {
  const motorApplicationId = app.ApplicationID;
  if (!motorApplicationId) return null;

  const summaries = unwrapWorkTimeItems(app);
  const primary = summaries[0];
  const laborTimeInterval = primary?.LaborTimeInterval ?? "Hours";
  const estimatedHours = intervalToHours(primary?.BaseLaborTime ?? 0, laborTimeInterval);
  const allLaborHours = primary?.AllLaborTime
    ? intervalToHours(primary.AllLaborTime, laborTimeInterval)
    : undefined;
  const additionalLaborHours = primary?.AdditionalLaborTime
    ? intervalToHours(primary.AdditionalLaborTime, laborTimeInterval)
    : undefined;

  if (estimatedHours <= 0 && (allLaborHours ?? 0) <= 0) return null;

  return {
    motorApplicationId,
    baseVehicleId,
    motorSystemId: taxonomy.motorSystemId,
    motorGroupId: taxonomy.motorGroupId,
    motorSubGroupId: taxonomy.motorSubGroupId,
    nodeKey: taxonomy.nodeKey,
    literalName: jobNameFromApplication(app),
    displayName: app.DisplayName?.trim() || undefined,
    operationType: app.Taxonomy?.OperationTypeDescription?.trim() || undefined,
    estimatedHours: estimatedHours > 0 ? estimatedHours : (allLaborHours ?? 0),
    laborTimeInterval,
    allLaborHours,
    additionalLaborHours,
    positionQualifier: app.Position?.Name?.trim() || undefined,
    qualifiersJson: qualifierJson(app),
    rawJson: app,
  };
}

/** Fetch MOTOR EWT application summaries for one SubGroup (paginated). */
export async function fetchMotorApplicationsForSubGroup(
  baseVehicleId: number,
  systemId: number,
  groupId: number,
  subGroupId: number,
  nodeKey?: string,
): Promise<FetchMotorApplicationsResult> {
  const applications: MotorApplicationRow[] = [];
  let pageIndex = 0;
  let pagesFetched = 0;
  let rawCount = 0;

  while (true) {
    const res = await motorGet(
      `/Information/Vehicles/Attributes/BaseVehicleID/${baseVehicleId}/Content/Summaries/Of/EstimatedWorkTimes`,
      {
        SystemID: systemId,
        GroupID: groupId,
        SubGroupID: subGroupId,
        PageIndex: pageIndex,
        ItemsPerPage: ITEMS_PER_PAGE,
        AttributeStandard: "MOTOR",
      },
    );

    if (!res.ok) {
      if (pageIndex === 0) {
        throw new Error(
          `MOTOR EWT Summaries failed for SubGroup ${subGroupId} (${res.status}): ${res.error}`,
        );
      }
      break;
    }

    const pageApps = unwrapApplications(res.data);
    pagesFetched += 1;
    rawCount += pageApps.length;

    for (const app of pageApps) {
      const row = mapApplicationToRow(app, baseVehicleId, {
        motorSystemId: systemId,
        motorGroupId: groupId,
        motorSubGroupId: subGroupId,
        nodeKey,
      });
      if (row) applications.push(row);
    }

    if (pageApps.length < ITEMS_PER_PAGE) break;
    pageIndex += 1;
  }

  return { applications, pagesFetched, rawCount };
}

async function resolveBaseVehicleId(input: SyncMotorApplicationsInput): Promise<{
  baseVehicleId: number;
  resolvedFromVin: boolean;
}> {
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

  return { baseVehicleId, resolvedFromVin };
}

async function loadSubGroupNodes(
  baseVehicleId: number,
  filters: { systemFilter?: string | null; subGroupId?: number | null; limit?: number | null },
): Promise<MotorTaxonomyFlatNode[]> {
  const rows = await prisma.motorCatalogNode.findMany({
    where: {
      baseVehicleId,
      level: "subgroup",
      ...(filters.subGroupId ? { motorSubGroupId: filters.subGroupId } : {}),
    },
    orderBy: [{ motorSystemId: "asc" }, { motorGroupId: "asc" }, { name: "asc" }],
  });

  let nodes: MotorTaxonomyFlatNode[] = rows
    .filter((row) => row.motorGroupId != null && row.motorSubGroupId != null)
    .map((row) => ({
      nodeKey: row.nodeKey,
      level: "subgroup" as const,
      motorSystemId: row.motorSystemId,
      motorGroupId: row.motorGroupId!,
      motorSubGroupId: row.motorSubGroupId!,
      name: row.name,
      parentNodeKey: row.parentNodeKey ?? undefined,
    }));

  if (filters.systemFilter) {
    const systemName = filters.systemFilter.trim().toLowerCase();
    const systemRows = await prisma.motorCatalogNode.findMany({
      where: { baseVehicleId, level: "system" },
    });
    const matchingSystemIds = new Set(
      systemRows
        .filter((s) => s.name.toLowerCase() === systemName)
        .map((s) => s.motorSystemId),
    );
    nodes = nodes.filter((n) => matchingSystemIds.has(n.motorSystemId));
  }

  if (filters.limit && filters.limit > 0) {
    nodes = nodes.slice(0, filters.limit);
  }

  return nodes;
}

type SubgroupPathMaps = {
  subgroupPaths: Map<number, string>;
  systemNames: Map<number, string>;
};

async function buildSubgroupPathMaps(baseVehicleId: number): Promise<SubgroupPathMaps> {
  const rows = await prisma.motorCatalogNode.findMany({
    where: { baseVehicleId },
    select: {
      level: true,
      name: true,
      motorSystemId: true,
      motorGroupId: true,
      motorSubGroupId: true,
    },
  });

  const systemNames = new Map<number, string>();
  const groupNames = new Map<string, string>();
  const subgroupNames = new Map<string, string>();

  for (const row of rows) {
    if (row.level === "system") {
      systemNames.set(row.motorSystemId, row.name);
    } else if (row.level === "group" && row.motorGroupId != null) {
      groupNames.set(`${row.motorSystemId}|${row.motorGroupId}`, row.name);
    } else if (row.level === "subgroup" && row.motorGroupId != null && row.motorSubGroupId != null) {
      subgroupNames.set(
        `${row.motorSystemId}|${row.motorGroupId}|${row.motorSubGroupId}`,
        row.name,
      );
    }
  }

  const subgroupPaths = new Map<number, string>();
  for (const row of rows) {
    if (
      row.level !== "subgroup" ||
      row.motorGroupId == null ||
      row.motorSubGroupId == null
    ) {
      continue;
    }
    const system = systemNames.get(row.motorSystemId) ?? `System ${row.motorSystemId}`;
    const group =
      groupNames.get(`${row.motorSystemId}|${row.motorGroupId}`) ??
      `Group ${row.motorGroupId}`;
    const sub =
      subgroupNames.get(
        `${row.motorSystemId}|${row.motorGroupId}|${row.motorSubGroupId}`,
      ) ?? `SubGroup ${row.motorSubGroupId}`;
    subgroupPaths.set(row.motorSubGroupId, `${system} > ${group} > ${sub}`);
  }

  return { subgroupPaths, systemNames };
}

function subgroupPath(
  maps: SubgroupPathMaps,
  node: MotorTaxonomyFlatNode,
): string {
  if (node.motorSubGroupId != null) {
    const cached = maps.subgroupPaths.get(node.motorSubGroupId);
    if (cached) return cached;
  }
  const system = maps.systemNames.get(node.motorSystemId) ?? `System ${node.motorSystemId}`;
  return `${system} > ${node.name}`;
}

export async function persistMotorApplications(
  baseVehicleId: number,
  rows: MotorApplicationRow[],
  scope?: { motorSubGroupId?: number },
): Promise<{ upserted: number; deleted: number }> {
  const syncedAt = new Date();
  let upserted = 0;

  for (const row of rows) {
    await prisma.motorCatalogApplication.upsert({
      where: {
        baseVehicleId_motorApplicationId: {
          baseVehicleId,
          motorApplicationId: row.motorApplicationId,
        },
      },
      create: {
        baseVehicleId,
        motorSystemId: row.motorSystemId,
        motorGroupId: row.motorGroupId,
        motorSubGroupId: row.motorSubGroupId,
        motorApplicationId: row.motorApplicationId,
        nodeKey: row.nodeKey ?? null,
        literalName: row.literalName,
        displayName: row.displayName ?? null,
        operationType: row.operationType ?? null,
        estimatedHours: row.estimatedHours,
        laborTimeInterval: row.laborTimeInterval ?? "Hours",
        allLaborHours: row.allLaborHours ?? null,
        additionalLaborHours: row.additionalLaborHours ?? null,
        positionQualifier: row.positionQualifier ?? null,
        qualifiersJson: row.qualifiersJson ?? undefined,
        rawJson: row.rawJson ?? undefined,
        syncedAt,
      },
      update: {
        motorSystemId: row.motorSystemId,
        motorGroupId: row.motorGroupId,
        motorSubGroupId: row.motorSubGroupId,
        nodeKey: row.nodeKey ?? null,
        literalName: row.literalName,
        displayName: row.displayName ?? null,
        operationType: row.operationType ?? null,
        estimatedHours: row.estimatedHours,
        laborTimeInterval: row.laborTimeInterval ?? "Hours",
        allLaborHours: row.allLaborHours ?? null,
        additionalLaborHours: row.additionalLaborHours ?? null,
        positionQualifier: row.positionQualifier ?? null,
        qualifiersJson: row.qualifiersJson ?? undefined,
        rawJson: row.rawJson ?? undefined,
        syncedAt,
      },
    });
    upserted += 1;
  }

  const keepIds = rows.map((r) => r.motorApplicationId);
  const deleted = await prisma.motorCatalogApplication.deleteMany({
    where: {
      baseVehicleId,
      ...(scope?.motorSubGroupId ? { motorSubGroupId: scope.motorSubGroupId } : {}),
      motorApplicationId: { notIn: keepIds.length ? keepIds : [-1] },
    },
  });

  return { upserted, deleted: deleted.count };
}

/** Sync MOTOR EWT applications for all (or filtered) SubGroups on a vehicle. */
export async function syncMotorApplicationsForVehicle(
  input: SyncMotorApplicationsInput = {},
): Promise<SyncMotorApplicationsResult> {
  const { baseVehicleId, resolvedFromVin } = await resolveBaseVehicleId(input);
  const delayMs = input.delayMs ?? SUBGROUP_DELAY_MS;
  let taxonomySynced = false;

  let subGroupNodes = await loadSubGroupNodes(baseVehicleId, {
    systemFilter: input.systemFilter,
    subGroupId: input.subGroupId,
    limit: input.limit,
  });

  if (!subGroupNodes.length && input.ensureTaxonomy !== false) {
    await syncMotorTaxonomyForVehicle({
      baseVehicleId,
      vin: input.vin,
      vehicle: input.vehicle,
      persist: input.persist !== false,
    });
    taxonomySynced = true;
    subGroupNodes = await loadSubGroupNodes(baseVehicleId, {
      systemFilter: input.systemFilter,
      subGroupId: input.subGroupId,
      limit: input.limit,
    });
  }

  const pathMaps = await buildSubgroupPathMaps(baseVehicleId);
  const allRows: MotorApplicationRow[] = [];
  const subgroupDetails: SubGroupSyncDetail[] = [];
  const errors: Array<{ motorSubGroupId: number; path: string; error: string }> = [];
  const systemCounts: Record<string, number> = {};
  let subgroupsSkippedEmpty = 0;
  const total = subGroupNodes.length;

  for (let i = 0; i < subGroupNodes.length; i++) {
    const node = subGroupNodes[i]!;
    const motorGroupId = node.motorGroupId;
    const motorSubGroupId = node.motorSubGroupId;
    if (motorGroupId == null || motorSubGroupId == null) continue;

    const path = subgroupPath(pathMaps, node);
    const nodeKey =
      node.nodeKey ??
      motorTaxonomyNodeKey(baseVehicleId, "subgroup", {
        motorSystemId: node.motorSystemId,
        motorGroupId,
        motorSubGroupId,
      });

    let appCount = 0;
    let fetchError: string | undefined;

    try {
      const fetched = await fetchMotorApplicationsForSubGroup(
        baseVehicleId,
        node.motorSystemId,
        motorGroupId,
        motorSubGroupId,
        nodeKey,
      );

      appCount = fetched.applications.length;
      if (!appCount) {
        subgroupsSkippedEmpty += 1;
      } else {
        allRows.push(...fetched.applications);
        const systemName =
          pathMaps.systemNames.get(node.motorSystemId) ?? `System ${node.motorSystemId}`;
        systemCounts[systemName] = (systemCounts[systemName] ?? 0) + appCount;
      }
    } catch (e) {
      fetchError = e instanceof Error ? e.message : String(e);
      subgroupsSkippedEmpty += 1;
      errors.push({ motorSubGroupId, path, error: fetchError });
    }

    const detail: SubGroupSyncDetail = {
      index: i + 1,
      total,
      motorSystemId: node.motorSystemId,
      motorGroupId,
      motorSubGroupId,
      path,
      appCount,
      error: fetchError,
    };
    subgroupDetails.push(detail);
    input.onProgress?.(detail);

    if (i < subGroupNodes.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  let applicationsUpserted = 0;
  let applicationsDeleted = 0;

  if (input.persist !== false && !input.dryRun) {
    if (allRows.length) {
      const isFullSync = !input.systemFilter && !input.subGroupId && !input.limit;
      if (input.subGroupId) {
        const persisted = await persistMotorApplications(baseVehicleId, allRows, {
          motorSubGroupId: input.subGroupId,
        });
        applicationsUpserted = persisted.upserted;
        applicationsDeleted = persisted.deleted;
      } else if (isFullSync) {
        const persisted = await persistMotorApplications(baseVehicleId, allRows);
        applicationsUpserted = persisted.upserted;
        applicationsDeleted = persisted.deleted;
      } else {
        const syncedAt = new Date();
        for (const row of allRows) {
          await prisma.motorCatalogApplication.upsert({
            where: {
              baseVehicleId_motorApplicationId: {
                baseVehicleId,
                motorApplicationId: row.motorApplicationId,
              },
            },
            create: {
              baseVehicleId,
              motorSystemId: row.motorSystemId,
              motorGroupId: row.motorGroupId,
              motorSubGroupId: row.motorSubGroupId,
              motorApplicationId: row.motorApplicationId,
              nodeKey: row.nodeKey ?? null,
              literalName: row.literalName,
              displayName: row.displayName ?? null,
              operationType: row.operationType ?? null,
              estimatedHours: row.estimatedHours,
              laborTimeInterval: row.laborTimeInterval ?? "Hours",
              allLaborHours: row.allLaborHours ?? null,
              additionalLaborHours: row.additionalLaborHours ?? null,
              positionQualifier: row.positionQualifier ?? null,
              qualifiersJson: row.qualifiersJson ?? undefined,
              rawJson: row.rawJson ?? undefined,
              syncedAt,
            },
            update: {
              motorSystemId: row.motorSystemId,
              motorGroupId: row.motorGroupId,
              motorSubGroupId: row.motorSubGroupId,
              nodeKey: row.nodeKey ?? null,
              literalName: row.literalName,
              displayName: row.displayName ?? null,
              operationType: row.operationType ?? null,
              estimatedHours: row.estimatedHours,
              laborTimeInterval: row.laborTimeInterval ?? "Hours",
              allLaborHours: row.allLaborHours ?? null,
              additionalLaborHours: row.additionalLaborHours ?? null,
              positionQualifier: row.positionQualifier ?? null,
              qualifiersJson: row.qualifiersJson ?? undefined,
              rawJson: row.rawJson ?? undefined,
              syncedAt,
            },
          });
          applicationsUpserted += 1;
        }
      }
    } else if (input.subGroupId) {
      const deleted = await prisma.motorCatalogApplication.deleteMany({
        where: { baseVehicleId, motorSubGroupId: input.subGroupId },
      });
      applicationsDeleted = deleted.count;
    }
  }

  const preferredSample = input.subGroupId
    ? allRows.filter((r) => r.motorSubGroupId === input.subGroupId).slice(0, 5)
    : [];
  const sampleRows = (preferredSample.length ? preferredSample : allRows).slice(0, 5);

  return {
    baseVehicleId,
    resolvedFromVin,
    taxonomySynced,
    subgroupsProcessed: subGroupNodes.length,
    subgroupsSkippedEmpty,
    applicationsFetched: allRows.length,
    applicationsUpserted,
    applicationsDeleted,
    sampleRows,
    errors,
    systemCounts,
    subgroupDetails,
  };
}

/** Read persisted applications for a SubGroup (Labor Book grid prototype). */
export async function getMotorApplicationsForSubGroup(
  baseVehicleId: number,
  subGroupId: number,
): Promise<MotorApplicationRow[]> {
  const rows = await prisma.motorCatalogApplication.findMany({
    where: { baseVehicleId, motorSubGroupId: subGroupId },
    orderBy: [{ literalName: "asc" }, { positionQualifier: "asc" }],
  });

  return rows.map((row) => ({
    motorApplicationId: row.motorApplicationId,
    baseVehicleId: row.baseVehicleId,
    motorSystemId: row.motorSystemId,
    motorGroupId: row.motorGroupId,
    motorSubGroupId: row.motorSubGroupId,
    nodeKey: row.nodeKey ?? undefined,
    literalName: row.literalName,
    displayName: row.displayName ?? undefined,
    operationType: row.operationType ?? undefined,
    estimatedHours: row.estimatedHours,
    laborTimeInterval: row.laborTimeInterval ?? undefined,
    allLaborHours: row.allLaborHours ?? undefined,
    additionalLaborHours: row.additionalLaborHours ?? undefined,
    positionQualifier: row.positionQualifier ?? undefined,
    qualifiersJson: row.qualifiersJson ?? undefined,
  }));
}
