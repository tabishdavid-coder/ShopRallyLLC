// Client-safe line-item math for estimate edit mode (money in cents).

import { laborRate, partRetail, type LaborTier, type PartTier } from "@/lib/matrix";

export type LaborEditField = "hours" | "rate" | "total";
export type PartEditField = "qty" | "cost" | "retail" | "total";

export type EditableLaborLine = {
  hours: number;
  rateCents: number;
  totalCents?: number;
  lastField?: LaborEditField;
  useLaborMatrix?: boolean;
};

export type EditablePartLine = {
  quantity: number;
  costCents: number;
  retailCents: number;
  totalCents?: number;
  lastField?: PartEditField;
  usePartMatrix?: boolean;
};

export function laborLineTotal(l: EditableLaborLine): number {
  if (l.lastField === "total" && l.totalCents != null) return l.totalCents;
  return Math.round(l.hours * l.rateCents);
}

export function partLineTotal(p: EditablePartLine): number {
  if (p.lastField === "total" && p.totalCents != null) return p.totalCents;
  return p.retailCents * p.quantity;
}

export type LineWithDiscount = {
  discountCents?: number;
};

/** Gross amount before line discount. */
export function lineGrossCents(kind: "labor" | "part", row: EditableLaborLine | EditablePartLine): number {
  return kind === "labor"
    ? laborLineTotal(row as EditableLaborLine)
    : partLineTotal(row as EditablePartLine);
}

export function lineDiscountCents(row: LineWithDiscount, grossCents: number): number {
  const raw = row.discountCents ?? 0;
  return Math.max(0, Math.min(grossCents, Math.round(raw)));
}

export function lineNetCents(row: LineWithDiscount, grossCents: number): number {
  return Math.max(0, grossCents - lineDiscountCents(row, grossCents));
}

export function lineDiscountPct(discountCents: number, grossCents: number): number {
  if (grossCents <= 0) return 0;
  return Math.round((discountCents / grossCents) * 10000) / 100;
}

/** Apply a fixed $ discount; clamps to [0, gross]. */
export function patchLineDiscountDollars<T extends LineWithDiscount>(
  row: T,
  dollarsCents: number,
  grossCents: number,
): T {
  return {
    ...row,
    discountCents: Math.max(0, Math.min(grossCents, Math.round(dollarsCents))),
  };
}

/** Apply a % discount of gross (0–100). */
export function patchLineDiscountPercent<T extends LineWithDiscount>(
  row: T,
  percent: number,
  grossCents: number,
): T {
  const pct = Math.max(0, Math.min(100, percent));
  const dollars = Math.round((grossCents * pct) / 100);
  return patchLineDiscountDollars(row, dollars, grossCents);
}

/** Set net amount — back-calculates discount from gross. */
export function patchLineNet<T extends LineWithDiscount>(
  row: T,
  netCents: number,
  grossCents: number,
): T {
  const net = Math.max(0, Math.min(grossCents, Math.round(netCents)));
  return patchLineDiscountDollars(row, grossCents - net, grossCents);
}

export function patchLaborLine<T extends EditableLaborLine>(
  row: T,
  field: LaborEditField,
  raw: number,
  opts: { baseRateCents: number; laborTiers: LaborTier[] },
): T {
  const next = { ...row, lastField: field } as T;

  if (field === "hours") {
    next.hours = raw;
    if (next.useLaborMatrix && opts.laborTiers.length > 0) {
      next.rateCents = laborRate(opts.baseRateCents, raw, opts.laborTiers);
    }
    delete next.totalCents;
    return next;
  }

  if (field === "rate") {
    next.rateCents = raw;
    next.useLaborMatrix = false;
    delete next.totalCents;
    return next;
  }

  next.totalCents = raw;
  next.useLaborMatrix = false;
  if (next.hours > 0) next.rateCents = Math.round(raw / next.hours);
  return next;
}

export function patchPartLine<T extends EditablePartLine>(
  row: T,
  field: PartEditField,
  raw: number,
  partTiers: PartTier[],
): T {
  const next = { ...row, lastField: field } as T;

  if (field === "qty") {
    next.quantity = raw;
    delete next.totalCents;
    return next;
  }

  if (field === "cost") {
    next.costCents = raw;
    if (next.usePartMatrix && partTiers.length > 0) {
      next.retailCents = partRetail(raw, partTiers);
    }
    delete next.totalCents;
    return next;
  }

  if (field === "retail") {
    next.retailCents = raw;
    next.usePartMatrix = false;
    delete next.totalCents;
    return next;
  }

  next.totalCents = raw;
  next.usePartMatrix = false;
  if (next.quantity > 0) next.retailCents = Math.round(raw / next.quantity);
  return next;
}

export function applyLaborMatrixRow<T extends EditableLaborLine>(
  row: T,
  baseRateCents: number,
  laborTiers: LaborTier[],
): T {
  return {
    ...row,
    useLaborMatrix: true,
    rateCents: laborRate(baseRateCents, row.hours, laborTiers),
    lastField: "rate",
    totalCents: undefined,
  };
}

export function applyPartMatrixRow<T extends EditablePartLine>(row: T, partTiers: PartTier[]): T {
  return {
    ...row,
    usePartMatrix: true,
    retailCents: partRetail(row.costCents, partTiers),
    lastField: "retail",
    totalCents: undefined,
  };
}

/** True when saved rate matches the shop labor matrix for these hours. */
export function isLaborMatrixApplied(
  l: Pick<EditableLaborLine, "hours" | "rateCents">,
  baseRateCents: number,
  laborTiers: LaborTier[],
): boolean {
  if (laborTiers.length === 0) return false;
  return l.rateCents === laborRate(baseRateCents, l.hours, laborTiers);
}

/** True when saved retail matches the shop parts matrix for this cost. */
export function isPartMatrixApplied(
  p: Pick<EditablePartLine, "costCents" | "retailCents">,
  partTiers: PartTier[],
): boolean {
  if (partTiers.length === 0) return false;
  return p.retailCents === partRetail(p.costCents, partTiers);
}

/** Infer matrix vs manual from persisted cents (matrix default when tiers exist). */
export function inferLaborMatrixMode(
  l: Pick<EditableLaborLine, "hours" | "rateCents">,
  baseRateCents: number,
  laborTiers: LaborTier[],
): boolean {
  if (laborTiers.length === 0) return false;
  if (l.hours === 0 && l.rateCents === baseRateCents) return true;
  return isLaborMatrixApplied(l, baseRateCents, laborTiers);
}

export function inferPartMatrixMode(
  p: Pick<EditablePartLine, "costCents" | "retailCents">,
  partTiers: PartTier[],
): boolean {
  if (partTiers.length === 0) return false;
  if (p.costCents === 0 && p.retailCents === 0) return true;
  return isPartMatrixApplied(p, partTiers);
}
