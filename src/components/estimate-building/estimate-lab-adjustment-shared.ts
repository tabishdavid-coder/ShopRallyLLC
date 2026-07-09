export type AdjustMethod = "PERCENT" | "FIXED";
export type AdjustBase = "LABOR" | "PARTS" | "LABOR_PARTS";

export type AdjustmentLine = {
  id: string;
  name: string;
  method: AdjustMethod;
  base: AdjustBase;
  amount: number;
  capCents?: number | null;
  taxable?: boolean;
  sortOrder?: number;
};

export type AdjustTemplate = {
  name: string;
  method: AdjustMethod;
  base: AdjustBase;
  amount: number;
  capCents?: number | null;
  taxable?: boolean;
};

export function calcAdjustmentTotal(
  a: Pick<AdjustmentLine, "method" | "base" | "amount" | "capCents">,
  laborCents: number,
  partsCents: number,
): number {
  const base = a.base === "LABOR" ? laborCents : a.base === "PARTS" ? partsCents : laborCents + partsCents;
  let v = a.method === "PERCENT" ? Math.round((base * a.amount) / 10000) : a.amount;
  if (a.capCents != null) v = Math.min(v, a.capCents);
  return Math.max(0, v);
}

export function amountDisplay(a: Pick<AdjustmentLine, "method" | "amount">): string {
  return a.method === "PERCENT" ? String(a.amount / 100) : (a.amount / 100).toFixed(2);
}

export function parseAmountInput(s: string): number | null {
  const t = s.trim();
  if (t === "" || t === "." || t === "-") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
