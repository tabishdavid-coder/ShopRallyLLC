import "server-only";

import { prisma } from "@/db/client";
import type { MaintenanceVehicleClass, PlanSubscriptionStatus } from "@/generated/prisma";

const planInclude = {
  entitlements: { orderBy: { sortOrder: "asc" as const } },
  classPrices: true,
  _count: {
    select: {
      subscriptions: {
        where: { status: { notIn: ["CANCELLED", "EXPIRED"] as PlanSubscriptionStatus[] } },
      },
    },
  },
};

export type MaintenancePlanRow = Awaited<ReturnType<typeof listMaintenancePlans>>[number];

/** Ensure program settings row exists for a shop. */
export async function ensureProgramSettings(shopId: string) {
  return prisma.maintenanceProgramSettings.upsert({
    where: { shopId },
    create: { shopId },
    update: {},
  });
}

export async function listMaintenancePlans(shopId: string) {
  return prisma.maintenancePlan.findMany({
    where: { shopId },
    include: planInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getMaintenancePlan(shopId: string, planId: string) {
  return prisma.maintenancePlan.findFirst({
    where: { id: planId, shopId },
    include: {
      entitlements: { orderBy: { sortOrder: "asc" } },
      classPrices: true,
    },
  });
}

export async function getMarketingMaintenancePrograms(shopId: string) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { code: true, name: true },
  });
  if (!shop) return null;

  const settings = await ensureProgramSettings(shopId);
  const plans = await listMaintenancePlans(shopId);
  const slug = settings.plansSlug ?? shop.code.toLowerCase();

  return { shop, settings, plans, slug };
}

export async function getShopByPlansSlug(
  slug: string,
  options?: { allowDisabled?: boolean },
) {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const settings = await prisma.maintenanceProgramSettings.findFirst({
    where: {
      ...(options?.allowDisabled ? {} : { enabled: true }),
      OR: [
        { plansSlug: normalized },
        { shop: { code: { equals: normalized, mode: "insensitive" } } },
        { shop: { bookingSlug: normalized } },
      ],
    },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          logoUrl: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          website: true,
        },
      },
    },
  });
  if (!settings) return null;

  const plans = await prisma.maintenancePlan.findMany({
    where: { shopId: settings.shopId, active: true },
    include: {
      entitlements: { orderBy: { sortOrder: "asc" } },
      classPrices: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return {
    settings,
    shop: settings.shop,
    plans,
    slug: settings.plansSlug ?? slug,
  };
}

export type PublicPlansPayload = NonNullable<Awaited<ReturnType<typeof getShopByPlansSlug>>>;

export function pickPublicPlanPricing(
  plan: PublicPlansPayload["plans"][number],
  vehicleClass?: MaintenanceVehicleClass | null,
) {
  if (!plan.useClassPricing || !vehicleClass) {
    return {
      payInFullCents: plan.payInFullCents,
      monthlyCents: plan.monthlyCents,
      annualCents: plan.annualCents,
    };
  }
  const row = plan.classPrices.find((c) => c.vehicleClass === vehicleClass);
  const surcharge = row?.surchargeCents ?? 0;
  return {
    payInFullCents:
      row?.payInFullCents ?? (plan.payInFullCents != null ? plan.payInFullCents + surcharge : null),
    monthlyCents:
      row?.monthlyCents ?? (plan.monthlyCents != null ? plan.monthlyCents + surcharge : null),
    annualCents:
      row?.annualCents ?? (plan.annualCents != null ? plan.annualCents + surcharge : null),
  };
}
