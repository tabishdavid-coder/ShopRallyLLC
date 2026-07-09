import "server-only";

import { prisma } from "@/db/client";
import { customerDisplayName } from "@/lib/format";
import { buildServiceAdvisor, type ServiceAdvisorInfo } from "@/lib/service-advisor";
import { inspectionProgress } from "@/lib/inspection";
import type { InspectionStatus, InspectionItemStatus, Prisma } from "@/generated/prisma";

export type InspectionListRow = {
  id: string;
  templateName: string;
  status: InspectionStatus;
  performedAt: Date | null;
  createdAt: Date;
  roId: string;
  roNumber: number;
  customerName: string;
  vehicleLabel: string;
  progressPercent: number;
  ratedCount: number;
  itemCount: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
};

export type InspectionListResult = {
  rows: InspectionListRow[];
  total: number;
  page: number;
  perPage: number;
};

function vehicleLabel(v: {
  year: number | null;
  make: string | null;
  model: string | null;
} | null): string {
  if (!v) return "—";
  const parts = [v.year, v.make, v.model].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

/**
 * Paginated shop inspection list with filters for status, RO#, customer, and date.
 */
export async function getInspections(opts: {
  shopId: string;
  q?: string;
  status?: InspectionStatus | "ALL";
  page?: number;
  perPage?: number;
}): Promise<InspectionListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = opts.perPage ?? 15;
  const q = opts.q?.trim();
  const statusFilter = opts.status && opts.status !== "ALL" ? opts.status : undefined;

  const roNumber = q && /^\d+$/.test(q) ? Number(q) : null;
  const searchOr: Prisma.InspectionWhereInput[] = q
    ? [
        { templateName: { contains: q, mode: "insensitive" } },
        {
          repairOrder: {
            customer: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { company: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
        {
          repairOrder: {
            vehicle: {
              OR: [
                { make: { contains: q, mode: "insensitive" } },
                { model: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
        ...(roNumber !== null ? [{ repairOrder: { number: roNumber } }] : []),
      ]
    : [];

  const where: Prisma.InspectionWhereInput = {
    shopId: opts.shopId,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(searchOr.length ? { OR: searchOr } : {}),
  };

  const [total, inspections] = await Promise.all([
    prisma.inspection.count({ where }),
    prisma.inspection.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        items: { select: { status: true } },
        repairOrder: {
          select: {
            id: true,
            number: true,
            customer: {
              select: { firstName: true, lastName: true, company: true },
            },
            vehicle: {
              select: { year: true, make: true, model: true },
            },
          },
        },
      },
    }),
  ]);

  const rows: InspectionListRow[] = inspections.map((insp) => {
    const progress = inspectionProgress(insp.items);
    const ro = insp.repairOrder;
    return {
      id: insp.id,
      templateName: insp.templateName,
      status: insp.status,
      performedAt: insp.performedAt,
      createdAt: insp.createdAt,
      roId: ro.id,
      roNumber: ro.number,
      customerName: customerDisplayName(ro.customer),
      vehicleLabel: vehicleLabel(ro.vehicle),
      progressPercent: progress.percent,
      ratedCount: progress.rated,
      itemCount: progress.total,
      redCount: progress.counts.RED,
      yellowCount: progress.counts.YELLOW,
      greenCount: progress.counts.GREEN,
    };
  });

  return { rows, total, page, perPage };
}

export type InspectionItemView = {
  id: string;
  name: string;
  category: string | null;
  status: InspectionItemStatus;
  note: string | null;
  photoUrls: string[];
  sortOrder: number;
};

export type InspectionDetail = {
  id: string;
  templateName: string;
  status: InspectionStatus;
  performedAt: Date | null;
  shareToken: string | null;
  items: InspectionItemView[];
  progress: ReturnType<typeof inspectionProgress>;
};

export type PublicInspectionView = {
  shopName: string;
  templateName: string;
  status: InspectionStatus;
  performedAt: Date | null;
  roNumber: number;
  customerName: string;
  vehicleLabel: string;
  serviceAdvisor: ServiceAdvisorInfo;
  items: InspectionItemView[];
  progress: ReturnType<typeof inspectionProgress>;
};

export async function getInspectionDetail(opts: {
  shopId: string;
  inspectionId: string;
}): Promise<InspectionDetail | null> {
  const insp = await prisma.inspection.findFirst({
    where: { id: opts.inspectionId, shopId: opts.shopId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!insp) return null;

  const items: InspectionItemView[] = insp.items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    status: i.status,
    note: i.note,
    photoUrls: i.photoUrls,
    sortOrder: i.sortOrder,
  }));

  return {
    id: insp.id,
    templateName: insp.templateName,
    status: insp.status,
    performedAt: insp.performedAt,
    shareToken: insp.shareToken,
    items,
    progress: inspectionProgress(items),
  };
}

export async function getPublicInspectionView(token: string): Promise<PublicInspectionView | null> {
  const insp = await prisma.inspection.findUnique({
    where: { shareToken: token },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      repairOrder: {
        select: {
          number: true,
          serviceWriterId: true,
          customer: {
            select: { firstName: true, lastName: true, company: true },
          },
          vehicle: {
            select: { year: true, make: true, model: true },
          },
          shop: { select: { name: true } },
        },
      },
    },
  });
  if (!insp) return null;

  const ro = insp.repairOrder;
  const serviceWriter = ro.serviceWriterId
    ? await prisma.user.findUnique({
        where: { id: ro.serviceWriterId },
        select: { firstName: true, lastName: true, email: true, phone: true },
      })
    : null;
  const items: InspectionItemView[] = insp.items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    status: i.status,
    note: i.note,
    photoUrls: i.photoUrls,
    sortOrder: i.sortOrder,
  }));

  return {
    shopName: ro.shop.name,
    templateName: insp.templateName,
    status: insp.status,
    performedAt: insp.performedAt,
    roNumber: ro.number,
    customerName: customerDisplayName(ro.customer),
    vehicleLabel: vehicleLabel(ro.vehicle),
    serviceAdvisor: buildServiceAdvisor(serviceWriter),
    items,
    progress: inspectionProgress(items),
  };
}
