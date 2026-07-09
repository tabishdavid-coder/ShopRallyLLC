import "server-only";

import { buildReferenceTaxonomyPromptBlock, findStaticMotorSubGroup } from "@/lib/labor-book-reference";
import {
  allowSandboxMotorDbCache,
  isLicensedMotorCatalog,
  isReferenceTaxonomyMode,
} from "@/lib/labor-catalog-mode";
import { prisma } from "@/db/client";

export type MotorRagExample = {
  literalName: string;
  estimatedHours: number;
  positionQualifier?: string | null;
  operationType?: string | null;
};

export type FetchMotorRagExamplesInput = {
  baseVehicleId: number;
  motorSubGroupId?: number;
  literalName?: string;
  limit?: number;
};

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Few-shot MOTOR application metadata for AI prompts (no rawJson). */
export async function fetchMotorRagExamples(
  input: FetchMotorRagExamplesInput,
): Promise<MotorRagExample[]> {
  if (isReferenceTaxonomyMode() && !allowSandboxMotorDbCache()) return [];

  const limit = input.limit ?? 3;
  const where: {
    baseVehicleId: number;
    motorSubGroupId?: number;
    OR?: Array<{ literalName?: { contains: string; mode: "insensitive" } }>;
  } = { baseVehicleId: input.baseVehicleId };

  if (input.motorSubGroupId != null) {
    where.motorSubGroupId = input.motorSubGroupId;
  }

  const needle = input.literalName?.trim();
  if (needle) {
    const tokens = normalizeText(needle).split(" ").filter((t) => t.length > 2);
    if (tokens.length) {
      where.OR = tokens.map((token) => ({
        literalName: { contains: token, mode: "insensitive" as const },
      }));
    }
  }

  const rows = await prisma.motorCatalogApplication.findMany({
    where,
    orderBy: [{ literalName: "asc" }, { estimatedHours: "desc" }],
    take: limit * 4,
    select: {
      literalName: true,
      estimatedHours: true,
      positionQualifier: true,
      operationType: true,
    },
  });

  if (needle && rows.length > limit) {
    const q = normalizeText(needle);
    rows.sort((a, b) => {
      const aName = normalizeText(a.literalName);
      const bName = normalizeText(b.literalName);
      if (aName === q && bName !== q) return -1;
      if (bName === q && aName !== q) return 1;
      if (aName.includes(q) && !bName.includes(q)) return -1;
      if (bName.includes(q) && !aName.includes(q)) return 1;
      return 0;
    });
  }

  return rows.slice(0, limit).map((row) => ({
    literalName: row.literalName,
    estimatedHours: row.estimatedHours,
    positionQualifier: row.positionQualifier,
    operationType: row.operationType,
  }));
}

type TaxonomyNodeRow = {
  level: string;
  motorSystemId: number;
  motorGroupId: number | null;
  motorSubGroupId: number | null;
  name: string;
};

async function loadTaxonomyNodes(
  baseVehicleId: number,
  motorSubGroupId: number,
): Promise<TaxonomyNodeRow[]> {
  return prisma.motorCatalogNode.findMany({
    where: {
      baseVehicleId,
      OR: [
        { level: "subgroup", motorSubGroupId },
        { level: "group", motorSubGroupId: null },
        { level: "system", motorGroupId: null, motorSubGroupId: null },
      ],
    },
    select: {
      level: true,
      motorSystemId: true,
      motorGroupId: true,
      motorSubGroupId: true,
      name: true,
    },
  });
}

/** Structured MOTOR taxonomy block for AI user prompts (names + IDs only). */
export async function buildMotorTaxonomyPromptBlock(
  baseVehicleId: number,
  motorSubGroupId: number,
): Promise<string | null> {
  if (isReferenceTaxonomyMode()) {
    return buildReferenceTaxonomyPromptBlock(motorSubGroupId);
  }

  const subgroupNode = await prisma.motorCatalogNode.findFirst({
    where: { baseVehicleId, level: "subgroup", motorSubGroupId },
    select: {
      motorSystemId: true,
      motorGroupId: true,
      motorSubGroupId: true,
      name: true,
    },
  });
  if (!subgroupNode?.motorGroupId || !subgroupNode.motorSubGroupId) return null;

  const [systemNode, groupNode] = await Promise.all([
    prisma.motorCatalogNode.findFirst({
      where: {
        baseVehicleId,
        level: "system",
        motorSystemId: subgroupNode.motorSystemId,
      },
      select: { name: true, motorSystemId: true },
    }),
    prisma.motorCatalogNode.findFirst({
      where: {
        baseVehicleId,
        level: "group",
        motorGroupId: subgroupNode.motorGroupId,
      },
      select: { name: true, motorGroupId: true },
    }),
  ]);

  if (!systemNode || !groupNode) {
    const nodes = await loadTaxonomyNodes(baseVehicleId, motorSubGroupId);
    const system = nodes.find((n) => n.level === "system");
    const group = nodes.find(
      (n) => n.level === "group" && n.motorGroupId === subgroupNode.motorGroupId,
    );
    if (!system || !group) return null;
    return [
      "MOTOR taxonomy context:",
      `  System: ${system.name} (SystemID=${system.motorSystemId})`,
      `  Group: ${group.name} (GroupID=${group.motorGroupId})`,
      `  SubGroup: ${subgroupNode.name} (SubGroupID=${subgroupNode.motorSubGroupId})`,
    ].join("\n");
  }

  return [
    "MOTOR taxonomy context:",
    `  System: ${systemNode.name} (SystemID=${systemNode.motorSystemId})`,
    `  Group: ${groupNode.name} (GroupID=${groupNode.motorGroupId})`,
    `  SubGroup: ${subgroupNode.name} (SubGroupID=${subgroupNode.motorSubGroupId})`,
  ].join("\n");
}

