"use server";



import { getPrismaClient, prisma } from "@/db/client";

import {

  mapMotorLaborSystemsToSidebar,

  mapMotorTreeToSidebar,

  motorApplicationsToGridRows,

  type LaborBookMotorApplicationDto,

  type LaborBookMotorSidebarNode,

} from "@/lib/labor-book-motor-adapter";

import { laborOperationsToReferenceGridRows } from "@/lib/labor-book-reference";

import {

  allowSandboxMotorDbCache,

  getLaborCatalogMode,

  isLaborAiEnabled,

  isReferenceTaxonomyMode,

  motorCatalogDataAvailable,

  type LaborCatalogMode,

} from "@/lib/labor-catalog-mode";

import { MOTOR_LABOR_SYSTEMS } from "@/lib/labor-motor-tree-static";

import type { LaborGridRow } from "@/lib/labor-book-v4-helpers";

import {

  storedRowMatchesVehicle,

  vehicleKeysForLookup,

} from "@/lib/labor-vehicle-key";

import { getShopId } from "@/lib/shop";

import { motorEnabledForShop, oemLaborPrimaryForShop } from "@/server/labor-entitlement";

import {

  getMotorApplicationsForSubGroup,

  syncMotorApplicationsForVehicle,

} from "@/server/services/motor/motor-applications";

import { isMotorLaborEnabled } from "@/server/services/motor/motor-config";

import { getMotorCatalogTree } from "@/server/services/motor/motor-taxonomy";

import { resolveMotorBaseVehicleId } from "@/server/services/motor/motor-vehicle";

import type { Vehicle as LaborServiceVehicle } from "@/server/services/labor-guide";

import { gates } from "@/server/permission-gates";



export type LaborBookMotorSource = "motor" | "reference" | "shop" | "oem";



export type LaborBookMotorInitResult =

  | {

      ok: true;

      baseVehicleId: number | null;

      source: LaborBookMotorSource;

      catalogMode: LaborCatalogMode;

      /** OEM automation is the primary labor lane (Pro/Elite). MOTOR is fallback. */

      oemLaborPrimary: boolean;

      /** MOTOR data (licensed or sandbox overlay) is available for this vehicle. */

      motorAvailable: boolean;

      /** AI first-principles generation is enabled (LABOR_AI_ENABLED). Parked by default. */

      aiEnabled: boolean;

      tree: LaborBookMotorSidebarNode[];

      /** Shown when taxonomy exists but no applications synced yet. */

      syncBanner?: string;

    }

  | { ok: false; error: string };



export type LaborBookMotorApplicationsResult =

  | { ok: true; rows: LaborGridRow[] }

  | { ok: false; error: string };



const vehicleSelect = {

  vin: true,

  year: true,

  make: true,

  model: true,

  trim: true,

  engine: true,

  drivetrain: true,

} as const;



function toLaborServiceVehicle(

  vehicle: {

    vin: string | null;

    year: number | null;

    make: string | null;

    model: string | null;

    trim: string | null;

    engine: string | null;

    drivetrain: string | null;

  },

): LaborServiceVehicle {

  return {

    vin: vehicle.vin,

    year: vehicle.year,

    make: vehicle.make,

    model: vehicle.model,

    trim: vehicle.trim,

    engine: vehicle.engine,

    drivetrain: vehicle.drivetrain,

  };

}



async function loadVehicle(vehicleId: string) {

  const shopId = await getShopId();

  const vehicle = await prisma.vehicle.findFirst({

    where: { id: vehicleId, shopId },

    select: vehicleSelect,

  });

  if (!vehicle) return null;

  return { shopId, vehicle };

}



function motorCatalogDelegatesReady(): boolean {

  const client = getPrismaClient();

  return (

    typeof client.motorCatalogNode?.count === "function" &&

    typeof client.motorCatalogApplication?.count === "function"

  );

}



