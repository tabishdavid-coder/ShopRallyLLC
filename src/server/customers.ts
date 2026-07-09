import "server-only";

import { prisma } from "@/db/client";
import { activeCustomerWhere } from "@/lib/data-compliance";
import { customerSearchWhere } from "@/lib/customer-search";
import type { Prisma } from "@/generated/prisma";

export type CustomerRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  tags: string[];
  company: string | null;
};

export type CustomerListResult = {
  rows: CustomerRow[];
  total: number;
  page: number;
  perPage: number;
};

/**
 * Paginated, searchable customer list for a shop. Sorted by last name then first
 * Sort key: last name first for shop directory display.
 */
export async function getCustomers(opts: {
  shopId: string;
  q?: string;
  page?: number;
  perPage?: number;
}): Promise<CustomerListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = opts.perPage ?? 10;
  const q = opts.q?.trim();

  const where: Prisma.CustomerWhereInput = q
    ? customerSearchWhere(opts.shopId, q)
    : activeCustomerWhere(opts.shopId);

  const [total, rows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        tags: true,
        company: true,
      },
    }),
  ]);

  return { rows, total, page, perPage };
}
