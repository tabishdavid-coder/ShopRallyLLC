/** Display a customer: company name for businesses, else "LastName FirstName". */
export function customerDisplayName(c: {
  firstName: string;
  lastName: string;
  company?: string | null;
}): string {
  if (c.company?.trim()) return c.company.trim();
  const name = `${c.lastName} ${c.firstName}`.trim();
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
