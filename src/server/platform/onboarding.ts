import "server-only";

import { prisma } from "@/db/client";
import { requirePlatformAdmin } from "@/lib/platform";
import { deriveShopSmsSetupStatus } from "@/lib/sms-constants";
import { buildComplianceOnboardingSteps } from "@/server/platform/onboarding-compliance";
import { BillingStatus, ShopStatus, StripeConnectStatus } from "@/generated/prisma";

export type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href?: string;
  stub?: boolean;
  group?: "compliance" | "operations";
};

export type OnboardingShopRow = {
  id: string;
  name: string;
  code: string;
  status: ShopStatus;
  billingStatus: BillingStatus;
  createdAt: Date;
  trialEndsAt: Date | null;
  steps: OnboardingStep[];
  complianceCompletedCount: number;
  complianceTotalSteps: number;
  completedCount: number;
  totalSteps: number;
  isLive: boolean;
  needsApproval: boolean;
};

function buildOperationalSteps(input: {
  shopId: string;
  membershipCount: number;
  stripeSubscriptionId: string | null;
  stripeConnectStatus: StripeConnectStatus;
  smsEnabled: boolean;
  twilioPhoneNumber: string | null;
  landlineNumber: string | null;
  billingStatus: BillingStatus;
  status: ShopStatus;
}): OnboardingStep[] {
  const smsStatus = deriveShopSmsSetupStatus({
    twilioPhoneNumber: input.twilioPhoneNumber,
    landlineNumber: input.landlineNumber,
    smsEnabled: input.smsEnabled,
  });

  return [
    {
      id: "approved",
      label: "Intake approved",
      description: "Platform owner activated the shop after prospect intake.",
      done: input.status !== ShopStatus.PENDING,
      href: `/platform/onboarding?shopId=${input.shopId}`,
      group: "operations",
    },
    {
      id: "provisioned",
      label: "Shop provisioned",
      description: "Tenant record created with master ID and plan tier.",
      done: true,
      href: `/platform/shops/${input.shopId}`,
      group: "operations",
    },
    {
      id: "billing",
      label: "Subscription active",
      description: "Stripe Billing subscription linked (stub until Stripe wired).",
      done:
        Boolean(input.stripeSubscriptionId) ||
        (input.billingStatus === BillingStatus.ACTIVE &&
          input.status !== ShopStatus.TRIAL),
      href: "/platform/billing",
      stub: !input.stripeSubscriptionId,
      group: "operations",
    },
    {
      id: "connect",
      label: "Stripe Connect",
      description: "Shop connected payout account for customer payments.",
      done: input.stripeConnectStatus === StripeConnectStatus.ACTIVE,
      href: "/platform/billing",
      stub: true,
      group: "operations",
    },
    {
      id: "team",
      label: "First user invited",
      description: "At least one team member beyond the owner — invite from shop CRM.",
      done: input.membershipCount > 0,
      href: `/platform/shops/${input.shopId}`,
      stub: true,
      group: "operations",
    },
    {
      id: "sms",
      label: "SMS configured",
      description: "Twilio number provisioned or ported for two-way texting.",
      done: smsStatus === "configured",
      href: `/platform/shops/${input.shopId}`,
      stub: true,
      group: "operations",
    },
    {
      id: "golive",
      label: "Go live",
      description: "Shop status active and out of trial.",
      done:
        input.status === ShopStatus.ACTIVE &&
        input.billingStatus !== BillingStatus.TRIAL,
      href: `/platform/shops/${input.shopId}`,
      group: "operations",
    },
  ];
}

/** All shops with onboarding checklist progress for the platform owner. */
export async function listOnboardingShops(): Promise<OnboardingShopRow[]> {
  await requirePlatformAdmin();
  const shops = await prisma.shop.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      platformId: true,
      name: true,
      code: true,
      masterId: true,
      status: true,
      billingStatus: true,
      createdAt: true,
      trialEndsAt: true,
      primaryContactName: true,
      msaAcknowledgedAt: true,
      stripeSubscriptionId: true,
      stripeConnectStatus: true,
      smsEnabled: true,
      twilioPhoneNumber: true,
      landlineNumber: true,
      _count: {
        select: {
          memberships: true,
          legalAcceptances: true,
        },
      },
    },
  });

  const rows = await Promise.all(
    shops.map(async (shop) => {
      const complianceSteps = await buildComplianceOnboardingSteps({
        shopId: shop.id,
        masterId: shop.masterId,
        platformId: shop.platformId,
        primaryContactName: shop.primaryContactName,
        msaAcknowledgedAt: shop.msaAcknowledgedAt,
        smsEnabled: shop.smsEnabled,
        twilioPhoneNumber: shop.twilioPhoneNumber,
        membershipCount: shop._count.memberships,
        legalAcceptanceCount: shop._count.legalAcceptances,
      });

      const operationalSteps = buildOperationalSteps({
        shopId: shop.id,
        membershipCount: shop._count.memberships,
        stripeSubscriptionId: shop.stripeSubscriptionId,
        stripeConnectStatus: shop.stripeConnectStatus,
        smsEnabled: shop.smsEnabled,
        twilioPhoneNumber: shop.twilioPhoneNumber,
        landlineNumber: shop.landlineNumber,
        billingStatus: shop.billingStatus,
        status: shop.status,
      });

      const steps = [...complianceSteps, ...operationalSteps];
      const complianceCompletedCount = complianceSteps.filter((s) => s.done).length;
      const completedCount = steps.filter((s) => s.done).length;
      const isLive = operationalSteps.find((s) => s.id === "golive")?.done ?? false;
      const needsApproval = shop.status === ShopStatus.PENDING;

      return {
        id: shop.id,
        name: shop.name,
        code: shop.code,
        status: shop.status,
        billingStatus: shop.billingStatus,
        createdAt: shop.createdAt,
        trialEndsAt: shop.trialEndsAt,
        steps,
        complianceCompletedCount,
        complianceTotalSteps: complianceSteps.length,
        completedCount,
        totalSteps: steps.length,
        isLive,
        needsApproval,
      };
    }),
  );

  return rows;
}

export async function getOnboardingSummary() {
  const all = await listOnboardingShops();
  const inPipeline = all.filter((s) => !s.isLive);
  const readyToLaunch = inPipeline.filter(
    (s) => s.completedCount >= s.totalSteps - 1 && !s.isLive,
  );

  return {
    inPipelineCount: inPipeline.length,
    readyToLaunchCount: readyToLaunch.length,
    shops: all,
  };
}

/** Compliance + audit snapshot for platform shop detail. */
export async function getShopOnboardingCompliance(shopId: string) {
  await requirePlatformAdmin();
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      platformId: true,
      masterId: true,
      primaryContactName: true,
      msaAcknowledgedAt: true,
      smsEnabled: true,
      twilioPhoneNumber: true,
      legalEntityName: true,
      provisionMethod: true,
      createdAt: true,
      _count: { select: { memberships: true, legalAcceptances: true } },
    },
  });
  if (!shop) return null;

  const [complianceSteps, auditEvents] = await Promise.all([
    buildComplianceOnboardingSteps({
      shopId: shop.id,
      masterId: shop.masterId,
      platformId: shop.platformId,
      primaryContactName: shop.primaryContactName,
      msaAcknowledgedAt: shop.msaAcknowledgedAt,
      smsEnabled: shop.smsEnabled,
      twilioPhoneNumber: shop.twilioPhoneNumber,
      membershipCount: shop._count.memberships,
      legalAcceptanceCount: shop._count.legalAcceptances,
    }),
    prisma.platformAuditEvent.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return { shop, complianceSteps, auditEvents };
}
