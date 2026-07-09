"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { appUrl } from "@/lib/app-url";
import {
  MaintenancePlanInputSchema,
  MaintenancePlanDraftSchema,
  MaintenancePlanPricingSchema,
  ProgramSettingsInputSchema,
  normalizePlanPricingOnSave,
  planHasPricing,
  type MaintenancePlanInput,
  type MaintenancePlanDraftInput,
  type MaintenancePlanPricingInput,
} from "@/lib/maintenance-programs";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";
import { PLANS } from "@/lib/plans";
import {
  ensureProgramSettings,
  getMaintenancePlan,
  getMarketingMaintenancePrograms,
} from "@/server/maintenance-programs";
import { gates } from "@/server/permission-gates";

export type MaintenanceActionResult = { ok: true; id?: string } | { ok: false; error: string };

async function requireMaintenanceFeature(shopId: string): Promise<MaintenanceActionResult | null> {
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const allowed = await canUseFeature(shopId, "maintenance_programs");
  if (!allowed) {
    return { ok: false, error: `Maintenance programs require ${PLANS.ENTERPRISE.name}.` };
  }
  return null;
}

/** Admin payload for Marketing → Maintenance Programs. */
export async function getMarketingMaintenanceProgramsAdmin() {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return null;
  const data = await getMarketingMaintenancePrograms(shopId);
  if (!data) return null;

  const plansPath = `/plans/${data.slug}`;
  const plansUrl = await appUrl(plansPath);

  return {
    ...data,
    plansUrl,
    embedIframe: `<iframe src="${plansUrl}" title="Maintenance plans" width="100%" height="900" style="border:0;border-radius:8px;" loading="lazy"></iframe>`,
    embedLink: `<a href="${plansUrl}" target="_blank" rel="noopener noreferrer">View maintenance plans</a>`,
  };
}

export async function updateMaintenanceProgramSettings(
  input: z.infer<typeof ProgramSettingsInputSchema>,
): Promise<MaintenanceActionResult> {
  const parsed = ProgramSettingsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopId = await getShopId();
  const blocked = await requireMaintenanceFeature(shopId);
  if (blocked) return blocked;

  const conflict = await prisma.maintenanceProgramSettings.findFirst({
    where: {
      plansSlug: parsed.data.plansSlug,
      NOT: { shopId },
    },
    select: { id: true },
  });
  if (conflict) {
    return { ok: false, error: "That plans URL is already taken. Choose another slug." };
  }

  await ensureProgramSettings(shopId);
  await prisma.maintenanceProgramSettings.update({
    where: { shopId },
    data: {
      enabled: parsed.data.enabled,
      plansSlug: parsed.data.plansSlug,
      heroTitle: parsed.data.heroTitle?.trim() || null,
      heroSubtitle: parsed.data.heroSubtitle?.trim() || null,
      termsDefault: parsed.data.termsDefault?.trim() || null,
      ...(parsed.data.pageTemplate ? { pageTemplate: parsed.data.pageTemplate } : {}),
      ...(parsed.data.themeConfig !== undefined
        ? { themeConfig: parsed.data.themeConfig ?? undefined }
        : {}),
    },
  });

  revalidatePath("/marketing/maintenance-programs");
  revalidatePath(`/plans/${parsed.data.plansSlug}`);
  return { ok: true };
}

function normalizeEntitlements(input: MaintenancePlanInput) {
  return input.entitlements.map((e, i) => ({
    programServiceId: e.programServiceId ?? null,
    cannedJobId: e.cannedJobId ?? null,
    kind: e.kind,
    label: e.label.trim(),
    quantity: e.kind === "COUNTED" || e.kind === "COUPON" || e.kind === "ACCESS" ? (e.quantity ?? 1) : null,
    intervalDays:
      e.kind === "INTERVAL" || e.kind === "UNLIMITED" ? (e.intervalDays ?? 90) : null,
    discountBps: e.kind === "DISCOUNT" ? (e.discountBps ?? 0) : null,
    discountCapCents: e.kind === "DISCOUNT" ? (e.discountCapCents ?? null) : null,
    creditCents: e.kind === "CREDIT" ? (e.creditCents ?? 0) : null,
    sortOrder: i,
  }));
}

