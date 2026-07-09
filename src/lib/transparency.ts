// Client-safe types/defaults for Settings → Estimates/Invoices → Transparency.
// Controls which line-item fields are shown on the printed estimate vs invoice.

export type DocTransparency = {
  laborHours: boolean; // show labor hours on labor rows
  partNumbers: boolean; // show part numbers on part rows
  partBrand: boolean; // show part brand on part rows
  lineItemPrices: boolean; // show per-line prices (off = lump-sum job total only)
};

export type Transparency = {
  estimate: DocTransparency;
  invoice: DocTransparency;
};

const FULL: DocTransparency = { laborHours: true, partNumbers: true, partBrand: true, lineItemPrices: true };

export const TRANSPARENCY_DEFAULTS: Transparency = {
  estimate: { ...FULL },
  invoice: { ...FULL },
};

export const TRANSPARENCY_FIELDS: { key: keyof DocTransparency; label: string }[] = [
  { key: "laborHours", label: "Labor hours" },
  { key: "partNumbers", label: "Part numbers" },
  { key: "partBrand", label: "Part brand" },
  { key: "lineItemPrices", label: "Itemized line prices" },
];

/** Merge a stored (possibly partial) value over defaults. */
export function resolveTransparency(raw: unknown): Transparency {
  const r = (raw ?? {}) as Partial<Transparency>;
  return {
    estimate: { ...TRANSPARENCY_DEFAULTS.estimate, ...(r.estimate ?? {}) },
    invoice: { ...TRANSPARENCY_DEFAULTS.invoice, ...(r.invoice ?? {}) },
  };
}
