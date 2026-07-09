/** Shared RO money rollup — mirrors `recomputeRoTotals` for client-side live updates. */

export type RoTotalsJob = {
  id: string;
  laborTaxable: boolean;
  partsTaxable: boolean;
  laborLines: { totalCents: number; authorized: boolean }[];
  partLines: { totalCents: number; authorized: boolean }[];
};

export type RoTotalsFee = {
  jobId: string | null;
  method: "PERCENT" | "FIXED";
  base: "LABOR" | "PARTS" | "LABOR_PARTS";
  amount: number;
  capCents?: number | null;
  taxable?: boolean;
};

export type RoTotalsDiscount = {
  jobId: string | null;
  method: "PERCENT" | "FIXED";
  base: "LABOR" | "PARTS" | "LABOR_PARTS";
  amount: number;
};

export type RoTotalsInput = {
  shopSuppliesCents?: number;
  taxRateBps: number;
  taxOnLabor: boolean;
  taxOnParts: boolean;
  taxOnFees: boolean;
  taxCapCents?: number | null;
  jobs: RoTotalsJob[];
  fees: RoTotalsFee[];
  discounts: RoTotalsDiscount[];
};

function adjustmentValue(
  adj: { method: "PERCENT" | "FIXED"; base: "LABOR" | "PARTS" | "LABOR_PARTS"; amount: number; capCents?: number | null },
  laborCents: number,
  partsCents: number,
): number {
  const base =
    adj.base === "LABOR" ? laborCents : adj.base === "PARTS" ? partsCents : laborCents + partsCents;
  let v = adj.method === "PERCENT" ? Math.round((base * adj.amount) / 10000) : adj.amount;
  if (adj.capCents != null) v = Math.min(v, adj.capCents);
  return Math.max(0, v);
}

export type RoTotalsResult = {
  laborCents: number;
  partsCents: number;
  partsCount: number;
  feesCents: number;
  discountsCents: number;
  subtotalCents: number;
  taxesCents: number;
  totalCents: number;
  gpCents: number;
  gpPct: number;
};

/** Sum authorized lines only, then apply fees/discounts/tax like the server.
 *  `partsCostCents` / `laborCostCents` are shop costs for GP (not customer price). */
export function computeRoTotals(
  input: RoTotalsInput,
  partsCostCents = 0,
  laborCostCents = 0,
): RoTotalsResult {
  let labor = 0;
  let parts = 0;
  let taxableLabor = 0;
  let taxableParts = 0;
  let partsCount = 0;
  const jobBase = new Map<string, { labor: number; parts: number }>();

  for (const j of input.jobs) {
    const jl = j.laborLines.filter((l) => l.authorized).reduce((x, l) => x + l.totalCents, 0);
    const jp = j.partLines.filter((p) => p.authorized).reduce((x, p) => x + p.totalCents, 0);
    partsCount += j.partLines.filter((p) => p.authorized).length;
    labor += jl;
    parts += jp;
    if (j.laborTaxable) taxableLabor += jl;
    if (j.partsTaxable) taxableParts += jp;
    jobBase.set(j.id, { labor: jl, parts: jp });
  }

  const supplies = input.shopSuppliesCents ?? 0;
  const taxBps = input.taxRateBps;
  if (!input.taxOnLabor) taxableLabor = 0;
  if (!input.taxOnParts) taxableParts = 0;

  const baseFor = (jobId: string | null) => {
    const b = jobId ? jobBase.get(jobId) : null;
    return b ?? { labor, parts };
  };

  const discountTotal = Math.min(
    labor + parts,
    input.discounts.reduce((s, d) => {
      const b = baseFor(d.jobId);
      return s + adjustmentValue(d, b.labor, b.parts);
    }, 0),
  );

  let feesTotal = 0;
  let taxableFees = 0;
  for (const f of input.fees) {
    const b = baseFor(f.jobId);
    const v = adjustmentValue(f, b.labor, b.parts);
    feesTotal += v;
    if (input.taxOnFees && f.taxable) taxableFees += v;
  }

  const taxableBase = Math.max(0, taxableLabor + taxableParts - discountTotal) + supplies + taxableFees;
  let tax = Math.round((taxableBase * taxBps) / 10000);
  if (input.taxCapCents != null) tax = Math.min(tax, input.taxCapCents);

  const subtotal = labor + parts;
  const total = labor + parts + supplies - discountTotal + feesTotal + tax;
  const gpCents = labor - laborCostCents + (parts - partsCostCents);
  const gpPct = subtotal > 0 ? (gpCents / subtotal) * 100 : 0;

  return {
    laborCents: labor,
    partsCents: parts,
    partsCount,
    feesCents: feesTotal,
    discountsCents: discountTotal,
    subtotalCents: subtotal,
    taxesCents: tax,
    totalCents: total,
    gpCents,
    gpPct,
  };
}

/** Job checkbox state from its line authorizations. */
export function jobAuthState(job: {
  laborLines: { authorized: boolean }[];
  partLines: { authorized: boolean }[];
}): boolean | "indeterminate" {
  const lines = [...job.laborLines, ...job.partLines];
  if (!lines.length) return false;
  const on = lines.filter((l) => l.authorized).length;
  if (on === 0) return false;
  if (on === lines.length) return true;
  return "indeterminate";
}