export async function createMaintenancePlan(
  input: MaintenancePlanInput | MaintenancePlanDraftInput,
): Promise<MaintenanceActionResult> {
  const parsed = MaintenancePlanDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid plan." };
  }
  if (!parsed.data.entitlements.filter((e) => e.label.trim()).length) {
    return { ok: false, error: "Add at least one included service." };
  }

  const shopId = await getShopId();
  const blocked = await requireMaintenanceFeature(shopId);
  if (blocked) return blocked;

  const priced = planHasPricing(parsed.data);
  const active = priced ? parsed.data.active : false;
  const pricing = normalizePlanPricingOnSave({
    payInFullCents: parsed.data.payInFullCents,
    monthlyCents: parsed.data.monthlyCents,
    monthlyTermMonths: parsed.data.monthlyTermMonths,
    annualCents: parsed.data.annualCents,
  });

  const maxSort = await prisma.maintenancePlan.aggregate({
    where: { shopId },
    _max: { sortOrder: true },
  });

  const plan = await prisma.maintenancePlan.create({
    data: {
      shopId,
      name: parsed.data.name.trim(),
      tagline: parsed.data.tagline?.trim() || null,
      description: parsed.data.description?.trim() || null,
      idealFor: parsed.data.idealFor?.trim() || null,
      archetype: parsed.data.archetype,
      scope: parsed.data.scope,
      maxVehicles: parsed.data.scope === "PER_HOUSEHOLD" ? parsed.data.maxVehicles : null,
      termMonths: parsed.data.termMonths,
      autoRenew: parsed.data.autoRenew,
      allowRollover: parsed.data.allowRollover,
      transferable: parsed.data.transferable,
      useClassPricing: parsed.data.useClassPricing,
      retailCents: parsed.data.retailCents ?? null,
      payInFullCents: pricing.payInFullCents,
      monthlyCents: pricing.monthlyCents,
      monthlyTermMonths: pricing.monthlyTermMonths,
      annualCents: pricing.annualCents,
      featured: parsed.data.featured,
      active,
      terms: parsed.data.terms?.trim() || null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      entitlements: {
        create: normalizeEntitlements(parsed.data).map((e) => ({ shopId, ...e })),
      },
      classPrices: parsed.data.useClassPricing
        ? {
            create: parsed.data.classPrices.map((c) => ({
              shopId,
              vehicleClass: c.vehicleClass,
              payInFullCents: c.payInFullCents ?? null,
              monthlyCents: c.monthlyCents ?? null,
              annualCents:
                c.payInFullCents != null && c.payInFullCents > 0
                  ? c.payInFullCents
                  : (c.annualCents ?? null),
              surchargeCents: c.surchargeCents ?? null,
            })),
          }
        : undefined,
    },
    select: { id: true },
  });

  revalidatePath("/marketing/maintenance-programs");
  return { ok: true, id: plan.id };
}

