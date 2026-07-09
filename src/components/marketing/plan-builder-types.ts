import type { EntitlementKind } from "@/generated/prisma";
import type { ProgramServiceType } from "@/lib/maintenance-programs";
import {
  programServiceToEntitlement,
  serviceTypeToKind,
  type MaintenancePlanInput,
} from "@/lib/maintenance-programs";
import type { PresetMaintenanceService } from "@/lib/preset-maintenance-services";

export type PlanCanvasItem = {
  clientId: string;
  programServiceId?: string;
  cannedJobId?: string;
  presetId?: string;
  kind: EntitlementKind;
  label: string;
  description?: string;
  quantity: number | null;
  intervalDays: number | null;
  intervalMiles?: number | null;
  discountBps?: number | null;
  discountCapCents?: number | null;
  sortOrder: number;
};

export type LibraryDragData =
  | { source: "program-service"; serviceId: string }
  | { source: "preset"; presetId: string }
  | { source: "canned-job"; cannedJobId: string; name: string };

export function newClientId(): string {
  return `svc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function canvasItemFromProgramService(service: {
  id: string;
  name: string;
  description?: string | null;
  cannedJobId?: string | null;
  serviceType: ProgramServiceType;
  defaultQuantity: number | null;
  defaultIntervalDays: number | null;
  defaultDiscountBps: number | null;
}): PlanCanvasItem {
  const ent = programServiceToEntitlement({
    id: service.id,
    name: service.name,
    cannedJobId: service.cannedJobId,
    serviceType: service.serviceType,
    defaultQuantity: service.defaultQuantity,
    defaultIntervalDays: service.defaultIntervalDays,
    defaultDiscountBps: service.defaultDiscountBps,
  });
  return {
    clientId: newClientId(),
    programServiceId: service.id,
    cannedJobId: service.cannedJobId ?? undefined,
    kind: ent.kind,
    label: ent.label,
    description: service.description ?? undefined,
    quantity: ent.quantity ?? null,
    intervalDays: ent.intervalDays ?? null,
    discountBps: ent.discountBps ?? null,
    sortOrder: 0,
  };
}

export function canvasItemFromPreset(preset: PresetMaintenanceService): PlanCanvasItem {
  const kind = serviceTypeToKind(preset.serviceType);
  return {
    clientId: newClientId(),
    presetId: preset.id,
    kind,
    label: preset.name,
    description: preset.description,
    quantity:
      kind === "COUNTED" || kind === "COUPON" || kind === "ACCESS"
        ? preset.defaultQuantity
        : null,
    intervalDays:
      kind === "INTERVAL" || kind === "UNLIMITED" ? preset.defaultIntervalDays : null,
    intervalMiles: preset.intervalMiles,
    discountBps: kind === "DISCOUNT" ? 1000 : null,
    sortOrder: 0,
  };
}

export function canvasItemFromCannedJob(job: {
  id: string;
  name: string;
  description?: string | null;
}): PlanCanvasItem {
  return {
    clientId: newClientId(),
    cannedJobId: job.id,
    kind: "COUNTED",
    label: job.name,
    description: job.description ?? undefined,
    quantity: 1,
    intervalDays: 180,
    intervalMiles: 5000,
    sortOrder: 0,
  };
}

export function canvasItemFromCustom(input: {
  label: string;
  description?: string;
  kind: EntitlementKind;
  quantity?: number | null;
  intervalDays?: number | null;
  cannedJobId?: string;
}): PlanCanvasItem {
  return {
    clientId: newClientId(),
    cannedJobId: input.cannedJobId,
    kind: input.kind,
    label: input.label,
    description: input.description,
    quantity: input.quantity ?? null,
    intervalDays: input.intervalDays ?? null,
    sortOrder: 0,
  };
}

export function canvasItemsToEntitlements(
  items: PlanCanvasItem[] | null | undefined,
): MaintenancePlanInput["entitlements"] {
  return (Array.isArray(items) ? items : []).map((item, i) => ({
    programServiceId: item.programServiceId,
    cannedJobId: item.cannedJobId,
    kind: item.kind,
    label: item.label,
    quantity: item.quantity,
    intervalDays: item.intervalDays,
    discountBps: item.discountBps ?? null,
    discountCapCents: item.discountCapCents ?? null,
    sortOrder: i,
  }));
}

export function entitlementsToCanvasItems(
  entitlements: {
    programServiceId?: string | null;
    cannedJobId?: string | null;
    kind: EntitlementKind;
    label: string;
    quantity?: number | null;
    intervalDays?: number | null;
    discountBps?: number | null;
    discountCapCents?: number | null;
    sortOrder: number;
  }[],
): PlanCanvasItem[] {
  return (Array.isArray(entitlements) ? entitlements : [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((e) => ({
      clientId: newClientId(),
      programServiceId: e.programServiceId ?? undefined,
      cannedJobId: e.cannedJobId ?? undefined,
      kind: e.kind,
      label: e.label,
      quantity: e.quantity ?? null,
      intervalDays: e.intervalDays ?? null,
      discountBps: e.discountBps ?? null,
      discountCapCents: e.discountCapCents ?? null,
      sortOrder: e.sortOrder,
    }));
}

export function formatIntervalHint(item: PlanCanvasItem): string {
  const parts: string[] = [];
  if (item.intervalMiles && item.intervalMiles > 0) {
    parts.push(`${item.intervalMiles.toLocaleString()} mi`);
  }
  if (item.intervalDays) {
    const months = Math.round(item.intervalDays / 30);
    if (months >= 1) parts.push(`${months} mo`);
    else parts.push(`${item.intervalDays} days`);
  }
  if (item.quantity != null && item.kind === "COUNTED") {
    parts.unshift(`${item.quantity}× visit${item.quantity === 1 ? "" : "s"}`);
  }
  return parts.join(" · ") || "Per plan term";
}