/** Build breadcrumb path from MOTOR taxonomy nodes. */
export async function motorTaxonomyCategoryPath(
  baseVehicleId: number,
  motorSubGroupId: number,
): Promise<string | null> {
  if (isReferenceTaxonomyMode()) {
    return findStaticMotorSubGroup(motorSubGroupId)?.categoryPath ?? null;
  }

  const block = await buildMotorTaxonomyPromptBlock(baseVehicleId, motorSubGroupId);
  if (!block) return null;
  const lines = block
    .split("\n")
    .slice(1)
    .map((line) => {
      const match = line.match(/^\s+\w+: (.+?) \(.*\)$/);
      return match?.[1]?.trim();
    })
    .filter(Boolean);
  return lines.length ? lines.join(" › ") : null;
}

export type MotorCatalogAppMatch = {
  motorApplicationId: number;
  baseVehicleId: number;
  motorSystemId: number;
  motorGroupId: number;
  motorSubGroupId: number;
  literalName: string;
  estimatedHours: number;
  positionQualifier?: string | null;
  operationType?: string | null;
  displayName?: string | null;
};

/** Find best MotorCatalogApplication match for a repair request. */
export async function findMotorCatalogApplicationMatch(
  baseVehicleId: number,
  request: string,
  opts?: { motorSubGroupId?: number; positionHint?: string },
): Promise<MotorCatalogAppMatch | null> {
  const needle = normalizeText(request);
  if (!needle) return null;

  const rows = await prisma.motorCatalogApplication.findMany({
    where: {
      baseVehicleId,
      ...(opts?.motorSubGroupId != null ? { motorSubGroupId: opts.motorSubGroupId } : {}),
    },
    orderBy: [{ literalName: "asc" }],
    take: 200,
  });

  if (!rows.length) return null;

  const scored = rows
    .map((row) => {
      const name = normalizeText(row.literalName);
      let score = 0;
      if (name === needle) score += 100;
      else if (name.includes(needle) || needle.includes(name)) score += 50;
      else {
        const tokens = needle.split(" ").filter((t) => t.length > 2);
        score += tokens.filter((t) => name.includes(t)).length * 10;
      }
      if (opts?.positionHint) {
        const pos = normalizeText(opts.positionHint);
        const rowPos = row.positionQualifier ? normalizeText(row.positionQualifier) : "";
        if (rowPos && (rowPos.includes(pos) || pos.includes(rowPos))) score += 15;
      }
      return { row, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0]?.row;
  if (!best || scored[0]!.score < 10) return null;

  return {
    motorApplicationId: best.motorApplicationId,
    baseVehicleId: best.baseVehicleId,
    motorSystemId: best.motorSystemId,
    motorGroupId: best.motorGroupId,
    motorSubGroupId: best.motorSubGroupId,
    literalName: best.literalName,
    estimatedHours: best.estimatedHours,
    positionQualifier: best.positionQualifier,
    operationType: best.operationType,
    displayName: best.displayName,
  };
}

export function motorCatalogAppToSuggestion(
  app: MotorCatalogAppMatch,
): import("@/server/services/labor-guide").LaborSuggestion {
  return {
    jobName: app.literalName,
    unitLabel: "vehicle",
    unitsOnVehicle: 1,
    laborHoursPerUnit: app.estimatedHours,
    laborOperations: [app.literalName, ...(app.positionQualifier ? [app.positionQualifier] : [])],
    notes: app.operationType ? `MOTOR: ${app.operationType}` : "MOTOR Estimated Work Times",
    confidenceScore: 0.95,
    reasoningSummary: "MOTOR Estimated Work Times (licensed catalog)",
  };
}
