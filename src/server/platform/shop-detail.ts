import "server-only";

import { prisma } from "@/db/client";
import { PLANS, billingStatusLabel, resolvePlanFeatures, type PlanFeatureSet } from "@/lib/plans";
import {
  parseReleaseFlags,
  releaseFlagsDefaultOpen,
  type ReleaseFlagMap,
} from "@/lib/release-flags";
import { estimateShopMrrCents } from "@/lib/subscription";
import { deriveShopSmsSetupStatus } from "@/lib/sms-constants";
import type { PlatformShopRow } from "@/server/platform-shops";

export type PlatformShopDetail = PlatformShopRow & {
  planLabel: string;
  billingLabel: string;
  address: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  clerkOrgId: string | null;
  membershipCount: number;
  openTicketCount: number;
  /** Explicit `_release` map (may be empty). */
  releaseFlags: ReleaseFlagMap;
  /** Env/default: open in local/preview, closed in production. */
  releaseFlagsDefaultOpen: boolean;
  /** Merged plan + per-shop overrides — for add-on toggles. */
  resolvedFeatures: PlanFeatureSet;
};

export async function getPlatformShopDetail(shopId: string): Promise<PlatformShopDetail | null> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
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
      address: true,
      twilioPhoneNumber: true,
      smsEnabled: true,
      landlineNumber: true,
      planFeatures: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeConnectStatus: true,
      stripeConnectAccountId: true,
      clerkOrgId: true,
      _count: {
        select: {
          customers: true,
          repairOrders: true,
          memberships: true,
          supportTickets: true,
        },
      },
    },
  });

  if (!shop) return null;

  const openTicketCount = await prisma.supportTicket.count({
    where: {
      shopId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  });

  return {
    id: shop.id,
    name: shop.name,
    code: shop.code,
    masterId: shop.masterId,
    status: shop.status,
    plan: shop.plan,
    planLabel: PLANS[shop.plan].name,
    billingStatus: shop.billingStatus,
    billingLabel: billingStatusLabel(shop.billingStatus),
    trialEndsAt: shop.trialEndsAt,
    lastActiveAt: shop.lastActiveAt,
    mrrCents: estimateShopMrrCents(shop.plan, shop.billingStatus),
    createdAt: shop.createdAt,
    customerCount: shop._count.customers,
    repairOrderCount: shop._count.repairOrders,
    city: shop.city,
    state: shop.state,
    phone: shop.phone,
    email: shop.email,
    address: shop.address,
    twilioPhoneNumber: shop.twilioPhoneNumber,
    smsEnabled: shop.smsEnabled,
    smsSetupStatus: deriveShopSmsSetupStatus(shop),
    lastSmsAt: null,
    stripeCustomerId: shop.stripeCustomerId,
    stripeSubscriptionId: shop.stripeSubscriptionId,
    stripeConnectStatus: shop.stripeConnectStatus,
    stripeConnectAccountId: shop.stripeConnectAccountId,
    clerkOrgId: shop.clerkOrgId,
    membershipCount: shop._count.memberships,
    openTicketCount,
    releaseFlags: parseReleaseFlags(shop.planFeatures),
    releaseFlagsDefaultOpen: releaseFlagsDefaultOpen(),
    resolvedFeatures: resolvePlanFeatures({ plan: shop.plan, planFeatures: shop.planFeatures }),
  };
}
