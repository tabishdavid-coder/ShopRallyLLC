import "server-only";

import { prisma } from "@/db/client";

export type PlatformCustomerRow = {
  id: string;
  shopId: string;
  shopName: string;
  shopCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  leadSource: string | null;
  repairOrderCount: number;
  vehicleCount: number;
  createdAt: Date;
};

export type PlatformCustomerList = {
  rows: PlatformCustomerRow[];
  total: number;
};

export async function listPlatformCustomers(options?: {
  search?: string;
  shopId?: string;
  limit?: number;
  offset?: number;
}): Promise<PlatformCustomerList> {
  const limit = Math.min(options?.limit ?? 50, 100);
  const offset = options?.offset ?? 0;
  const search = options?.search?.trim();

  const where = {
    ...(options?.shopId ? { shopId: options.shopId } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { phoneDigits: { contains: search.replace(/\D/g, "") } },
            { shop: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        shopId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        leadSource: true,
        createdAt: true,
        shop: { select: { name: true, code: true } },
        _count: { select: { repairOrders: true, vehicles: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      shopId: r.shopId,
      shopName: r.shop.name,
      shopCode: r.shop.code,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      leadSource: r.leadSource,
      repairOrderCount: r._count.repairOrders,
      vehicleCount: r._count.vehicles,
      createdAt: r.createdAt,
    })),
  };
}