async function countMotorCatalogForVehicle(baseVehicleId: number): Promise<{

  ready: boolean;

  nodeCount: number;

  applicationCount: number;

}> {

  if (!motorCatalogDelegatesReady()) {

    return { ready: false, nodeCount: 0, applicationCount: 0 };

  }



  const client = getPrismaClient();

  const [nodeCount, applicationCount] = await Promise.all([

    client.motorCatalogNode.count({ where: { baseVehicleId } }),

    client.motorCatalogApplication.count({ where: { baseVehicleId } }),

  ]);



  return { ready: true, nodeCount, applicationCount };

}



/** Reference taxonomy init — static MOTOR-shaped tree, no MotorCatalogNode required. */

function referenceTaxonomyInit(

  baseVehicleId: number | null,

): Extract<LaborBookMotorInitResult, { ok: true }> {

  return {

    ok: true,

    baseVehicleId,

    source: "reference",

    catalogMode: "reference",

    oemLaborPrimary: false,

    motorAvailable: false,

    aiEnabled: isLaborAiEnabled(),

    tree: mapMotorLaborSystemsToSidebar(MOTOR_LABOR_SYSTEMS),

    syncBanner: isLaborAiEnabled()
      ? "Shop labor guide — taxonomy browse + cache/AI hours. MOTOR sandbox disconnected."
      : "Shop labor guide — MOTOR sandbox disconnected. Load MOTOR test data (MOTOR_SANDBOX_CACHE=true) for BOOK hours.",

  };

}



/** Pro/Elite OEM-primary init — taxonomy browse, MOTOR demoted to fallback. */

function oemPrimaryLaborInit(

  baseVehicleId: number | null,

  motorAvailable: boolean,

): Extract<LaborBookMotorInitResult, { ok: true }> {

  return {

    ok: true,

    baseVehicleId,

    source: "oem",

    catalogMode: "reference",

    oemLaborPrimary: true,

    motorAvailable,

    aiEnabled: isLaborAiEnabled(),

    tree: mapMotorLaborSystemsToSidebar(MOTOR_LABOR_SYSTEMS),

    syncBanner: motorAvailable
      ? "OEM automation primary — platform SQL averages. MOTOR catalog available as fallback."
      : "OEM automation primary — platform SQL averages. Enable MOTOR env for fallback BOOK times.",

  };

}



/** Legacy shop-library fallback when static tree unavailable. */

function shopLibraryInit(

  baseVehicleId: number | null,

): Extract<LaborBookMotorInitResult, { ok: true }> {

  return {

    ok: true,

    baseVehicleId,

    source: "shop",

    catalogMode: getLaborCatalogMode(),

    oemLaborPrimary: false,

    motorAvailable: motorCatalogDataAvailable(),

    aiEnabled: isLaborAiEnabled(),

    tree: mapMotorLaborSystemsToSidebar(MOTOR_LABOR_SYSTEMS),

    syncBanner:

      baseVehicleId != null

        ? "Using industry reference taxonomy (offline). Sync licensed catalog for vehicle-specific MOTOR hours."

        : undefined,

  };

}



/** Resolve MOTOR BaseVehicleID for a shop vehicle (cached in motor-vehicle service). */

export async function getMotorBaseVehicleIdForVehicle(

  vehicleId: string,

): Promise<{ ok: true; baseVehicleId: number | null } | { ok: false; error: string }> {

  const loaded = await loadVehicle(vehicleId);

  if (!loaded) return { ok: false, error: "Vehicle not found." };



  const denied = await gates.estimateView(loaded.shopId);

  if (denied) return { ok: false, error: denied.error };



  const baseVehicleId = await resolveMotorBaseVehicleId(toLaborServiceVehicle(loaded.vehicle));

  return { ok: true, baseVehicleId };

}



/** MOTOR catalog tree for Labor Book sidebar (empty when not synced). */

export async function getLaborBookMotorTree(

  baseVehicleId: number,

): Promise<LaborBookMotorSidebarNode[]> {

  const tree = await getMotorCatalogTree(baseVehicleId);

  return mapMotorTreeToSidebar(tree);

}



