import "server-only";

import { prisma } from "@/db/client";
import { deriveShopSmsSetupStatus } from "@/lib/sms-constants";
import type { ShopStatus, ShopPlan, BillingStatus, StripeConnectStatus } from "@/generated/prisma";
import type { ShopSmsSetupStatus } from "@/lib/sms-constants";
import { estimateShopMrrCents } from "@/lib/subscription";

export type PlatformShopRow = {
  id: string;
  name: string;
  code: string;
  masterId: string;
  status: ShopStatus;
  plan: ShopPlan;
  billingStatus: BillingStatus;
  trialEndsAt: Date | null;
  lastActiveAt: Date | null;
  mrrCents: number;
  createdAt: Date;
  customerCount: number;
  repairOrderCount: number;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  twilioPhoneNumber: string | null;
  smsEnabled: boolean;
  smsSetupStatus: ShopSmsSetupStatus;
  lastSmsAt: Date | null;
  stripeConnectStatus: StripeConnectStatus;
  stripeConnectAccountId: string | null;
};

/** All shops on the platform with basic KPIs for the master admin UI. */
export async function listPlatformShops(): Promise<PlatformShopRow[]> {
  const shops = await prisma.shop.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      masterId: true,
      status: true,
      plan: true,
      billingStatus: true,
      trialEndsAt: true,
      lastActiveAt: true,
      createdAt: true,
      city: true,
      state: true,
      phone: true,
      email: true,
      twilioPhoneNumber: true,
      smsEnabled: true,
      landlineNumber: true,
      stripeConnectStatus: true,
      stripeConnectAccountId: true,
      _count: { select: { customers: true, repairOrders: true } },
    },
  });

  const shopIds = shops.map((s) => s.id);
  const lastMessages = shopIds.length
    ? await prisma.message.groupBy({
        by: ["shopId"],
        where: { shopId: { in: shopIds } },
        _max: { createdAt: true },
      })
    : [];
  const lastSmsByShop = new Map(lastMessages.map((m) => [m.shopId, m._max.createdAt]));

  return shops.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    masterId: s.masterId,
    status: s.status,
    plan: s.plan,
    billingStatus: s.billingStatus,
    trialEndsAt: s.trialEndsAt,
    lastActiveAt: s.lastActiveAt,
    mrrCents: estimateShopMrrCents(s.plan, s.billingStatus),
    createdAt: s.createdAt,
    customerCount: s._count.customers,
    repairOrderCount: s._count.repairOrders,
    city: s.city,
    state: s.state,
    phone: s.phone,
    email: s.email,
    twilioPhoneNumber: s.twilioPhoneNumber,
    smsEnabled: s.smsEnabled,
    smsSetupStatus: deriveShopSmsSetupStatus(s),
    lastSmsAt: lastSmsByShop.get(s.id) ?? null,
    stripeConnectStatus: s.stripeConnectStatus,
    stripeConnectAccountId: s.stripeConnectAccountId,
  }));
}

export type PlatformKpis = {
  shopCount: number;
  customerCount: number;
  repairOrderCount: number;
  activeShopCount: number;
};

export async function getPlatformKpis(): Promise<PlatformKpis> {
  const [shopCount, customerCount, repairOrderCount, activeShopCount] = await Promise.all([
    prisma.shop.count(),
    prisma.customer.count(),
    prisma.repairOrder.count(),
    prisma.shop.count({ where: { status: "ACTIVE" } }),
  ]);

  return { shopCount, customerCount, repairOrderCount, activeShopCount };
}
