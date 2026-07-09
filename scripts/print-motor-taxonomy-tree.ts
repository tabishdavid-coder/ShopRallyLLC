/**
 * Print MOTOR taxonomy tree from MotorCatalogNode (or JSON snapshot fallback).
 *
 * Usage:
 *   npm run print:motor-taxonomy
 *   npm run print:motor-taxonomy -- --baseVehicleId=22124
 *   npm run print:motor-taxonomy -- --json
 */
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env.local" });
dotenv.config();

import {
  buildMotorTaxonomyTreeFromFlat,
  formatMotorTaxonomyBranch,
  getMotorCatalogTree,
  type MotorTaxonomyFlatNode,
  type MotorTaxonomyTreeNode,
} from "../src/server/services/motor/motor-taxonomy";

const DEFAULT_BASE_VEHICLE_ID = 22124;
const ENGINE_TRUNCATE_AFTER = 8;

function parseArgs(argv: string[]) {
  let baseVehicleId = DEFAULT_BASE_VEHICLE_ID;
  let useJson = false;

  for (const arg of argv) {
    if (arg === "--json") useJson = true;
    if (arg.startsWith("--baseVehicleId=")) {
      baseVehicleId = Number(arg.slice("--baseVehicleId=".length));
    }
  }

  return { baseVehicleId, useJson };
}

function formatSimpleBranch(
  node: MotorTaxonomyTreeNode,
  indent = 0,
  options: { truncateEngine?: boolean } = {},
): string[] {
  const prefix = "  ".repeat(indent);
  const lines = [`${prefix}${node.name}`];

  const isEngine = node.level === "system" && node.name.toLowerCase() === "engine";
  const children = node.children;

  if (isEngine && options.truncateEngine && children.length > ENGINE_TRUNCATE_AFTER) {
    for (const child of children.slice(0, ENGINE_TRUNCATE_AFTER)) {
      lines.push(...formatSimpleBranch(child, indent + 1, options));
    }
    const remaining = children.length - ENGINE_TRUNCATE_AFTER;
    const subCount = children
      .slice(ENGINE_TRUNCATE_AFTER)
      .reduce((sum, g) => sum + g.children.length, 0);
    lines.push(
      `${"  ".repeat(indent + 1)}… +${remaining} more groups (${subCount} subgroups truncated)`,
    );
    return lines;
  }

  for (const child of children) {
    lines.push(...formatSimpleBranch(child, indent + 1, options));
  }
  return lines;
}

function formatTreeSummary(tree: MotorTaxonomyTreeNode[]): string {
  const systems = tree.length;
  let groups = 0;
  let subgroups = 0;
  for (const system of tree) {
    groups += system.children.length;
    for (const group of system.children) {
      subgroups += group.children.length;
    }
  }
  return `Counts — systems: ${systems}, groups: ${groups}, subgroups: ${subgroups}`;
}

async function loadFromJson(baseVehicleId: number): Promise<MotorTaxonomyTreeNode[]> {
  const filePath = path.join(
    process.cwd(),
    "prisma",
    "data",
    `motor-taxonomy-${baseVehicleId}.json`,
  );
  const raw = await readFile(filePath, "utf8");
  const payload = JSON.parse(raw) as { nodes: MotorTaxonomyFlatNode[] };
  return buildMotorTaxonomyTreeFromFlat(payload.nodes);
}

async function main() {
  const { baseVehicleId, useJson } = parseArgs(process.argv.slice(2));

  let tree: MotorTaxonomyTreeNode[];
  let source: string;

  if (useJson) {
    tree = await loadFromJson(baseVehicleId);
    source = `JSON snapshot (motor-taxonomy-${baseVehicleId}.json)`;
  } else {
    try {
      tree = await getMotorCatalogTree(baseVehicleId);
      source = "MotorCatalogNode (DB)";
      if (tree.length === 0) {
        console.warn("DB empty — falling back to JSON snapshot.");
        tree = await loadFromJson(baseVehicleId);
        source = `JSON snapshot fallback (motor-taxonomy-${baseVehicleId}.json)`;
      }
    } catch {
      tree = await loadFromJson(baseVehicleId);
      source = `JSON snapshot fallback (motor-taxonomy-${baseVehicleId}.json)`;
    }
  }

  console.log(`MOTOR taxonomy tree — BaseVehicleID ${baseVehicleId}`);
  console.log(`Source: ${source}`);
  console.log(`Vehicle: 2010 Honda Civic (VIN 19XFA1F51AE028415)`);
  console.log(formatTreeSummary(tree));
  console.log("");

  for (const system of tree) {
    for (const line of formatSimpleBranch(system, 0, { truncateEngine: true })) {
      console.log(line);
    }
    console.log("");
  }

  const brakes = tree.find((n) => n.name.toLowerCase() === "brakes");
  if (brakes) {
    console.log("--- Brakes (with MOTOR IDs) ---");
    for (const line of formatMotorTaxonomyBranch(brakes)) console.log(line);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
