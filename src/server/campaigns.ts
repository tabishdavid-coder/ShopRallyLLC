import "server-only";

import type { CampaignStatus, CampaignType, Prisma } from "@/generated/prisma";
import { prisma } from "@/db/client";
import { parseAudienceFilter, type AudienceFilter } from "@/lib/campaigns";

export type CampaignListItem = {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  channel: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  scheduledAt: Date | null;
  launchedAt: Date | null;
  createdAt: Date;
};

export type CampaignDetail = CampaignListItem & {
  messageTemplate: string;
  emailSubject: string | null;
  audienceFilter: AudienceFilter;
  completedAt: Date | null;
  openedCount: number;
  sends: {
    id: string;
    customerId: string;
    customerName: string;
    channel: string;
    status: string;
    sentAt: Date | null;
    openedAt: Date | null;
    clickedAt: Date | null;
    error: string | null;
  }[];
};

export async function listCampaigns(
  shopId: string,
  status?: CampaignStatus,
): Promise<CampaignListItem[]> {
  const where: Prisma.MarketingCampaignWhereInput = { shopId };
  if (status) where.status = status;

  const rows = await prisma.marketingCampaign.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      channel: true,
      sentCount: true,
      deliveredCount: true,
      failedCount: true,
      scheduledAt: true,
      launchedAt: true,
      createdAt: true,
    },
  });
  return rows;
}

export async function getCampaign(shopId: string, id: string): Promise<CampaignDetail | null> {
  const row = await prisma.marketingCampaign.findFirst({
    where: { id, shopId },
    include: {
      sends: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          customer: { select: { firstName: true, lastName: true, company: true } },
        },
      },
    },
  });
  if (!row) return null;

  const { customerDisplayName } = await import("@/lib/format");

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    channel: row.channel,
    sentCount: row.sentCount,
    deliveredCount: row.deliveredCount,
    failedCount: row.failedCount,
    scheduledAt: row.scheduledAt,
    launchedAt: row.launchedAt,
    createdAt: row.createdAt,
    messageTemplate: row.messageTemplate,
    emailSubject: row.emailSubject,
    audienceFilter: parseAudienceFilter(row.audienceFilter),
    completedAt: row.completedAt,
    openedCount: row.sends.filter((s) => s.openedAt).length,
    sends: row.sends.map((s) => ({
      id: s.id,
      customerId: s.customerId,
      customerName: customerDisplayName(s.customer),
      channel: s.channel,
      status: s.status,
      sentAt: s.sentAt,
      openedAt: s.openedAt,
      clickedAt: s.clickedAt,
      error: s.error,
    })),
  };
}

/** Build Prisma where clause from audience filter JSON. */
export async function buildAudienceWhere(
  shopId: string,
  filter: AudienceFilter,
): Promise<Prisma.CustomerWhereInput> {
  const where: Prisma.CustomerWhereInput = {
    shopId,
    deletedAt: null,
    anonymizedAt: null,
  };

  if (filter.marketingOptInOnly !== false) {
    where.marketingOptIn = true;
  }

  if (filter.customerType === "business") {
    where.company = { not: null };
  } else if (filter.customerType === "person") {
    where.company = null;
  }

  if (filter.tags?.length) {
    where.tags = { hasSome: filter.tags };
  }

  if (filter.zipCodes?.length) {
    where.zip = { in: filter.zipCodes };
  }

  if (filter.requirePhone) {
    where.phone = { not: null };
  }

  if (filter.requireEmail) {
    where.email = { not: null };
  }

  const lastVisitMin = filter.lastVisitDaysMin;
  const lastVisitMax = filter.lastVisitDaysMax;

  if (lastVisitMin != null || lastVisitMax != null) {
    const now = Date.now();
    const roConditions: Prisma.RepairOrderWhereInput[] = [];

    if (lastVisitMax != null) {
      const since = new Date(now - lastVisitMax * 86_400_000);
      roConditions.push({ createdAt: { gte: since } });
    }

    if (lastVisitMin != null) {
      const before = new Date(now - lastVisitMin * 86_400_000);
      where.NOT = {
        repairOrders: { some: { createdAt: { gte: before } } },
      };
    }

    if (lastVisitMax != null && lastVisitMin == null) {
      where.repairOrders = { some: roConditions[0] };
    }
  }

  if (filter.hasDeclinedInspection) {
    const declinedFilter: Prisma.CustomerWhereInput = {
      repairOrders: {
        some: {
          inspections: {
            some: {
              items: { some: { status: { in: ["YELLOW", "RED"] } } },
            },
          },
        },
      },
    };
    if (where.repairOrders || where.NOT) {
      const base = { ...where };
      delete base.AND;
      where.AND = [
        base,
        declinedFilter,
      ];
      delete where.repairOrders;
      delete where.NOT;
    } else {
      Object.assign(where, declinedFilter);
    }
  }

  return where;
}

export async function previewAudienceCount(
  shopId: string,
  filter: AudienceFilter,
): Promise<number> {
  const where = await buildAudienceWhere(shopId, filter);
  return prisma.customer.count({ where });
}

export async function resolveAudienceCustomers(
  shopId: string,
  filter: AudienceFilter,
  limit = 2000,
) {
  const where = await buildAudienceWhere(shopId, filter);
  return prisma.customer.findMany({
    where,
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      email: true,
      marketingOptIn: true,
      transactionalSmsConsent: true,
      marketingEmailConsent: true,
      deletedAt: true,
      anonymizedAt: true,
    },
  });
}

/** Most recent job name per customer (for win-back {last_service} merge field). */
export async function resolveLastServiceByCustomer(
  shopId: string,
  customerIds: string[],
): Promise<Map<string, string>> {
  if (customerIds.length === 0) return new Map();

  const ros = await prisma.repairOrder.findMany({
    where: { shopId, customerId: { in: customerIds } },
    orderBy: { createdAt: "desc" },
    select: {
      customerId: true,
      jobs: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        select: { name: true },
      },
    },
  });

  const map = new Map<string, string>();
  for (const ro of ros) {
    if (map.has(ro.customerId)) continue;
    map.set(ro.customerId, ro.jobs[0]?.name ?? "your last visit");
  }
  return map;
}

export async function getCampaignContext(shopId: string) {
  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    select: {
      name: true,
      phone: true,
      bookingSlug: true,
      onlineBookingEnabled: true,
    },
  });

  const { getAppUrl } = await import("@/lib/app-url");
  const base = getAppUrl();
  const bookingLink =
    shop.onlineBookingEnabled && shop.bookingSlug
      ? `${base}/book/${shop.bookingSlug}`
      : base;

  const { getGoogleReviewsIntegration } = await import("@/server/google-reviews");
  const { buildGoogleReviewLink } = await import("@/server/services/google-reviews");
  const google = await getGoogleReviewsIntegration(shopId);
  const reviewLink =
    google.connected && buildGoogleReviewLink(google.config)
      ? buildGoogleReviewLink(google.config)!
      : bookingLink;

  return {
    shopName: shop.name,
    shopPhone: shop.phone ?? "",
    bookingLink,
    reviewLink,
    googleReviewsConnected: google.connected,
  };
}
