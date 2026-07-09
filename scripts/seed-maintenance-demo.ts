/**
 * Seed demo maintenance plans + subscribers for mockup walkthrough.
 * Syncs In & Out AutoHaus OilCare Club tiers from PLAN_TEMPLATES.
 * Run: npx tsx scripts/seed-maintenance-demo.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { OILCARE_TERMS_DEFAULT, PLAN_TEMPLATES } from "../src/lib/maintenance-programs";
import { addMonths } from "../src/lib/dates";

const prisma = new PrismaClient();

const SHOP_ID = "shop_demo";

function initialRemaining(kind: string, quantity: number | null): number | null {
  if (kind === "COUNTED" || kind === "COUPON") return quantity ?? 1;
  return null;
}

async function ensureSubscriptionEntitlements(subscriptionId: string, planId: string) {
  const planEntitlements = await prisma.planEntitlement.findMany({
    where: { planId, shopId: SHOP_ID },
    orderBy: { sortOrder: "asc" },
  });
  if (!planEntitlements.length) return;

  const existing = await prisma.subscriptionEntitlement.findMany({
    where: { subscriptionId, shopId: SHOP_ID },
    include: { redemptions: { select: { id: true }, take: 1 } },
  });

  const validPeIds = new Set(planEntitlements.map((pe) => pe.id));
  const linkedPeIds = new Set(
    existing.filter((e) => validPeIds.has(e.planEntitlementId)).map((e) => e.planEntitlementId),
  );
  const missingPlanEnts = planEntitlements.filter((pe) => !linkedPeIds.has(pe.id));
  let orphaned = existing.filter((e) => !validPeIds.has(e.planEntitlementId));

  const remapCount = Math.min(missingPlanEnts.length, orphaned.length);
  for (let i = 0; i < remapCount; i++) {
    const pe = missingPlanEnts[i]!;
    const orphan = orphaned[i]!;
    await prisma.subscriptionEntitlement.update({
      where: { id: orphan.id },
      data: { planEntitlementId: pe.id },
    });
    linkedPeIds.add(pe.id);
  }

  orphaned = orphaned.slice(remapCount);
  const stillMissing = planEntitlements.filter((pe) => !linkedPeIds.has(pe.id));

  if (stillMissing.length) {
    await prisma.subscriptionEntitlement.createMany({
      data: stillMissing.map((pe) => ({
        shopId: SHOP_ID,
        subscriptionId,
        planEntitlementId: pe.id,
        usedCount: 0,
        remainingCount: initialRemaining(pe.kind, pe.quantity),
        creditBalanceCents: pe.kind === "CREDIT" ? pe.creditCents : null,
        nextEligibleAt: pe.kind === "INTERVAL" || pe.kind === "UNLIMITED" ? new Date() : null,
      })),
    });
  }

  for (const orphan of orphaned) {
    if (orphan.usedCount === 0 && orphan.redemptions.length === 0) {
      await prisma.subscriptionEntitlement.delete({ where: { id: orphan.id } });
    }
  }
}

async function backfillAllSubscriptionEntitlements() {
  const subs = await prisma.planSubscription.findMany({
    where: { shopId: SHOP_ID, status: { in: ["ACTIVE", "PAST_DUE"] } },
    select: { id: true, planId: true },
  });
  for (const sub of subs) {
    await ensureSubscriptionEntitlements(sub.id, sub.planId);
  }
  if (subs.length) {
    console.log(`Backfilled entitlements for ${subs.length} active subscription(s).`);
  }
}

const LEGACY_PLAN_NAMES = [
  "Basic Maintenance Bundle",
  "Car Care Club",
  "Family Plan",
];

const LEGACY_TO_OILCARE: Record<string, string> = {
  "Basic Maintenance Bundle": "OilCare Essentials",
  "Car Care Club": "OilCare Premium",
  "Family Plan": "OilCare Elite",
};

async function applyTemplateToPlan(planId: string, templateIndex: number) {
  const t = PLAN_TEMPLATES[templateIndex]!;
  const p = t.plan;

  await prisma.planEntitlement.deleteMany({ where: { planId } });
  await prisma.maintenancePlan.update({
    where: { id: planId },
    data: {
      name: p.name,
      tagline: p.tagline ?? null,
      idealFor: p.idealFor ?? null,
      archetype: p.archetype,
      scope: p.scope,
      maxVehicles: p.maxVehicles ?? null,
      termMonths: p.termMonths,
      autoRenew: p.autoRenew,
      allowRollover: p.allowRollover,
      transferable: p.transferable,
      useClassPricing: p.useClassPricing,
      retailCents: p.retailCents ?? null,
      payInFullCents: p.payInFullCents ?? null,
      monthlyCents: p.monthlyCents ?? null,
      monthlyTermMonths: p.monthlyTermMonths ?? null,
      annualCents: p.annualCents ?? null,
      featured: p.featured ?? false,
      sortOrder: templateIndex,
      active: true,
      terms: p.terms ?? OILCARE_TERMS_DEFAULT,
      entitlements: {
        create: p.entitlements.map((e, j) => ({
          shopId: SHOP_ID,
          kind: e.kind,
          label: e.label,
          quantity: e.quantity ?? null,
          intervalDays: e.intervalDays ?? null,
          discountBps: e.discountBps ?? null,
          creditCents: e.creditCents ?? null,
          sortOrder: j,
        })),
      },
    },
  });
}

async function syncOilCarePlans() {
  const expectedNames = new Set(PLAN_TEMPLATES.map((t) => t.plan.name));
  const existing = await prisma.maintenancePlan.findMany({
    where: { shopId: SHOP_ID },
    include: { _count: { select: { subscriptions: true } } },
  });

  const claimed = new Set<string>();

  for (const legacy of existing.filter((p) => LEGACY_PLAN_NAMES.includes(p.name))) {
    const targetName = LEGACY_TO_OILCARE[legacy.name];
    const templateIndex = PLAN_TEMPLATES.findIndex((t) => t.plan.name === targetName);
    if (templateIndex < 0) continue;

    const alreadyHasTarget = existing.some((p) => p.name === targetName && p.id !== legacy.id);
    if (alreadyHasTarget) continue;

    await applyTemplateToPlan(legacy.id, templateIndex);
    claimed.add(targetName);
    console.log(`Migrated legacy plan "${legacy.name}" → ${targetName}`);
  }

  const refreshed = await prisma.maintenancePlan.findMany({
    where: { shopId: SHOP_ID },
    include: { _count: { select: { subscriptions: true } } },
  });

  const stale = refreshed.filter(
    (p) =>
      (LEGACY_PLAN_NAMES.includes(p.name) ||
        (!expectedNames.has(p.name) && p._count.subscriptions === 0)) &&
      p._count.subscriptions === 0,
  );

  if (stale.length > 0) {
    await prisma.planEntitlement.deleteMany({
      where: { planId: { in: stale.map((p) => p.id) } },
    });
    await prisma.maintenancePlan.deleteMany({
      where: { id: { in: stale.map((p) => p.id) } },
    });
    console.log(`Removed ${stale.length} legacy/stale plan(s).`);
  }

  const strayActive = refreshed.filter(
    (p) => !expectedNames.has(p.name) && p._count.subscriptions > 0,
  );
  if (strayActive.length > 0) {
    await prisma.maintenancePlan.updateMany({
      where: { id: { in: strayActive.map((p) => p.id) } },
      data: { active: false },
    });
    console.log(`Deactivated ${strayActive.length} non-OilCare plan(s) with subscribers.`);
  }

  for (let i = 0; i < PLAN_TEMPLATES.length; i++) {
    const p = PLAN_TEMPLATES[i]!.plan;
    if (claimed.has(p.name)) {
      console.log(`Plan already migrated: ${p.name}`);
      continue;
    }

    const found = await prisma.maintenancePlan.findFirst({
      where: { shopId: SHOP_ID, name: p.name },
    });

    if (found) {
      await applyTemplateToPlan(found.id, i);
      console.log(`Updated plan: ${p.name}`);
    } else {
      const t = PLAN_TEMPLATES[i]!;
      await prisma.maintenancePlan.create({
        data: {
          shopId: SHOP_ID,
          name: p.name,
          tagline: p.tagline ?? null,
          idealFor: p.idealFor ?? null,
          archetype: p.archetype,
          scope: p.scope,
          maxVehicles: p.maxVehicles ?? null,
          termMonths: p.termMonths,
          autoRenew: p.autoRenew,
          allowRollover: p.allowRollover,
          transferable: p.transferable,
          useClassPricing: p.useClassPricing,
          retailCents: p.retailCents ?? null,
          payInFullCents: p.payInFullCents ?? null,
          monthlyCents: p.monthlyCents ?? null,
          monthlyTermMonths: p.monthlyTermMonths ?? null,
          annualCents: p.annualCents ?? null,
          featured: p.featured ?? false,
          sortOrder: i,
          active: true,
          terms: p.terms ?? OILCARE_TERMS_DEFAULT,
          entitlements: {
            create: p.entitlements.map((e, j) => ({
              shopId: SHOP_ID,
              kind: e.kind,
              label: e.label,
              quantity: e.quantity ?? null,
              intervalDays: e.intervalDays ?? null,
              discountBps: e.discountBps ?? null,
              creditCents: e.creditCents ?? null,
              sortOrder: j,
            })),
          },
        },
      });
      console.log(`Created plan: ${p.name}`);
    }
  }
}

async function main() {
  const shop = await prisma.shop.findUnique({ where: { id: SHOP_ID } });
  if (!shop) {
    console.error("shop_demo not found — run db:seed first.");
    process.exit(1);
  }

  await prisma.maintenanceProgramSettings.upsert({
    where: { shopId: SHOP_ID },
    create: {
      shopId: SHOP_ID,
      enabled: true,
      plansSlug: "in-and-out-autohaus",
      heroTitle: "OilCare Club",
      heroSubtitle:
        "Three plans. One mission: your car, always ready. Less than the cost of a streaming subscription — we handle your oil changes, rotations, inspections, and emergencies so you don't have to think about it. Pay monthly or save 11% paying annually. Cancel anytime after 90 days.",
      termsDefault: OILCARE_TERMS_DEFAULT,
    },
    update: {
      enabled: true,
      plansSlug: "in-and-out-autohaus",
      heroTitle: "OilCare Club",
      heroSubtitle:
        "Three plans. One mission: your car, always ready. Less than the cost of a streaming subscription — we handle your oil changes, rotations, inspections, and emergencies so you don't have to think about it. Pay monthly or save 11% paying annually. Cancel anytime after 90 days.",
      termsDefault: OILCARE_TERMS_DEFAULT,
    },
  });

  await syncOilCarePlans();
  await backfillAllSubscriptionEntitlements();

  const subs = await prisma.planSubscription.count({ where: { shopId: SHOP_ID } });
  if (subs > 0) {
    console.log("Subscribers already exist — skipping demo enrollments.");
    return;
  }

  const tabish = await prisma.customer.findFirst({
    where: { shopId: SHOP_ID, lastName: "David", firstName: "Tabish" },
    include: { vehicles: { take: 1 } },
  });
  const essentialsPlan = await prisma.maintenancePlan.findFirst({
    where: { shopId: SHOP_ID, name: "OilCare Essentials" },
    include: { entitlements: true },
  });

  if (tabish && essentialsPlan && tabish.vehicles[0]) {
    const startsAt = addMonths(new Date(), -4);
    const endsAt = addMonths(startsAt, essentialsPlan.termMonths);
    const sub = await prisma.planSubscription.create({
      data: {
        shopId: SHOP_ID,
        planId: essentialsPlan.id,
        customerId: tabish.id,
        status: "ACTIVE",
        paymentMode: "ANNUAL",
        startsAt,
        endsAt,
        vehicles: {
          create: { shopId: SHOP_ID, vehicleId: tabish.vehicles[0].id },
        },
        payments: {
          create: {
            shopId: SHOP_ID,
            amountCents: essentialsPlan.annualCents ?? 31900,
            method: "CARD",
            stripePaymentId: "mock_demo_tabish",
          },
        },
      },
    });

    const subEnts = await Promise.all(
      essentialsPlan.entitlements.map((pe) =>
        prisma.subscriptionEntitlement.create({
          data: {
            shopId: SHOP_ID,
            subscriptionId: sub.id,
            planEntitlementId: pe.id,
            usedCount: pe.kind === "COUNTED" && pe.label.includes("oil") ? 2 : 0,
            remainingCount:
              pe.kind === "COUNTED" && pe.quantity
                ? pe.label.includes("oil")
                  ? pe.quantity - 2
                  : pe.quantity
                : pe.kind === "COUNTED"
                  ? 0
                  : null,
          },
        }),
      ),
    );

    const oilEnt = subEnts.find((_, i) =>
      essentialsPlan.entitlements[i]?.label.toLowerCase().includes("oil change"),
    );
    const rotEnt = subEnts.find((_, i) =>
      essentialsPlan.entitlements[i]?.label.toLowerCase().includes("rotation"),
    );

    await prisma.planRedemption.create({
      data: {
        shopId: SHOP_ID,
        subscriptionId: sub.id,
        vehicleId: tabish.vehicles[0].id,
        mileageIn: 42100,
        items: {
          create: [oilEnt, rotEnt]
            .filter(Boolean)
            .map((e) => ({
              shopId: SHOP_ID,
              subscriptionEntitlementId: e!.id,
              quantity: 1,
            })),
        },
      },
    });

    console.log("Enrolled Tabish David on OilCare Essentials (2/3 oil used).");
  }

  const mark = await prisma.customer.findFirst({
    where: { shopId: SHOP_ID, lastName: "Johnson", firstName: "Mark" },
    include: { vehicles: { take: 1 } },
  });
  const premiumPlan = await prisma.maintenancePlan.findFirst({
    where: { shopId: SHOP_ID, name: "OilCare Premium" },
    include: { entitlements: true },
  });

  if (mark && premiumPlan && mark.vehicles[0]) {
    const startsAt = new Date();
    const endsAt = addMonths(startsAt, premiumPlan.termMonths);
    await prisma.planSubscription.create({
      data: {
        shopId: SHOP_ID,
        planId: premiumPlan.id,
        customerId: mark.id,
        status: "ACTIVE",
        paymentMode: "MONTHLY",
        startsAt,
        endsAt,
        vehicles: {
          create: { shopId: SHOP_ID, vehicleId: mark.vehicles[0].id },
        },
        payments: {
          create: {
            shopId: SHOP_ID,
            amountCents: premiumPlan.monthlyCents ?? 3999,
            method: "CARD",
            stripePaymentId: "mock_demo_mark_m1",
          },
        },
        entitlements: {
          create: premiumPlan.entitlements.map((pe) => ({
            shopId: SHOP_ID,
            planEntitlementId: pe.id,
            usedCount: 0,
            remainingCount: pe.kind === "COUNTED" ? pe.quantity : null,
          })),
        },
      },
    });
    console.log("Enrolled Mark Johnson on OilCare Premium (monthly, fresh).");
  }

  console.log("\nMockup URLs:");
  console.log("  Public plans:  /plans/in-and-out-autohaus  (also /plans/io)");
  console.log("  Subscribers:   /maintenance-programs/subscribers");
  console.log("  Express:       /maintenance-programs/redeem");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
