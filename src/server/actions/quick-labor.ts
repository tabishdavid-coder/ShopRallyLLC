"use server";

import {
  QuickLaborVehicleSchema,
  toLaborGuideVehicle,
  type QuickLaborVehicle,
} from "@/lib/quick-labor";
import { getShopId } from "@/lib/shop";
import {
  browseLaborGuideForVehicle,
  generateLaborSuggestionForVehicle,
  searchLaborGuideForVehicle,
  type GenerateResult,
  type SearchResult,
} from "@/server/actions/labor-guide";
import { gates } from "@/server/permission-gates";

function parseVehicle(raw: QuickLaborVehicle) {
  const parsed = QuickLaborVehicleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid vehicle." };
  }
  return { ok: true as const, vehicle: parsed.data };
}

export async function searchQuickLabor(
  vehicle: QuickLaborVehicle,
  query: string,
): Promise<SearchResult> {
  const parsed = parseVehicle(vehicle);
  if (!parsed.ok) return parsed;

  const shopId = await getShopId();
  const denied = await gates.estimateView(shopId);
  if (denied) return { ok: false, error: denied.error };

  return searchLaborGuideForVehicle(shopId, toLaborGuideVehicle(parsed.vehicle), query);
}

export async function browseQuickLabor(
  vehicle: QuickLaborVehicle,
  subcategoryId: string,
  positionId?: string | null,
  operationId?: string | null,
): Promise<SearchResult> {
  const parsed = parseVehicle(vehicle);
  if (!parsed.ok) return parsed;

  const shopId = await getShopId();
  const denied = await gates.estimateView(shopId);
  if (denied) return { ok: false, error: denied.error };

  return browseLaborGuideForVehicle(
    shopId,
    toLaborGuideVehicle(parsed.vehicle),
    subcategoryId,
    positionId,
    operationId,
  );
}

export async function generateQuickLabor(
  vehicle: QuickLaborVehicle,
  request: string,
): Promise<GenerateResult> {
  const parsed = parseVehicle(vehicle);
  if (!parsed.ok) return parsed;

  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  return generateLaborSuggestionForVehicle(toLaborGuideVehicle(parsed.vehicle), request, {
    shopId,
  });
}
