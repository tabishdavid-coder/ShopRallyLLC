// Client-safe types/defaults for Settings → Commissions.
// Default commission rates (basis points) applied to labor & parts gross profit.

export type CommissionBasis = "GROSS_PROFIT" | "SALE";

export type Commissions = {
  laborBps: number; // e.g. 1000 = 10%
  partsBps: number;
  basis: CommissionBasis;
};

export const COMMISSIONS_DEFAULTS: Commissions = {
  laborBps: 0,
  partsBps: 0,
  basis: "GROSS_PROFIT",
};

export function resolveCommissions(raw: unknown): Commissions {
  const r = (raw ?? {}) as Partial<Commissions>;
  return {
    laborBps: typeof r.laborBps === "number" ? r.laborBps : 0,
    partsBps: typeof r.partsBps === "number" ? r.partsBps : 0,
    basis: r.basis === "SALE" ? "SALE" : "GROSS_PROFIT",
  };
}
