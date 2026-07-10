export type CustomerNameOrder = "lastFirst" | "firstLast";

/**
 * Display a customer: company name when set, else person name.
 * Default order is Tekmetric-style "Last First"; pass `nameOrder: "firstLast"`
 * for "First Last" (e.g. job board cards).
 */
export function customerDisplayName(
  c: {
    firstName: string;
    lastName: string;
    company?: string | null;
  },
  opts?: { nameOrder?: CustomerNameOrder },
): string {
  if (c.company?.trim()) return c.company.trim();
  const name =
    opts?.nameOrder === "firstLast"
      ? `${c.firstName} ${c.lastName}`.trim()
      : `${c.lastName} ${c.firstName}`.trim();
  return name || "—";
}

/** Initials for an avatar, from the same "last first" ordering. */
export function customerInitials(c: {
  firstName: string;
  lastName: string;
}): string {
  const a = c.lastName?.[0] ?? "";
  const b = c.firstName?.[0] ?? "";
  return (a + b).toUpperCase() || "—";
}

/** Format integer cents as USD. */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
