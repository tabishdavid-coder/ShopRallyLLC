"use server";

import { z } from "zod";

import type { WiringSystem } from "@/generated/prisma";
import { getShopId } from "@/lib/shop";
import { isWiringSystem } from "@/lib/wiring-systems";
import { canUseReleasedFeature, isReleased, releasedFeatureDenied } from "@/lib/subscription";
import { shopHasFeature } from "@/lib/plans";
import { prisma } from "@/db/client";
import {
  wiringDiagramService,
  type WiringAvailability,
  type WiringDiagramSummary,
} from "@/server/services/wiring-diagrams/wiring-diagram-service";
import { gates } from "@/server/permission-gates";

const wiringSystemSchema = z.string().refine(isWiringSystem, "Invalid wiring system.");

async function wiringGate(shopId: string): Promise<string | null> {
  const denied = await releasedFeatureDenied(shopId, "wiring_diagrams");
  return denied;
}

async function wiringEntitlements(shopId: string): Promise<{
  featureEnabled: boolean;
  releaseEnabled: boolean;
}> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { plan: true, planFeatures: true },
  });
  const featureEnabled = shop ? shopHasFeature(shop, "wiringDiagrams") : false;
  const releaseEnabled = await isReleased(shopId, "wiringDiagrams");
  return { featureEnabled, releaseEnabled };
}

export type WiringPanelState =
  | {
      ok: true;
      availability: WiringAvailability;
      diagrams: WiringDiagramSummary[];
    }
  | { ok: false; error: string };

/** Load wiring tab state — only when user opens the Wiring tab (never on estimate load). */
export async function getWiringDiagramPanelState(vehicleId: string): Promise<WiringPanelState> {
  if (!vehicleId?.trim()) return { ok: false, error: "Vehicle is required." };
  const shopId = await getShopId();
  const viewDenied = await gates.estimateView(shopId);
  if (viewDenied) return { ok: false, error: viewDenied.error };

  const gate = await wiringGate(shopId);
  if (gate) return { ok: false, error: gate };

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, shopId },
    select: { id: true },
  });
  if (!vehicle) return { ok: false, error: "Vehicle not found." };

  const ent = await wiringEntitlements(shopId);
  const availability = await wiringDiagramService.getAvailability(shopId, vehicleId, ent);
  const diagrams = await wiringDiagramService.list(shopId, vehicleId);

  return { ok: true, availability, diagrams };
}

export type WiringDownloadActionResult =
  | { ok: true; diagram: WiringDiagramSummary; jobId: string }
  | { ok: false; error: string; code?: string; jobId?: string };

/** Explicit user action — triggers OEM portal download + cache. */
export async function downloadWiringDiagramAction(
  vehicleId: string,
  wiringSystemRaw: string,
): Promise<WiringDownloadActionResult> {
  const parsed = wiringSystemSchema.safeParse(wiringSystemRaw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid system." };

  const wiringSystem = parsed.data as WiringSystem;
  const shopId = await getShopId();
  const editDenied = await gates.estimateEdit(shopId);
  if (editDenied) return { ok: false, error: editDenied.error };

  const gate = await wiringGate(shopId);
  if (gate) return { ok: false, error: gate };

  const entitled = await canUseReleasedFeature(shopId, "wiring_diagrams");
  if (!entitled) {
    return { ok: false, error: "Wiring diagrams are not available on this shop plan." };
  }

  return wiringDiagramService.download(shopId, vehicleId, wiringSystem);
}

export type WiringCheckResult =
  | { ok: true; cached: boolean; availability: WiringAvailability }
  | { ok: false; error: string };

/** Check cache + subscription for one system (lightweight). */
export async function checkWiringDiagramAvailability(
  vehicleId: string,
  wiringSystemRaw: string,
): Promise<WiringCheckResult> {
  const parsed = wiringSystemSchema.safeParse(wiringSystemRaw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid system." };

  const wiringSystem = parsed.data as WiringSystem;
  const shopId = await getShopId();
  const viewDenied = await gates.estimateView(shopId);
  if (viewDenied) return { ok: false, error: viewDenied.error };

  const gate = await wiringGate(shopId);
  if (gate) return { ok: false, error: gate };

  const ent = await wiringEntitlements(shopId);
  const availability = await wiringDiagramService.getAvailability(shopId, vehicleId, ent);
  const cached = availability.cachedSystems.includes(wiringSystem);

  return { ok: true, cached, availability };
}