export async function updateMaintenancePlan(
  planId: string,
  input: MaintenancePlanInput | MaintenancePlanDraftInput,
): Promise<MaintenanceActionResult> {
  const parsed = MaintenancePlanDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid plan." };
  }
  if (!parsed.data.entitlements.filter((e) => e.label.trim()).length) {
    return { ok: false, error: "Add at least one included service." };
  }

  const shopId = await getShopId();
  const blocked = await requireMaintenanceFeature(shopId);
  if (blocked) return blocked;

  const existing = await getMaintenancePlan(shopId, planId);
  if (!existing) return { ok: false, error: "Plan not found." };

  const priced = planHasPricing(parsed.data);
  let active = parsed.data.active;
  if (!priced) active = false;
  else if (parsed.data.active && !planHasPricing(existing) && priced) {
    active = parsed.data.active;
  }

  const pricing = normalizePlanPricingOnSave({
    payInFullCents: parsed.data.payInFullCents,
    monthlyCents: parsed.data.monthlyCents,
    monthlyTermMonths: parsed.data.monthlyTermMonths,
    annualCents: parsed.data.annualCents,
  });

  await prisma.$transaction([
    prisma.planEntitlement.deleteMany({ where: { planId, shopId } }),
    prisma.planVehicleClassPrice.deleteMany({ where: { planId, shopId } }),
    prisma.maintenancePlan.update({
      where: { id: planId },
      data: {
        name: parsed.data.name.trim(),
        tagline: parsed.data.tagline?.trim() || null,
        description: parsed.data.description?.trim() || null,
        idealFor: parsed.data.idealFor?.trim() || null,
        archetype: parsed.data.archetype,
        scope: parsed.data.scope,
        maxVehicles: parsed.data.scope === "PER_HOUSEHOLD" ? parsed.data.maxVehicles : null,
        termMonths: parsed.data.termMonths,
        autoRenew: parsed.data.autoRenew,
        allowRollover: parsed.data.allowRollover,
        transferable: parsed.data.transferable,
        useClassPricing: parsed.data.useClassPricing,
        retailCents: parsed.data.retailCents ?? null,
        payInFullCents: pricing.payInFullCents,
        monthlyCents: pricing.monthlyCents,
        monthlyTermMonths: pricing.monthlyTermMonths,
        annualCents: pricing.annualCents,
        featured: parsed.data.featured,
        active,
        terms: parsed.data.terms?.trim() || null,
        entitlements: {
          create: normalizeEntitlements(parsed.data).map((e) => ({ shopId, ...e })),
        },
        classPrices: parsed.data.useClassPricing
          ? {
              create: parsed.data.classPrices.map((c) => ({
                shopId,
                vehicleClass: c.vehicleClass,
                payInFullCents: c.payInFullCents ?? null,
                monthlyCents: c.monthlyCents ?? null,
                annualCents:
                  c.payInFullCents != null && c.payInFullCents > 0
                    ? c.payInFullCents
                    : (c.annualCents ?? null),
                surchargeCents: c.surchargeCents ?? null,
              })),
            }
          : undefined,
      },
    }),
  ]);

  revalidatePath("/marketing/maintenance-programs");
  revalidatePath(`/marketing/maintenance-programs/plans/${planId}`);
  return { ok: true, id: planId };
}

export async function updateMaintenancePlanPricing(
  planId: string,
  input: MaintenancePlanPricingInput,
): Promise<MaintenanceActionResult> {
  const parsed = MaintenancePlanPricingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid pricing." };
  }
  if (!planHasPricing(parsed.data)) {
    return { ok: false, error: "Set at least one customer price before publishing." };
  }

  const shopId = await getShopId();
  const blocked = await requireMaintenanceFeature(shopId);
  if (blocked) return blocked;

  const existing = await getMaintenancePlan(shopId, planId);
  if (!existing) return { ok: false, error: "Plan not found." };

  const pricing = normalizePlanPricingOnSave({
    payInFullCents: parsed.data.payInFullCents,
    monthlyCents: parsed.data.monthlyCents,
    monthlyTermMonths: parsed.data.monthlyTermMonths,
    annualCents: parsed.data.annualCents,
  });

  await prisma.$transaction([
    prisma.planVehicleClassPrice.deleteMany({ where: { planId, shopId } }),
    prisma.maintenancePlan.update({
      where: { id: planId },
      data: {
        retailCents: parsed.data.retailCents ?? null,
        payInFullCents: pricing.payInFullCents,
        monthlyCents: pricing.monthlyCents,
        monthlyTermMonths: pricing.monthlyTermMonths,
        annualCents: pricing.annualCents,
        useClassPricing: parsed.data.useClassPricing,
        active: parsed.data.publish,
        classPrices: parsed.data.useClassPricing
          ? {
              create: parsed.data.classPrices.map((c) => ({
                shopId,
                vehicleClass: c.vehicleClass,
                payInFullCents: c.payInFullCents ?? null,
                monthlyCents: c.monthlyCents ?? null,
                annualCents:
                  c.payInFullCents != null && c.payInFullCents > 0
                    ? c.payInFullCents
                    : (c.annualCents ?? null),
                surchargeCents: c.surchargeCents ?? null,
              })),
            }
          : undefined,
      },
    }),
  ]);

  revalidatePath("/marketing/maintenance-programs");
  revalidatePath(`/marketing/maintenance-programs/plans/${planId}`);
  return { ok: true, id: planId };
}