function toApplicationDto(row: {

  motorApplicationId: number;

  literalName: string;

  displayName?: string | null;

  operationType?: string | null;

  estimatedHours: number;

  positionQualifier?: string | null;

  motorSystemId: number;

  motorGroupId: number;

  motorSubGroupId: number;

  nodeKey?: string | null;

}): LaborBookMotorApplicationDto {

  return {

    motorApplicationId: row.motorApplicationId,

    literalName: row.literalName,

    displayName: row.displayName ?? undefined,

    operationType: row.operationType ?? undefined,

    estimatedHours: row.estimatedHours,

    positionQualifier: row.positionQualifier ?? undefined,

    motorSystemId: row.motorSystemId,

    motorGroupId: row.motorGroupId,

    motorSubGroupId: row.motorSubGroupId,

    nodeKey: row.nodeKey ?? undefined,

  };

}



async function getReferenceLaborOperations(

  vehicle: LaborServiceVehicle,

  motorSubGroupId: number,

  categoryPath?: string,

): Promise<LaborGridRow[]> {

  const keys = vehicleKeysForLookup(vehicle);

  const rows = await prisma.laborOperation.findMany({

    where: {

      motorSubGroupId,

      vehicleKey: { in: keys },

    },

    orderBy: [{ hitCount: "desc" }, { refreshedAt: "desc" }],

    take: 50,

    select: {

      id: true,

      jobName: true,

      laborHoursPerUnit: true,

      unitsOnVehicle: true,

      unitLabel: true,

      laborOperations: true,

      notes: true,

      dataSource: true,

      queryText: true,

      vehicleKey: true,

      vehicleYear: true,

      vehicleMake: true,

      vehicleModel: true,

      vehicleTrim: true,

      vehicleEngine: true,

      vehicleVin: true,

    },

  });



  const matched = rows.filter((row) => {
    if (!storedRowMatchesVehicle(row, vehicle)) return false;
    // Hide sandbox/MOTOR-sourced cache while sandbox overlay is off.
    if (!allowSandboxMotorDbCache()) {
      const ds = (row.dataSource ?? "").toLowerCase();
      if (ds === "motor_ewt" || ds.startsWith("motor")) return false;
    }
    return true;
  });

  return laborOperationsToReferenceGridRows(matched, categoryPath);

}



/** Grid rows for a SubGroup — licensed MOTOR apps, reference cache, or dev sandbox. */

export async function getLaborBookMotorApplications(

  vehicleId: string,

  baseVehicleId: number,

  motorSubGroupId: number,

  autoSyncIfEmpty = true,

): Promise<LaborBookMotorApplicationsResult> {

  const loaded = await loadVehicle(vehicleId);

  if (!loaded) return { ok: false, error: "Vehicle not found." };



  const denied = await gates.estimateView(loaded.shopId);

  if (denied) return { ok: false, error: denied.error };

  const motorOn = await motorEnabledForShop(loaded.shopId);

  const laborVehicle = toLaborServiceVehicle(loaded.vehicle);

  try {

    if (isReferenceTaxonomyMode()) {

      // MOTOR is the primary source: when the sandbox overlay is on, serve MOTOR
      // (BOOK) applications first and only fall back to shop cache when MOTOR misses.
      if (motorOn && allowSandboxMotorDbCache() && baseVehicleId) {

        let apps = await getMotorApplicationsForSubGroup(baseVehicleId, motorSubGroupId);

        // Only hit the live MOTOR API to backfill when keys exist; offline sandbox
        // serves whatever was loaded via `npm run db:load-motor-sandbox`.
        if (!apps.length && autoSyncIfEmpty && isMotorLaborEnabled()) {

          await syncMotorApplicationsForVehicle({

            baseVehicleId,

            subGroupId: motorSubGroupId,

            vehicle: laborVehicle,

            persist: true,

            ensureTaxonomy: false,

          });

          apps = await getMotorApplicationsForSubGroup(baseVehicleId, motorSubGroupId);

        }

        if (apps.length) {

          const dtos = apps.map(toApplicationDto);

          return { ok: true, rows: motorApplicationsToGridRows(dtos) };

        }

      }

      // MOTOR miss (or overlay off) → shop cache / canned rows for this component.
      const cacheRows = await getReferenceLaborOperations(laborVehicle, motorSubGroupId);

      if (cacheRows.length) return { ok: true, rows: cacheRows };

      return { ok: true, rows: [] };

    }



    if (!motorOn) {
      const cacheRows = await getReferenceLaborOperations(laborVehicle, motorSubGroupId);
      if (cacheRows.length) return { ok: true, rows: cacheRows };
      return { ok: true, rows: [] };
    }

    let apps = await getMotorApplicationsForSubGroup(baseVehicleId, motorSubGroupId);



    if (!apps.length && autoSyncIfEmpty && process.env.NODE_ENV === "development") {

      await syncMotorApplicationsForVehicle({

        baseVehicleId,

        subGroupId: motorSubGroupId,

        vehicle: laborVehicle,

        persist: true,

        ensureTaxonomy: false,

      });

      apps = await getMotorApplicationsForSubGroup(baseVehicleId, motorSubGroupId);

    }



    const dtos = apps.map(toApplicationDto);

    return { ok: true, rows: motorApplicationsToGridRows(dtos) };

  } catch (e) {

    return {

      ok: false,

      error: e instanceof Error ? e.message : "Failed to load labor applications.",

    };

  }

}



