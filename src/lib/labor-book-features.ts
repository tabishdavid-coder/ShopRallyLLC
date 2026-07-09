/**
 * Labor Book UI variant — production uses Classic Miller columns only.
 * ProDemand+Tekmetric (v5) explorer remains in dev mock pages, not the RO dialog.
 */

/** @deprecated Production Labor Book is classic-only; always returns false. */
export function isLaborBookV5Default(): boolean {
  return false;
}

/** @deprecated Use isLaborBookV5Default */
export function isLaborBookV4Default(): boolean {
  return false;
}