export async function deleteMaintenancePlan(planId: string): Promise<MaintenanceActionResult> {
  const shopId = await getShopId();
  const blocked = await requireMaintenanceFeature(shopId);
  if (blocked) return blocked;

  const subs = await prisma.planSubscription.count({
    where: {
      planId,
      shopId,
      status: { notIn: ["CANCELLED", "EXPIRED"] },
    },
  });
  if (subs > 0) {
    return {
      ok: false,
      error: `Cannot delete — ${subs} subscriber${subs === 1 ? "" : "s"} enrolled. Cancel or migrate ${
        subs === 1 ? "the subscriber" : "subscribers"
      } first.`,
    };
  }

  const existing = await getMaintenancePlan(shopId, planId);
  if (!existing) return { ok: false, error: "Plan not found." };

  await prisma.maintenancePlan.delete({ where: { id: planId } });
  revalidatePath("/marketing/maintenance-programs");
  return { ok: true };
}

/** Add a program service to an existing plan (edit mode). */
export async function addServiceToPlan(
  planId: string,
  programServiceId: string,
  overrides?: { quantity?: number; intervalDays?: number },
): Promise<MaintenanceActionResult> {
  const shopId = await getShopId();
  const blocked = await requireMaintenanceFeature(shopId);
  if (blocked) return blocked;

  const [plan, service] = await Promise.all([
    getMaintenancePlan(shopId, planId),
    prisma.maintenanceProgramService.findFirst({ where: { id: programServiceId, shopId, active: true } }),
  ]);
  if (!plan) return { ok: false, error: "Plan not found." };
  if (!service) return { ok: false, error: "Service not found." };

  const { programServiceToEntitlement } = await import("@/lib/maintenance-programs");
  const base = programServiceToEntitlement({
    id: service.id,
    name: service.name,
    cannedJobId: service.cannedJobId,
    serviceType: service.serviceType as import("@/lib/maintenance-programs").ProgramServiceType,
    defaultQuantity: service.defaultQuantity,
    defaultIntervalDays: service.defaultIntervalDays,
    defaultDiscountBps: service.defaultDiscountBps,
  });

  const maxSort = plan.entitlements.reduce((m, e) => Math.max(m, e.sortOrder), -1);

  const row = await prisma.planEntitlement.create({
    data: {
      shopId,
      planId,
      programServiceId: service.id,
      cannedJobId: service.cannedJobId,
      kind: base.kind,
      label: base.label,
      quantity: overrides?.quantity ?? base.quantity,
      intervalDays: overrides?.intervalDays ?? base.intervalDays,
      discountBps: base.discountBps,
      sortOrder: maxSort + 1,
    },
    select: { id: true },
  });

  revalidatePath(`/marketing/maintenance-programs/plans/${planId}`);
  return { ok: true, id: row.id };
}

const EntitlementPatchSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  quantity: z.number().int().min(1).nullable().optional(),
  intervalDays: z.number().int().min(1).nullable().optional(),
  discountBps: z.number().int().min(0).max(10000).nullable().optional(),
});

/** Reorder plan entitlements after drag-and-drop (edit mode). */
export async function reorderPlanServices(
  planId: string,
  orderedEntitlementIds: string[],
): Promise<MaintenanceActionResult> {
  const shopId = await getShopId();
  const blocked = await requireMaintenanceFeature(shopId);
  if (blocked) return blocked;

  const plan = await getMaintenancePlan(shopId, planId);
  if (!plan) return { ok: false, error: "Plan not found." };

  await prisma.$transaction(
    orderedEntitlementIds.map((id, sortOrder) =>
      prisma.planEntitlement.updateMany({
        where: { id, planId, shopId },
        data: { sortOrder },
      }),
    ),
  );

  revalidatePath(`/marketing/maintenance-programs/plans/${planId}`);
  return { ok: true, id: planId };
}

/** Update a single plan entitlement field. */
export async function updatePlanService(
  planId: string,
  entitlementId: string,
  patch: z.infer<typeof EntitlementPatchSchema>,
): Promise<MaintenanceActionResult> {
  const parsed = EntitlementPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopId = await getShopId();
  const blocked = await requireMaintenanceFeature(shopId);
  if (blocked) return blocked;

  const row = await prisma.planEntitlement.findFirst({
    where: { id: entitlementId, planId, shopId },
  });
  if (!row) return { ok: false, error: "Service not found on this plan." };

  await prisma.planEntitlement.update({
    where: { id: entitlementId },
    data: parsed.data,
  });

  revalidatePath(`/marketing/maintenance-programs/plans/${planId}`);
  return { ok: true, id: entitlementId };
}

