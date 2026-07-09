import {
  QuickLaborVehicleSchema,
  quickLaborVehicleLabel,
  type QuickLaborVehicle,
} from "@/lib/quick-labor";

const STORAGE_KEY = "karvio-quick-labor-ro-prefill";

export type QuickLaborRoPrefill = {
  vehicle: QuickLaborVehicle;
  concern?: string;
};

export function isQuickLaborVehicleIdentified(v: QuickLaborVehicle): boolean {
  return QuickLaborVehicleSchema.safeParse(v).success;
}

export function storeQuickLaborRoPrefill(prefill: QuickLaborRoPrefill): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefill));
}

export function readQuickLaborRoPrefill(): QuickLaborRoPrefill | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuickLaborRoPrefill;
    if (!parsed?.vehicle || !isQuickLaborVehicleIdentified(parsed.vehicle)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearQuickLaborRoPrefill(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function quickLaborVehicleLookupKey(v: QuickLaborVehicle): string {
  if (v.vin?.trim()) return v.vin.trim().toUpperCase();
  if (v.plate?.trim()) return v.plate.trim().toUpperCase();
  return "";
}

export function quickLaborVehicleDetailLine(v: QuickLaborVehicle): string {
  const parts: string[] = [];
  if (v.vin?.trim()) parts.push(`VIN …${v.vin.trim().slice(-6)}`);
  if (v.plate?.trim()) {
    parts.push([v.plate.trim(), v.plateState?.trim()].filter(Boolean).join(" "));
  }
  return parts.join(" · ");
}

export function buildServiceTicketFromQuickLabor(
  vehicle: QuickLaborVehicle,
  concern?: string,
): { ok: true; href: string } | { ok: false; error: string } {
  if (!isQuickLaborVehicleIdentified(vehicle)) {
    return {
      ok: false,
      error: `Identify the vehicle (${quickLaborVehicleLabel(vehicle) || "year, make, model, or VIN"}) before building a repair order.`,
    };
  }
  storeQuickLaborRoPrefill({ vehicle, concern });
  return { ok: true, href: "/repair-orders/new?from=quick-labor" };
}
