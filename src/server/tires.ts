import { prisma } from "@/db/client";
import type { TireOrderStatus } from "@/generated/prisma";
import { customerDisplayName } from "@/lib/format";
import { tireSizeLabel, vehicleLabel } from "@/lib/tires";

export type TireOrderRow = {
  id: string;
  number: number;
  status: TireOrderStatus;
  source: string;
  customerName: string;
  customerPhone: string | null;
  vehicleLabel: string;
  tireSize: string;
  tireBrand: string | null;
  depositCents: number;
  depositPaidAt: Date | null;
  appointmentStart: Date | null;
  createdAt: Date;
};

export type TireOrderDetail = TireOrderRow & {
  customerId: string;
  vehicleId: string | null;
  appointmentId: string | null;
  tireSizeFront: string | null;
  tireSizeRear: string | null;
  tireQuantity: number;
  tireType: string | null;
  dropOffType: string | null;
  estimatedTotalCents: number | null;
  depositMethod: string | null;
  depositReference: string | null;
  websiteSubmissionId: string | null;
  notes: string | null;
  supplierName: string | null;
  supplierOrderRef: string | null;
  supplierApprovedBy: string | null;
  supplierApprovedAt: Date | null;
  supplierQuoteCents: number | null;
  supplierRejectedAt: Date | null;
  supplierRejectionNote: string | null;
  updatedAt: Date;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
    phone: string | null;
    email: string | null;
  };
  vehicle: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
    vin: string | null;
    plate: string | null;
  } | null;
  appointment: {
    id: string;
    title: string;
    startAt: Date;
    endAt: Date;
    status: string;
    notes: string | null;
  } | null;
};

const listSelect = {
  id: true,
  number: true,
  status: true,
  source: true,
  tireSizeFront: true,
  tireSizeRear: true,
  tireBrand: true,
  depositCents: true,
  depositPaidAt: true,
  createdAt: true,
  customer: {
    select: {
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
    },
  },
  vehicle: {
    select: { year: true, make: true, model: true },
  },
  appointment: {
    select: { startAt: true },
  },
} as const;

function mapRow(row: {
  id: string;
  number: number;
  status: TireOrderStatus;
  source: string;
  tireSizeFront: string | null;
  tireSizeRear: string | null;
  tireBrand: string | null;
  depositCents: number;
  depositPaidAt: Date | null;
  createdAt: Date;
  customer: {
    firstName: string;
    lastName: string;
    company: string | null;
    phone: string | null;
  };
  vehicle: { year: number | null; make: string | null; model: string | null } | null;
  appointment: { startAt: Date } | null;
}): TireOrderRow {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    source: row.source,
    customerName: customerDisplayName(row.customer),
    customerPhone: row.customer.phone,
    vehicleLabel: vehicleLabel(row.vehicle),
    tireSize: tireSizeLabel(row.tireSizeFront, row.tireSizeRear),
    tireBrand: row.tireBrand,
    depositCents: row.depositCents,
    depositPaidAt: row.depositPaidAt,
    appointmentStart: row.appointment?.startAt ?? null,
    createdAt: row.createdAt,
  };
}

export async function listTireOrders(opts: {
  shopId: string;
  q?: string;
  status?: TireOrderStatus;
  page?: number;
  perPage?: number;
}): Promise<{ rows: TireOrderRow[]; total: number }> {
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 25;
  const q = opts.q?.trim();

  const where = {
    shopId: opts.shopId,
    ...(opts.status ? { status: opts.status } : {}),
    ...(q
      ? {
          OR: [
            { tireBrand: { contains: q, mode: "insensitive" as const } },
            { tireSizeFront: { contains: q, mode: "insensitive" as const } },
            { notes: { contains: q, mode: "insensitive" as const } },
            {
              customer: {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" as const } },
                  { lastName: { contains: q, mode: "insensitive" as const } },
                  { company: { contains: q, mode: "insensitive" as const } },
                  { phone: { contains: q, mode: "insensitive" as const } },
                ],
              },
            },
            ...(Number.isFinite(Number(q))
              ? [{ number: Number(q) }]
              : []),
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.tireOrder.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: listSelect,
    }),
    prisma.tireOrder.count({ where }),
  ]);

  return { rows: rows.map(mapRow), total };
}

export async function getTireOrder(
  shopId: string,
  id: string,
): Promise<TireOrderDetail | null> {
  const row = await prisma.tireOrder.findFirst({
    where: { id, shopId },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          phone: true,
          email: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          year: true,
          make: true,
          model: true,
          vin: true,
          plate: true,
        },
      },
      appointment: {
        select: {
          id: true,
          title: true,
          startAt: true,
          endAt: true,
          status: true,
          notes: true,
        },
      },
    },
  });
  if (!row) return null;

  const base = mapRow(row);
  return {
    ...base,
    customerId: row.customerId,
    vehicleId: row.vehicleId,
    appointmentId: row.appointmentId,
    tireSizeFront: row.tireSizeFront,
    tireSizeRear: row.tireSizeRear,
    tireQuantity: row.tireQuantity,
    tireType: row.tireType,
    dropOffType: row.dropOffType,
    estimatedTotalCents: row.estimatedTotalCents,
    depositMethod: row.depositMethod,
    depositReference: row.depositReference,
    websiteSubmissionId: row.websiteSubmissionId,
    notes: row.notes,
    supplierName: row.supplierName,
    supplierOrderRef: row.supplierOrderRef,
    supplierApprovedBy: row.supplierApprovedBy,
    supplierApprovedAt: row.supplierApprovedAt,
    supplierQuoteCents: row.supplierQuoteCents,
    supplierRejectedAt: row.supplierRejectedAt,
    supplierRejectionNote: row.supplierRejectionNote,
    updatedAt: row.updatedAt,
    customer: row.customer,
    vehicle: row.vehicle,
    appointment: row.appointment,
  };
}

export async function getTireOrderStatusCounts(shopId: string) {
  const groups = await prisma.tireOrder.groupBy({
    by: ["status"],
    where: { shopId, status: { not: "CANCELED" } },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const g of groups) counts[g.status] = g._count._all;
  return counts;
}
