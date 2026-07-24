import type { QuickLaborVehicle } from "@/lib/quick-labor";
import { isQuickLaborVehicleIdentified } from "@/lib/quick-labor-ro-prefill";
import type { LaborCartLine } from "@/lib/labor-guide-types";

/** Product name shown in CRM chrome — matches public/lab/tabish-friday-labor.html. */
export const TABISH_FRIDAY_LABOR_TITLE = "Tabish Friday Labor";

export const TABISH_FRIDAY_LABOR_HTML_PATH = "/lab/tabish-friday-labor.html";

/** postMessage envelope from the static lab iframe. */
export const TABISH_FRIDAY_LABOR_MSG = "shoprally:tabish-friday-labor" as const;

export type TabishFridayLaborCartItem = {
  id: string;
  key: string;
  name: string;
  hours: number;
  path?: string;
  pos?: string;
};

export type TabishFridayLaborAddPayload = {
  type: typeof TABISH_FRIDAY_LABOR_MSG;
  action: "add-lines";
  lines: TabishFridayLaborCartItem[];
  roId?: string | null;
};

export function tabishFridayLaborCartToGuideLines(
  items: TabishFridayLaborCartItem[],
): Omit<LaborCartLine, "key">[] {
  return items.map((item) => ({
    description: item.name.split("—")[0]?.trim() || item.name,
    variantLabel: item.pos && item.pos !== "ALL" ? item.pos : undefined,
    hours: item.hours,
    source: "catalog" as const,
    dataSource: item.path ?? "tabish_friday_labor",
  }));
}

export function buildTabishFridayLaborIframeSrc(
  vehicle: QuickLaborVehicle,
  opts?: { embedded?: boolean; roId?: string; shopId?: string },
): string {
  const params = new URLSearchParams();
  params.set("embedded", opts?.embedded === false ? "0" : "1");
  if (vehicle.vin) params.set("vin", vehicle.vin);
  if (vehicle.year != null) params.set("year", String(vehicle.year));
  if (vehicle.make) params.set("make", vehicle.make);
  if (vehicle.model) params.set("model", vehicle.model);
  if (vehicle.trim) params.set("trim", vehicle.trim);
  if (vehicle.engine) params.set("engine", vehicle.engine);
  if (vehicle.drivetrain) params.set("drivetrain", vehicle.drivetrain);
  if (vehicle.plate) params.set("plate", vehicle.plate);
  if (vehicle.plateState) params.set("plateState", vehicle.plateState);
  if (opts?.roId) params.set("roId", opts.roId);
  if (opts?.shopId) params.set("shopId", opts.shopId);
  return `${TABISH_FRIDAY_LABOR_HTML_PATH}?${params.toString()}`;
}

/** True when RO vehicle already has enough identity to skip the decode gate. */
export function vehicleReadyForTabishFriday(
  vehicle: QuickLaborVehicle | null | undefined,
): boolean {
  return Boolean(vehicle && isQuickLaborVehicleIdentified(vehicle));
}

export function roVehicleToQuickLaborVehicle(v: {
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  engine?: string | null;
  drivetrain?: string | null;
  plate?: string | null;
  plateState?: string | null;
} | null | undefined): QuickLaborVehicle | null {
  if (!v) return null;
  return {
    vin: v.vin ?? null,
    year: v.year ?? null,
    make: v.make ?? null,
    model: v.model ?? null,
    trim: v.trim ?? null,
    engine: v.engine ?? null,
    drivetrain: v.drivetrain ?? null,
    plate: v.plate ?? null,
    plateState: v.plateState ?? null,
  };
}

export function isTabishFridayLaborMessage(data: unknown): data is TabishFridayLaborAddPayload {
  if (!data || typeof data !== "object") return false;
  const msg = data as TabishFridayLaborAddPayload;
  return msg.type === TABISH_FRIDAY_LABOR_MSG && msg.action === "add-lines" && Array.isArray(msg.lines);
}
