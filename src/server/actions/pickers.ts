"use server";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import {
  customerSearchWhere,
  sortCustomerSearchResults,
} from "@/lib/customer-search";
import type { CustomerPick, VehiclePick } from "@/lib/picker-types";
import { gates } from "@/server/permission-gates";

const SEARCH_POOL = 40;
const SEARCH_LIMIT = 12;

function vehicleHintFrom(
  vehicles: {
    year: number | null;
    make: string | null;
    model: string | null;
    plate: string | null;
    plateState: string | null;
  }[],
): string | null {
  const v = vehicles[0];
  if (!v) return null;
  const desc = [v.year, v.make, v.model].filter(Boolean).join(" ");
  const plate = v.plate
    ? `${v.plate}${v.plateState ? ` ${v.plateState}` : ""}`
    : null;
  if (desc && plate) return `${desc} · ${plate}`;
  return desc || plate;
}

/** Type-ahead search for customer pickers (Create RO, appointments, etc.). */
export async function searchCustomers(q: string): Promise<CustomerPick[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return [];

  const rows = await prisma.customer.findMany({
    where: customerSearchWhere(shopId, term),
    take: SEARCH_POOL,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      email: true,
      _count: { select: { repairOrders: true } },
      repairOrders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      vehicles: {
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: {
          year: true,
          make: true,
          model: true,
          plate: true,
          plateState: true,
        },
      },
    },
  });

  const mapped: CustomerPick[] = rows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    company: r.company,
    phone: r.phone,
    email: r.email,
    roCount: r._count.repairOrders,
    lastVisitAt: r.repairOrders[0]?.createdAt?.toISOString() ?? null,
    vehicleHint: vehicleHintFrom(r.vehicles),
  }));

  return sortCustomerSearchResults(mapped, term).slice(0, SEARCH_LIMIT);
}

/** Single customer for deep links (Create RO ?customerId=, etc.). */
export async function getCustomerPick(customerId: string): Promise<CustomerPick | null> {
  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return null;

  const row = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      email: true,
      _count: { select: { repairOrders: true } },
      repairOrders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      vehicles: {
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: {
          year: true,
          make: true,
          model: true,
          plate: true,
          plateState: true,
        },
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    company: row.company,
    phone: row.phone,
    email: row.email,
    roCount: row._count.repairOrders,
    lastVisitAt: row.repairOrders[0]?.createdAt?.toISOString() ?? null,
    vehicleHint: vehicleHintFrom(row.vehicles),
  };
}

/** Vehicles belonging to a customer (for the Create-RO vehicle picker). */
export async function getCustomerVehicles(
  customerId: string,
): Promise<VehiclePick[]> {
  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return [];

  return prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: {
      vehicles: {
        where: { shopId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          year: true,
          make: true,
          model: true,
          trim: true,
          engine: true,
          vin: true,
          plate: true,
          plateState: true,
        },
      },
    },
  }).then((c) => c?.vehicles ?? []);
}
