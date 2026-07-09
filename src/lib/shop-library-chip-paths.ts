/**
 * Quick-pick chip → Miller column browse path.
 * Used by Shop Library (SmartLaborGuide) and Quick Labor panel.
 */

export type ShopLibraryBrowsePath = {
  categoryId: string;
  subcategoryId: string;
  positionId?: string;
  operationId?: string;
};

export type ShopLibraryChip = {
  label: string;
  /** Fallback text search when browse path is not used. */
  query: string;
  /** When set, chip selects Miller columns instead of typing into search. */
  browsePath?: ShopLibraryBrowsePath;
};

export const SHOP_LIBRARY_CHIPS: ShopLibraryChip[] = [
  {
    label: "Front brakes",
    query: "front brake pads",
    browsePath: {
      categoryId: "motor-s-2",
      subcategoryId: "motor-sg-44",
      positionId: "front",
      operationId: "pads-rr",
    },
  },
  {
    label: "Rear brakes",
    query: "rear brake pads",
    browsePath: {
      categoryId: "motor-s-2",
      subcategoryId: "motor-sg-44",
      positionId: "rear",
      operationId: "pads-rr",
    },
  },
  {
    label: "Struts",
    query: "front strut",
    browsePath: {
      categoryId: "motor-s-6",
      subcategoryId: "motor-sg-81",
      operationId: "strut-rr",
      positionId: "front",
    },
  },
];

/** Resolve chip by label or query string (case-insensitive). */
export function shopLibraryChipByQuery(query: string): ShopLibraryChip | undefined {
  const needle = query.trim().toLowerCase();
  return SHOP_LIBRARY_CHIPS.find(
    (c) => c.query.toLowerCase() === needle || c.label.toLowerCase() === needle,
  );
}
