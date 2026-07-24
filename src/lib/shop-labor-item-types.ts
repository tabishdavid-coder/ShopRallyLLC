export type ShopLaborItemRow = {
  id: string;
  name: string;
  description: string | null;
  rateCents: number;
  defaultHours: number;
  costCents: number;
  taxable: boolean;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  updatedAt: Date;
};

/** Default price when applied (rate × default hours). */
export function shopLaborItemPriceCents(item: Pick<ShopLaborItemRow, "rateCents" | "defaultHours">): number {
  return Math.round(item.rateCents * item.defaultHours);
}

/** Map a catalog item to canned job labor line defaults. */
export function shopLaborItemToCannedLaborLine(
  item: ShopLaborItemRow,
  laborRateCents = 0,
): { description: string; hours: number; flatAmountCents: number | null } {
  const rateCents = item.rateCents > 0 ? item.rateCents : laborRateCents;

  // Flat catalog row (0 default hours, non-zero rate) — price is the flat amount.
  if (item.defaultHours <= 0 && rateCents > 0) {
    return {
      description: item.name,
      hours: 0,
      flatAmountCents: rateCents,
    };
  }

  const hours = item.defaultHours > 0 ? item.defaultHours : 1;
  const totalCents = Math.round(rateCents * hours);

  return {
    description: item.name,
    hours,
    flatAmountCents: totalCents > 0 ? totalCents : null,
  };
}
