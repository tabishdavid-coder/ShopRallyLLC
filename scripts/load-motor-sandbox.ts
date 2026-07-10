/**
 * Load MOTOR sandbox test data into the DB from prisma/data snapshots — NO live
 * MOTOR keys required. Restores usable MOTOR catalog + Estimated Work Time rows for
 * the sandbox vehicle (2010 Honda Civic, BaseVehicleID 22124) so the Labor Book can
 * serve MOTOR/BOOK hours offline.
 *
 * Reads:
 *   prisma/data/motor-taxonomy-<base>.json          → MotorCatalogNode (systems/groups/subgroups)
 *   prisma/data/motor-applications-<base>-*.json     → MotorCatalogApplication (EWT rows w/ `applications`)
 *
 * Usage:
 *   npm run db:load-motor-sandbox
 *
 * Then set MOTOR_SANDBOX_CACHE=true in .env.local and open the Labor Book on a
 * 2010 Honda Civic (or a vehicle with VIN 19XFA1F51AE028415).
 */
import dotenv from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env.local" });
dotenv.config();

import {
  persistMotorApplications,
  type MotorApplicationRow,
} from "../src/server/services/motor/motor-applications";
import {
  persistMotorTaxonomyNodes,
  type MotorTaxonomyFlatNode,
} from "../src/server/services/motor/motor-taxonomy";

const DATA_DIR = path.join(process.cwd(), "prisma", "data");

type TaxonomyFile = {
  baseVehicleId: number;
  nodes: MotorTaxonomyFlatNode[];
};

type ApplicationsFile = {
  baseVehicleId: number;
  subGroupId?: number;
  applications: MotorApplicationRow[];
};

async function loadJson<T>(file: string): Promise<T> {
  const raw = await readFile(path.join(DATA_DIR, file), "utf8");
  return JSON.parse(raw) as T;
}

async function main() {
  const files = await readdir(DATA_DIR);

  const taxonomyFiles = files.filter(
    (f) => /^motor-taxonomy-\d+\.json$/.test(f),
  );
  const applicationFiles = files.filter(
    (f) => /^motor-applications-\d+-.+\.json$/.test(f),
  );

  if (!taxonomyFiles.length && !applicationFiles.length) {
    console.error(`No MOTOR sandbox snapshots found in ${DATA_DIR}.`);
    process.exit(1);
  }

  let nodeTotal = 0;
  for (const file of taxonomyFiles) {
    const data = await loadJson<TaxonomyFile>(file);
    if (!data.baseVehicleId || !Array.isArray(data.nodes) || !data.nodes.length) {
      console.log(`  skip ${file} (no nodes)`);
      continue;
    }
    const { upserted, deleted } = await persistMotorTaxonomyNodes(
      data.baseVehicleId,
      data.nodes,
    );
    nodeTotal += upserted;
    console.log(
      `  taxonomy ${file} → BaseVehicleID ${data.baseVehicleId}: ${upserted} nodes upserted, ${deleted} stale removed`,
    );
  }

  let appTotal = 0;
  for (const file of applicationFiles) {
    const data = await loadJson<Partial<ApplicationsFile>>(file);
    if (
      !data.baseVehicleId ||
      !Array.isArray(data.applications) ||
      !data.applications.length
    ) {
      // Summary files (subgroupDetails only) have no `applications` array — skip them.
      continue;
    }
    // Scope the stale-delete to this subgroup when the snapshot is subgroup-scoped so
    // we never wipe applications from other subgroups.
    const scope = data.subGroupId ? { motorSubGroupId: data.subGroupId } : undefined;
    const { upserted, deleted } = await persistMotorApplications(
      data.baseVehicleId,
      data.applications,
      scope,
    );
    appTotal += upserted;
    console.log(
      `  apps ${file} → BaseVehicleID ${data.baseVehicleId}${
        data.subGroupId ? ` SubGroup ${data.subGroupId}` : ""
      }: ${upserted} applications upserted, ${deleted} stale removed`,
    );
  }

  console.log(
    `\nDone. ${nodeTotal} taxonomy nodes + ${appTotal} MOTOR applications loaded.`,
  );
  console.log(
    "Set MOTOR_SANDBOX_CACHE=true in .env.local, then open the Labor Book on a 2010 Honda Civic.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
