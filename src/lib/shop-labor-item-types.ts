export type ShopLaborItemRow = {
  id: string;
  name: string;
  description: string | null;
  rateCents: number;
  defaultHours: number;
  costCents: number;
  taxable: boolean;
  isActive: boolean;
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
): { description: string; hours: number; flatAmountCents: number | null } {
  const price = shopLaborItemPriceCents(item);
  return {
    description: item.name,
    hours: item.defaultHours,
    flatAmountCents: price > 0 ? price : null,
  };
}