/** On Labor Book open: resolve mode and build sidebar tree. */

export async function getLaborBookMotorInit(vehicleId: string): Promise<LaborBookMotorInitResult> {

  const loaded = await loadVehicle(vehicleId);

  if (!loaded) return { ok: false, error: "Vehicle not found." };



  const denied = await gates.estimateView(loaded.shopId);

  if (denied) return { ok: false, error: denied.error };



  const oemPrimary = await oemLaborPrimaryForShop(loaded.shopId);

  try {
    const motorOn = await motorEnabledForShop(loaded.shopId);
    const baseVehicleId = await resolveMotorBaseVehicleId(toLaborServiceVehicle(loaded.vehicle));

    // Pro/Elite: OEM automation primary — reference taxonomy + OEM chrome (not MOTOR-first).
    if (oemPrimary) {
      return oemPrimaryLaborInit(
        baseVehicleId,
        motorOn && motorCatalogDataAvailable(),
      );
    }

    // Core shops and shops without MOTOR entitlement use the shop reference guide.
    if (!motorCatalogDataAvailable() || !motorOn) {
      return referenceTaxonomyInit(null);
    }



    if (!baseVehicleId) {

      return shopLibraryInit(null);

    }



    const { ready, nodeCount, applicationCount } =

      await countMotorCatalogForVehicle(baseVehicleId);



    if (!ready || nodeCount === 0) {

      return referenceTaxonomyInit(baseVehicleId);

    }



    const tree = await getMotorCatalogTree(baseVehicleId);

    const syncBanner =

      applicationCount === 0

        ? isMotorLaborEnabled()

          ? `MOTOR catalog loaded but no labor applications synced. Run: npm run sync:motor-applications -- --baseVehicleId=${baseVehicleId}`

          : `MOTOR taxonomy loaded (sandbox). Load test applications: npm run db:load-motor-sandbox`

        : undefined;



    return {

      ok: true,

      baseVehicleId,

      source: "motor",

      // MOTOR catalog browse — fallback lane when OEM primary is off (legacy Pro path).

      catalogMode: "licensed",

      oemLaborPrimary: false,

      motorAvailable: true,

      aiEnabled: isLaborAiEnabled(),

      tree: mapMotorTreeToSidebar(tree),

      syncBanner,

    };

  } catch (e) {

    if (process.env.NODE_ENV === "development") {

      console.warn("[LaborBook] MOTOR init failed; falling back to reference taxonomy.", e);

    }

    if (oemPrimary) {
      return oemPrimaryLaborInit(null, motorCatalogDataAvailable());
    }

    return referenceTaxonomyInit(null);

  }

}


