import type { Prisma } from "@/generated/prisma";
import { customerDisplayName } from "@/lib/format";
import { activeCustomerWhere } from "@/lib/data-compliance";
import { digitsOf, phoneMatchKey } from "@/lib/phone";

/** Shared Prisma filter for customer type-ahead and list search (shop-scoped). */
export function customerSearchWhere(
  shopId: string,
  q: string,
): Prisma.CustomerWhereInput {
  const term = q.trim();
  const termUpper = term.toUpperCase();
  const termDigits = digitsOf(term);
  const phoneKey = phoneMatchKey(term);

  const or: Prisma.CustomerWhereInput[] = [
    { firstName: { contains: term, mode: "insensitive" } },
    { lastName: { contains: term, mode: "insensitive" } },
    { company: { contains: term, mode: "insensitive" } },
    { email: { contains: term, mode: "insensitive" } },
    // Fallback when phoneDigits was never backfilled.
    { phone: { contains: term, mode: "insensitive" } },
    { altPhone: { contains: term, mode: "insensitive" } },
  ];

  if (termDigits.length >= 2) {
    or.push({ phoneDigits: { contains: termDigits } });
    if (phoneKey.length >= 4 && phoneKey !== termDigits) {
      or.push({ phoneDigits: { contains: phoneKey } });
    }
  }

  // Multi-word name: "John Smith" matches first+last in either order.
  const parts = term.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const [a, b] = parts;
    or.push({
      AND: [
        {
          OR: [
            { firstName: { contains: a, mode: "insensitive" } },
            { lastName: { contains: a, mode: "insensitive" } },
          ],
        },
        {
          OR: [
            { firstName: { contains: b, mode: "insensitive" } },
            { lastName: { contains: b, mode: "insensitive" } },
          ],
        },
      ],
    });
  }

  or.push({
    vehicles: {
      some: {
        shopId,
        OR: [
          { plate: { contains: term, mode: "insensitive" } },
          { vin: { contains: termUpper, mode: "insensitive" } },
        ],
      },
    },
  });

  return { ...activeCustomerWhere(shopId), OR: or };
}

export type CustomerSearchRow = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  roCount: number;
  lastVisitAt: Date | string | null;
  vehicleHint: string | null;
};

function asDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Rank for type-ahead: exact name → returning w/ history → everyone else. */
export function rankCustomerSearchResult(
  c: CustomerSearchRow,
  term: string,
): number {
  const t = term.trim().toLowerCase();
  if (!t) return 0;

  const display = customerDisplayName(c).toLowerCase();
  const fullName = `${c.lastName} ${c.firstName}`.trim().toLowerCase();
  const reverseName = `${c.firstName} ${c.lastName}`.trim().toLowerCase();

  let score = 0;

  if (display === t || fullName === t || reverseName === t) score += 10_000;
  else if (display.startsWith(t) || fullName.startsWith(t) || reverseName.startsWith(t)) {
    score += 5_000;
  } else if (
    c.firstName.toLowerCase() === t ||
    c.lastName.toLowerCase() === t ||
    (c.company?.trim().toLowerCase() ?? "") === t
  ) {
    score += 4_000;
  } else if (
    display.includes(t) ||
    fullName.includes(t) ||
    reverseName.includes(t) ||
    c.email?.toLowerCase().includes(t)
  ) {
    score += 2_000;
  }

  const termDigits = digitsOf(term);
  if (termDigits.length >= 2 && digitsOf(c.phone).includes(termDigits)) score += 1_500;

  if (c.roCount > 0) {
    score += 800 + Math.min(c.roCount, 99);
    const lastVisit = asDate(c.lastVisitAt);
    if (lastVisit) {
      score += lastVisit.getTime() / 1_000_000_000;
    }
  }

  return score;
}

export function sortCustomerSearchResults<T extends CustomerSearchRow>(
  rows: T[],
  term: string,
): T[] {
  return [...rows].sort((a, b) => {
    const diff = rankCustomerSearchResult(b, term) - rankCustomerSearchResult(a, term);
    if (diff !== 0) return diff;
    const nameA = customerDisplayName(a);
    const nameB = customerDisplayName(b);
    return nameA.localeCompare(nameB);
  });
}

/** Short label for last visit / RO count in search dropdowns. */
export function customerHistoryLabel(c: {
  roCount: number;
  lastVisitAt: Date | string | null;
}): string | null {
  if (c.roCount <= 0) return null;
  const roLabel = c.roCount === 1 ? "1 RO" : `${c.roCount} ROs`;
  const lastVisit = asDate(c.lastVisitAt);
  if (!lastVisit) return roLabel;
  const last = lastVisit.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Last visit: ${last} · ${roLabel}`;
}
