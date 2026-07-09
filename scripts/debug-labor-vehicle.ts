/**
 * Temporary diagnostic: labor guide vehicle key alignment + brake pad classification.
 * Run: npx tsx scripts/debug-labor-vehicle.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/db/client";
import {
  classifyOperation,
  enrichHitClassification,
  matchOperationsToSubcategory,
} from "../src/lib/labor-categories";
import {
  legacyVehicleKey,
  primaryVehicleKey,
  storedRowMatchesVehicle,
  vehicleKeysForLookup,
  vehicleKeyMatchRank,
  vin10FromVin,
  vin10VehicleKey,
  vinVehicleKey,
  ymmVehicleKey,
  type LaborVehicle,
} from "../src/lib/labor-vehicle-key";
import type { Vehicle } from "../src/server/services/labor-guide";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function rowSearchText(row: { jobName: string; queryText: string; laborOperations: string[] }): string {
  return [row.jobName, row.queryText, ...row.laborOperations].join(" ");
}

async function searchCachedLaborOperations(vehicle: Vehicle, query: string, limit = 25) {
  const needle = normalize(query);
  if (!needle) return [] as Array<{ jobName: string; queryText: string; subcategoryId?: string; totalHours?: number; vehicleMatch?: string }>;
  const { deduped } = await fetchLaborRowsForVehicleDebug(vehicle, 200);
  const matched = deduped
    .filter((row) => {
      const hay = normalize(rowSearchText(row));
      return hay.includes(needle) || needle.split(" ").every((w) => w.length > 1 && hay.includes(w));
    })
    .slice(0, limit);
  return matched.map((row) => enrichHitClassification({ jobName: row.jobName, queryText: row.queryText }, row.queryKey));
}

async function browseCachedLaborBySubcategory(vehicle: Vehicle, subcategoryId: string, limit = 30) {
  const { deduped } = await fetchLaborRowsForVehicleDebug(vehicle, 300);
  const hits = deduped.map((row) => enrichHitClassification({ jobName: row.jobName, queryText: row.queryText }, row.queryKey));
  return matchOperationsToSubcategory(subcategoryId, hits).slice(0, limit);
}

function vehicleFromDb(v: {
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  drivetrain: string | null;
}): Vehicle {
  return {
    vin: v.vin,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim,
    engine: v.engine,
    drivetrain: v.drivetrain,
  };
}

function summarizeKey(key: string): string {
  if (key.startsWith("vin10:")) return "vin10-prefixed";
  if (key.startsWith("vin:")) return "vin-prefixed";
  if (key.startsWith("ymm:")) return "ymm-prefixed";
  return "legacy-no-prefix";
}

async function fetchLaborRowsForVehicleDebug(vehicle: Vehicle, take = 300) {
  const keys = vehicleKeysForLookup(vehicle);
  const [keyRows, ymmRows] = await Promise.all([
    prisma.laborOperation.findMany({
      where: { vehicleKey: { in: keys } },
      orderBy: [{ hitCount: "desc" }, { refreshedAt: "desc" }],
      take: take * 3,
    }),
    vehicle.year != null && vehicle.make?.trim()
      ? prisma.laborOperation.findMany({
          where: {
            vehicleYear: vehicle.year,
            vehicleMake: { equals: vehicle.make, mode: "insensitive" },
          },
          orderBy: [{ hitCount: "desc" }, { refreshedAt: "desc" }],
          take: take * 3,
        })
      : Promise.resolve([]),
  ]);

  const byId = new Map<string, (typeof keyRows)[0]>();
  for (const row of [...keyRows, ...ymmRows]) {
    byId.set(row.id, row);
  }
  const rows = [...byId.values()];

  const rejected = rows.filter((row) => !storedRowMatchesVehicle(row, vehicle));
  const filtered = rows.filter((row) => storedRowMatchesVehicle(row, vehicle));

  const byQuery = new Map<string, (typeof rows)[0]>();
  for (const row of filtered) {
    const existing = byQuery.get(row.queryKey);
    if (
      !existing ||
      vehicleKeyMatchRank(row.vehicleKey) > vehicleKeyMatchRank(existing.vehicleKey)
    ) {
      byQuery.set(row.queryKey, row);
    }
  }

  return {
    keys,
    keyRows,
    ymmRows,
    rows,
    rejected,
    filtered,
    deduped: [...byQuery.values()].slice(0, take),
  };
}

function isBrakePadText(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("brake pad") || (t.includes("brake") && t.includes("pad"));
}

async function main() {
  const TEST_VIN = "1HGCR3F87EA007886";
  const testLv: LaborVehicle = {
    vin: TEST_VIN,
    year: 2014,
    make: "Honda",
    model: "Accord",
    trim: "EX-L",
    engine: "3.5L V6",
    drivetrain: null,
  };
  console.log("\n=== vin10 key verification ===");
  console.log(`  VIN: ${TEST_VIN}`);
  console.log(`  vin10 prefix: ${vin10FromVin(TEST_VIN)}`);
  console.log(`  primaryVehicleKey: ${primaryVehicleKey(testLv)}`);
  console.log(`  vin10VehicleKey: ${vin10VehicleKey(TEST_VIN)}`);
  console.log(`  lookup keys: ${JSON.stringify(vehicleKeysForLookup(testLv))}`);
  console.assert(
    primaryVehicleKey(testLv) === "vin10:1HGCR3F87E",
    "primaryVehicleKey must be vin10:1HGCR3F87E",
  );

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing (check .env)");
    process.exit(1);
  }

  const totalLabor = await prisma.laborOperation.count();
  console.log(`\n=== LaborOperation table: ${totalLabor} rows ===\n`);

  const vehicles = await prisma.vehicle.findMany({
    take: 8,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      vin: true,
      year: true,
      make: true,
      model: true,
      trim: true,
      engine: true,
      drivetrain: true,
    },
  });

  console.log("Sample vehicles in DB:");
  for (const v of vehicles) {
    const lv: LaborVehicle = vehicleFromDb(v);
    console.log(
      `  ${v.year ?? "?"} ${v.make ?? "?"} ${v.model ?? "?"} | engine=${v.engine ?? "—"} | vin=${v.vin ?? "—"}`,
    );
    console.log(
      `    primary=${primaryVehicleKey(lv)} | lookup keys=${JSON.stringify(vehicleKeysForLookup(lv))}`,
    );
  }

  const keyGroups = await prisma.laborOperation.groupBy({
    by: ["vehicleKey"],
    _count: { _all: true },
    orderBy: { _count: { vehicleKey: "desc" } },
    take: 25,
  });

  const allKeys = await prisma.laborOperation.findMany({
    select: { vehicleKey: true },
    distinct: ["vehicleKey"],
  });

  let vin10Keys = 0;
  let vinKeys = 0;
  let ymmKeys = 0;
  let legacyKeys = 0;
  for (const { vehicleKey } of allKeys) {
    const kind = summarizeKey(vehicleKey);
    if (kind === "vin10-prefixed") vin10Keys++;
    else if (kind === "vin-prefixed") vinKeys++;
    else if (kind === "ymm-prefixed") ymmKeys++;
    else legacyKeys++;
  }

  console.log("\nLaborOperation vehicleKey breakdown (distinct keys):");
  console.log(`  vin10:*   ${vin10Keys}`);
  console.log(`  vin:*     ${vinKeys}`);
  console.log(`  ymm:*     ${ymmKeys}`);
  console.log(`  legacy    ${legacyKeys}`);
  console.log("\nTop vehicleKey groups (count):");
  for (const g of keyGroups.slice(0, 15)) {
    console.log(`  ${g._count._all}\t[${summarizeKey(g.vehicleKey)}] ${g.vehicleKey.slice(0, 80)}`);
  }

  const ro = await prisma.repairOrder.findFirst({
    where: { vehicleId: { not: undefined } },
    orderBy: { updatedAt: "desc" },
    include: {
      vehicle: {
        select: {
          id: true,
          vin: true,
          year: true,
          make: true,
          model: true,
          trim: true,
          engine: true,
          drivetrain: true,
        },
      },
    },
  });

  if (!ro?.vehicle) {
    console.error("No repair order with vehicle found.");
    await prisma.$disconnect();
    return;
  }

  const testVehicle = vehicleFromDb(ro.vehicle);
  console.log(`\n=== RO test vehicle (RO #${ro.number}) ===`);
  console.log(`  ${JSON.stringify(testVehicle, null, 2)}`);

  const debugFetch = await fetchLaborRowsForVehicleDebug(testVehicle, 300);
  console.log("\nfetchLaborRowsForVehicle (debug):");
  console.log(`  keys queried: ${debugFetch.keys.length}`);
  console.log(`  rows from IN query: ${debugFetch.rows.length}`);
  console.log(`  after storedRowMatchesVehicle: ${debugFetch.filtered.length}`);
  console.log(`  after dedupe: ${debugFetch.deduped.length}`);
  console.log(`  rejected by storedRowMatchesVehicle: ${debugFetch.rejected.length}`);

  if (debugFetch.rejected.length > 0) {
    console.log("\n  Sample rejected rows (IN query but fail storedRowMatchesVehicle):");
    for (const r of debugFetch.rejected.slice(0, 8)) {
      console.log(
        `    id=${r.id.slice(0, 8)}… key=${r.vehicleKey.slice(0, 60)} | row YMM=${r.vehicleYear}/${r.vehicleMake}/${r.vehicleModel} eng=${r.vehicleEngine ?? "—"} vin=${r.vehicleVin ?? "—"} | job=${r.jobName.slice(0, 50)}`,
      );
    }
  }

  const searchHits = await searchCachedLaborOperations(testVehicle, "brake pads", 25);
  console.log(`\nsearchCachedLaborOperations("brake pads"): ${searchHits.length} hits`);
  for (const h of searchHits.slice(0, 8)) {
    console.log(
      `  - ${h.jobName} | ${h.subcategoryId ?? "?"} | ${h.totalHours}h | match=${h.vehicleMatch}`,
    );
  }

  const browseHits = await browseCachedLaborBySubcategory(testVehicle, "brakes-pads", 30);
  console.log(`\nbrowseCachedLaborBySubcategory("brakes-pads"): ${browseHits.length} hits`);
  for (const h of browseHits.slice(0, 8)) {
    console.log(`  - ${h.jobName} | queryKey=${h.queryText?.slice(0, 40) ?? "—"}`);
  }

  const brakePadRows = await prisma.laborOperation.findMany({
    where: {
      OR: [
        { jobName: { contains: "brake pad", mode: "insensitive" } },
        { queryKey: { contains: "brake pad", mode: "insensitive" } },
        { queryText: { contains: "brake pad", mode: "insensitive" } },
      ],
    },
    take: 150,
    orderBy: { hitCount: "desc" },
  });

  const misclassified: Array<{
    jobName: string;
    queryKey: string;
    expected: string;
    got: string;
    vehicleKey: string;
  }> = [];

  for (const row of brakePadRows) {
    const cls = classifyOperation(row.jobName, row.queryKey);
    if (cls.subcategoryId !== "brakes-pads") {
      misclassified.push({
        jobName: row.jobName,
        queryKey: row.queryKey,
        expected: "brakes-pads",
        got: cls.subcategoryId,
        vehicleKey: row.vehicleKey,
      });
    }
  }

  console.log(`\nBrake-pad-ish rows in cache: ${brakePadRows.length}`);
  console.log(`Misclassified (not brakes-pads): ${misclassified.length}`);
  for (const m of misclassified.slice(0, 12)) {
    console.log(`  [${m.got}] ${m.jobName} | queryKey=${m.queryKey} | key=${m.vehicleKey.slice(0, 50)}`);
  }

  const enrichedForRo = debugFetch.deduped.map((row) =>
    enrichHitClassification(
      { jobName: row.jobName, queryText: row.queryText, queryKey: row.queryKey },
      row.queryKey,
    ),
  );
  const wrongSubForVehicle = enrichedForRo.filter(
    (h) => isBrakePadText(h.jobName + " " + (h.queryText ?? "")) && h.subcategoryId !== "brakes-pads",
  );
  console.log(
    `\nOn RO vehicle cache rows: brake-pad text but not brakes-pads subcategory: ${wrongSubForVehicle.length}`,
  );
  for (const h of wrongSubForVehicle.slice(0, 8)) {
    console.log(`  [${h.subcategoryId}] ${h.jobName}`);
  }

  const inBrowseButNotPad = browseHits.filter((h) => !isBrakePadText(h.jobName + " " + (h.queryText ?? "")));
  console.log(`\nIn brakes-pads browse but no brake-pad keywords: ${inBrowseButNotPad.length}`);
  for (const h of inBrowseButNotPad.slice(0, 8)) {
    console.log(`  - ${h.jobName} (${h.subcategoryId})`);
  }

  const padKeywordsNotInBrowse = enrichedForRo.filter((h) => {
    const text = h.jobName + " " + (h.queryText ?? "");
    if (!isBrakePadText(text)) return false;
    const matched = matchOperationsToSubcategory("brakes-pads", [
      { jobName: h.jobName, queryText: h.queryText },
    ]);
    return matched.length === 0;
  });
  console.log(
    `\nRO vehicle rows with pad keywords that matchOperationsToSubcategory excludes from brakes-pads: ${padKeywordsNotInBrowse.length}`,
  );
  for (const h of padKeywordsNotInBrowse.slice(0, 8)) {
    console.log(`  [classified as ${h.subcategoryId}] ${h.jobName}`);
  }

  if (testVehicle.vin) {
    const vin10Key = vin10FromVin(testVehicle.vin)
      ? vin10VehicleKey(testVehicle.vin)
      : null;
    const vin10RowCount = vin10Key
      ? await prisma.laborOperation.count({ where: { vehicleKey: vin10Key } })
      : 0;
    const vinKey = vinVehicleKey(testVehicle.vin);
    const vinRowCount = await prisma.laborOperation.count({ where: { vehicleKey: vinKey } });
    const ymmKey = ymmVehicleKey(testVehicle);
    const ymmRowCount = await prisma.laborOperation.count({ where: { vehicleKey: ymmKey } });
    const legacyKey = legacyVehicleKey(testVehicle);
    const legacyRowCount = await prisma.laborOperation.count({ where: { vehicleKey: legacyKey } });
    console.log("\nPer-key row counts for RO vehicle:");
    if (vin10Key) console.log(`  ${vin10Key}: ${vin10RowCount}`);
    console.log(`  ${vinKey}: ${vinRowCount}`);
    console.log(`  ${ymmKey}: ${ymmRowCount}`);
    console.log(`  ${legacyKey}: ${legacyRowCount}`);
  }

  const sampleRow = await prisma.laborOperation.findFirst({
    where: { vehicleKey: { contains: "2018|honda|accord" } },
  });
  console.log("\nSample cache row columns:", sampleRow
    ? {
        vehicleKey: sampleRow.vehicleKey,
        vehicleYear: sampleRow.vehicleYear,
        vehicleMake: sampleRow.vehicleMake,
        vehicleModel: sampleRow.vehicleModel,
        vehicleEngine: sampleRow.vehicleEngine,
        jobName: sampleRow.jobName,
      }
    : "none");

  console.log("\n=== Synthetic 2018 Honda Accord (cache fleet overlap test) ===");
  const synth2018 = {
    vin: null as string | null,
    year: 2018,
    make: "Honda",
    model: "Accord Sedan",
    trim: null,
    engine: "1.5L 4-cyl",
    drivetrain: null,
  };
  if (sampleRow) {
    console.log(
      "  storedRowMatchesVehicle(sampleRow):",
      storedRowMatchesVehicle(sampleRow, synth2018),
    );
  }
  const ymmCandidates = await prisma.laborOperation.findMany({
    where: { vehicleYear: 2018, vehicleMake: { equals: "Honda", mode: "insensitive" } },
    take: 5,
  });
  console.log(`  ymmCandidates count (2018 Honda): ${ymmCandidates.length}`);
  for (const r of ymmCandidates.slice(0, 3)) {
    console.log(
      `    match=${storedRowMatchesVehicle(r, synth2018)} job=${r.jobName} model=${r.vehicleModel}`,
    );
  }
  const synthFetch = await fetchLaborRowsForVehicleDebug(synth2018, 300);
  console.log(`  rows: key=${synthFetch.rows.length} filtered=${synthFetch.filtered.length} deduped=${synthFetch.deduped.length}`);
  const synthFetchProd = await fetchLaborRowsForVehicleDebug(synth2018, 200);
  console.log(`  fetchLaborRowsForVehicle (prod logic): ${synthFetchProd.deduped.length} rows`);
  const directYmm = await prisma.laborOperation.findMany({
    where: { vehicleYear: 2018, vehicleMake: { equals: "Honda", mode: "insensitive" } },
    take: 900,
  });
  const directFiltered = directYmm.filter((r) => storedRowMatchesVehicle(r, synth2018));
  console.log(`  direct ymm fetch: ${directYmm.length} -> filtered ${directFiltered.length}`);
  const synthSearch = await searchCachedLaborOperations(synth2018, "brake pads", 10);
  console.log(`  search brake pads: ${synthSearch.length} hits`);
  const synthCoolant = await searchCachedLaborOperations(synth2018, "coolant", 10);
  console.log(`  search coolant: ${synthCoolant.length} hits`);
  for (const h of synthSearch.slice(0, 5)) {
    console.log(`    ${h.jobName} | ${h.vehicleMatch} | ${h.subcategoryId}`);
  }

  console.log("\n=== Done ===\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


