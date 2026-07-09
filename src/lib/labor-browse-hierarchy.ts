/**
 * Browse step gating for Shop Library Miller columns.
 * Ensures position/operation picks complete before JOBS load — brakes by axle,
 * assemblies skip quantity steps, suspension drills position before results.
 */

import {
  positionFacetsForSubcategory,
  subcategoryNeedsOperationStep,
  subcategoryNeedsPositionStep,
  subcategoryUsesOperationFirst,
} from "@/lib/labor-nav-facets";
import { resolveSubcategoryId } from "@/lib/labor-categories";

export type BrowseStepId = "position" | "operation";

/** Whole-assembly jobs — one rack & pinion, water pump, etc. No 1/2/4 quantity drill. */
export const ASSEMBLY_ONLY_SUBCATEGORIES = new Set([
  "steering-rack",
  "steering-pump",
  "steering-column",
  "cooling-pump",
  "engine-internals",
  "trans-auto",
  "trans-manual",
  "trans-diff",
  "hvac-condenser",
  "hvac-evaporator",
  "hvac-heater-core",
  "electrical-starting",
  "fuel-delivery",
  "exhaust-pipes",
]);

export function subcategoryIsAssemblyOnly(subcategoryId: string): boolean {
  return ASSEMBLY_ONLY_SUBCATEGORIES.has(resolveSubcategoryId(subcategoryId));
}

/** Ordered mandatory Miller steps before the JOBS column may load. */
export function browseStepOrder(subcategoryId: string): BrowseStepId[] {
  if (subcategoryIsAssemblyOnly(subcategoryId)) return [];

  const needsPos = subcategoryNeedsPositionStep(subcategoryId);
  const needsOp = subcategoryNeedsOperationStep(subcategoryId);
  if (!needsPos && !needsOp) return [];

  const opFirst = subcategoryUsesOperationFirst(subcategoryId);
  if (!needsPos) return needsOp ? ["operation"] : [];
  if (!needsOp) return ["position"];
  return opFirst ? ["operation", "position"] : ["position", "operation"];
}

/** True when every required breadcrumb step has a selection. */
export function isBrowsePathComplete(
  subcategoryId: string | null | undefined,
  positionId: string | null | undefined,
  operationId: string | null | undefined,
): boolean {
  if (!subcategoryId) return false;
  if (subcategoryIsAssemblyOnly(subcategoryId)) return true;

  for (const step of browseStepOrder(subcategoryId)) {
    if (step === "position" && !positionId) return false;
    if (step === "operation" && !operationId) return false;
  }
  return true;
}

/** Next column the user must complete, or "jobs" when browse may load. */
export function nextBrowseStep(
  subcategoryId: string | null,
  positionId: string | null,
  operationId: string | null,
): BrowseStepId | "jobs" | null {
  if (!subcategoryId) return null;
  if (subcategoryIsAssemblyOnly(subcategoryId)) return "jobs";

  for (const step of browseStepOrder(subcategoryId)) {
    if (step === "position" && !positionId) return "position";
    if (step === "operation" && !operationId) return "operation";
  }
  return "jobs";
}

export function shouldShowPositionColumn(
  subcategoryId: string | null,
  positionId: string | null,
  operationId: string | null,
): boolean {
  if (!subcategoryId || subcategoryIsAssemblyOnly(subcategoryId)) return false;
  if (!subcategoryNeedsPositionStep(subcategoryId)) return false;

  const steps = browseStepOrder(subcategoryId);
  if (!steps.includes("position")) return false;

  const opFirst = subcategoryUsesOperationFirst(subcategoryId);
  if (opFirst && steps.includes("operation") && !operationId) return false;
  return true;
}

export function shouldShowOperationColumn(
  subcategoryId: string | null,
  positionId: string | null,
  operationId: string | null,
): boolean {
  if (!subcategoryId || subcategoryIsAssemblyOnly(subcategoryId)) return false;
  if (!subcategoryNeedsOperationStep(subcategoryId)) return false;

  const steps = browseStepOrder(subcategoryId);
  if (!steps.includes("operation")) return false;

  const opFirst = subcategoryUsesOperationFirst(subcategoryId);
  if (!opFirst && steps.includes("position") && !positionId) return false;
  return true;
}

/** Implicit position when subcategory has operations but no axle drill-down. */
export function implicitBrowsePositionId(subcategoryId: string): string | null {
  if (subcategoryNeedsPositionStep(subcategoryId)) return null;
  const positions = positionFacetsForSubcategory(subcategoryId);
  return positions[0]?.id ?? "all";
}

/** Whether selecting this subcategory should immediately fetch JOBS. */
export function shouldLoadOnSubcategorySelect(subcategoryId: string): boolean {
  if (subcategoryIsAssemblyOnly(subcategoryId)) return true;
  return browseStepOrder(subcategoryId).length === 0;
}

/** Whether a browse fetch should run for the current path (guards premature loads). */
export function shouldLoadBrowseResults(
  subcategoryId: string,
  positionId?: string | null,
  operationId?: string | null,
): boolean {
  const pos = positionId ?? implicitBrowsePositionId(subcategoryId);
  const op = operationId ?? null;
  return isBrowsePathComplete(subcategoryId, pos, op);
}