/** Remove a service from a plan. */
export async function removePlanService(
  planId: string,
  entitlementId: string,
): Promise<MaintenanceActionResult> {
  const shopId = await getShopId();
  const blocked = await requireMaintenanceFeature(shopId);
  if (blocked) return blocked;

  const row = await prisma.planEntitlement.findFirst({
    where: { id: entitlementId, planId, shopId },
  });
  if (!row) return { ok: false, error: "Service not found on this plan." };

  await prisma.planEntitlement.delete({ where: { id: entitlementId } });

  revalidatePath(`/marketing/maintenance-programs/plans/${planId}`);
  return { ok: true };
}

export async function archiveMaintenancePlan(planId: string): Promise<MaintenanceActionResult> {
  const shopId = await getShopId();
  const blocked = await requireMaintenanceFeature(shopId);
  if (blocked) return blocked;

  const existing = await getMaintenancePlan(shopId, planId);
  if (!existing) return { ok: false, error: "Plan not found." };

  await prisma.maintenancePlan.update({
    where: { id: planId },
    data: { active: false },
  });
  revalidatePath("/marketing/maintenance-programs");
  return { ok: true };
}

/** Duplicate an existing plan as a draft copy. */
export async function duplicateMaintenancePlan(planId: string): Promise<MaintenanceActionResult> {
  const shopId = await getShopId();
  const blocked = await requireMaintenanceFeature(shopId);
  if (blocked) return blocked;

  const existing = await getMaintenancePlan(shopId, planId);
  if (!existing) return { ok: false, error: "Plan not found." };

  const maxSort = await prisma.maintenancePlan.aggregate({
    where: { shopId },
    _max: { sortOrder: true },
  });

  const copy = await prisma.maintenancePlan.create({
    data: {
      shopId,
      name: `${existing.name} (copy)`,
      tagline: existing.tagline,
      description: existing.description,
      idealFor: existing.idealFor,
      archetype: existing.archetype,
      scope: existing.scope,
      maxVehicles: existing.maxVehicles,
      termMonths: existing.termMonths,
      autoRenew: existing.autoRenew,
      allowRollover: existing.allowRollover,
      transferable: existing.transferable,
      useClassPricing: existing.useClassPricing,
      retailCents: existing.retailCents,
      payInFullCents: existing.payInFullCents,
      monthlyCents: existing.monthlyCents,
      monthlyTermMonths: existing.monthlyTermMonths,
      annualCents: existing.annualCents,
      featured: false,
      active: false,
      terms: existing.terms,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      entitlements: {
        create: existing.entitlements.map((e) => ({
          shopId,
          programServiceId: e.programServiceId,
          cannedJobId: e.cannedJobId,
          kind: e.kind,
          label: e.label,
          quantity: e.quantity,
          intervalDays: e.intervalDays,
          discountBps: e.discountBps,
          discountCapCents: e.discountCapCents,
          creditCents: e.creditCents,
          sortOrder: e.sortOrder,
        })),
      },
      classPrices: existing.useClassPricing
        ? {
            create: existing.classPrices.map((c) => ({
              shopId,
              vehicleClass: c.vehicleClass,
              payInFullCents: c.payInFullCents,
              monthlyCents: c.monthlyCents,
              annualCents: c.annualCents,
              surchargeCents: c.surchargeCents,
            })),
          }
        : undefined,
    },
    select: { id: true },
  });

  revalidatePath("/marketing/maintenance-programs");
  return { ok: true, id: copy.id };
}

const CreateFromTemplateInput = z.object({ templateId: z.string().min(1) });

export async function createPlanFromTemplate(
  input: z.infer<typeof CreateFromTemplateInput>,
): Promise<MaintenanceActionResult> {
  const { PLAN_TEMPLATES } = await import("@/lib/maintenance-programs");
  const parsed = CreateFromTemplateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid template." };

  const template = PLAN_TEMPLATES.find((t) => t.id === parsed.data.templateId);
  if (!template) return { ok: false, error: "Template not found." };

  return createMaintenancePlan(template.plan);
}
