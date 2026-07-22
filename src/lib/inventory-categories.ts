/** Standard part categories for inventory filter + add/edit forms. */
export const INVENTORY_CATEGORIES = [
  "Filters",
  "Brakes",
  "Fluids",
  "Electrical",
  "Engine",
  "Suspension",
  "Belts & Hoses",
  "Ignition",
  "Exhaust",
  "Other",
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

/**
 * Merge DB-discovered categories with the standard list (and optional active filter)
 * so the category Select always has a matching item for the current URL value.
 */
export function mergeInventoryCategories(
  fromDb: string[],
  activeFilter?: string | null,
): string[] {
  const set = new Set<string>();
  for (const c of INVENTORY_CATEGORIES) set.add(c);
  for (const c of fromDb) {
    const trimmed = c?.trim();
    if (trimmed) set.add(trimmed);
  }
  const active = activeFilter?.trim();
  if (active && active !== "all") set.add(active);
  return [...set].sort((a, b) => a.localeCompare(b));
}
