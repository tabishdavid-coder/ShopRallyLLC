"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import type { AdvancedSettings } from "@/lib/ro-settings";
import { gates } from "@/server/permission-gates";

export type RoSettingsResult = { ok: true } | { ok: false; error: string };

const Method = z.enum(["PERCENT", "FIXED"]);
const Base = z.enum(["LABOR", "PARTS", "LABOR_PARTS"]);

/** Percent (e.g. 3) → bps (300); dollars (e.g. 10.50) → cents (1050). */
const toCanonical = (amount: number) => Math.round(amount * 100);
const toCents = (dollars: number | null | undefined) =>
  dollars == null ? null : Math.round(dollars * 100);

function revalidateMoneySurfaces() {
  revalidatePath("/settings/ro-settings");
  revalidatePath("/repair-orders", "layout");
  revalidatePath("/job-board");
}

/* ───────────────────────── Labor Rates ───────────────────────── */

const LaborRateRow = z.object({
  name: z.string().trim().min(1, "Labor rate name is required."),
  rate: z.number().nonnegative(),
  isDefault: z.boolean(),
});

export async function saveLaborRates(rows: z.infer<typeof LaborRateRow>[]): Promise<RoSettingsResult> {
  const parsed = z.array(LaborRateRow).min(1, "Add at least one labor rate.").safeParse(rows);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  // Exactly one default; if none flagged, the first wins.
  const data = parsed.data;
  let defaultIdx = data.findIndex((r) => r.isDefault);
  if (defaultIdx < 0) defaultIdx = 0;
  const defaultRateCents = Math.round(data[defaultIdx].rate * 100);

  await prisma.$transaction([
    prisma.laborRate.deleteMany({ where: { shopId } }),
    prisma.laborRate.createMany({
      data: data.map((r, i) => ({
        shopId,
        name: r.name,
        rateCents: Math.round(r.rate * 100),
        isDefault: i === defaultIdx,
        sortOrder: i,
      })),
    }),
    // Default labor rate is the source of truth for new ROs + estimate base rate.
    prisma.shop.update({ where: { id: shopId }, data: { laborRateCents: defaultRateCents } }),
  ]);

  revalidateMoneySurfaces();
  return { ok: true };
}

/* ───────────────────────── Shop Fees ───────────────────────── */

const FeeRow = z.object({
  name: z.string().trim().min(1, "Fee name is required."),
  autoApply: z.boolean(),
  method: Method,
  base: Base,
  amount: z.number().nonnegative(),
  cap: z.number().nonnegative().nullable(),
  taxable: z.boolean(),
});

export async function saveShopFees(rows: z.infer<typeof FeeRow>[]): Promise<RoSettingsResult> {
  const parsed = z.array(FeeRow).safeParse(rows);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  await prisma.$transaction([
    prisma.shopFeeTemplate.deleteMany({ where: { shopId } }),
    prisma.shopFeeTemplate.createMany({
      data: parsed.data.map((r, i) => ({
        shopId,
        name: r.name,
        autoApply: r.autoApply,
        method: r.method,
        base: r.base,
        amount: toCanonical(r.amount),
        capCents: toCents(r.cap),
        taxable: r.taxable,
        sortOrder: i,
      })),
    }),
  ]);

  revalidateMoneySurfaces();
  return { ok: true };
}

/* ───────────────────────── Discounts ───────────────────────── */

const DiscountRow = z.object({
  name: z.string().trim().min(1, "Discount name is required."),
  method: Method,
  base: Base,
  amount: z.number().nonnegative(),
  cap: z.number().nonnegative().nullable(),
});

export async function saveDiscountTemplates(rows: z.infer<typeof DiscountRow>[]): Promise<RoSettingsResult> {
  const parsed = z.array(DiscountRow).safeParse(rows);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  await prisma.$transaction([
    prisma.shopDiscountTemplate.deleteMany({ where: { shopId } }),
    prisma.shopDiscountTemplate.createMany({
      data: parsed.data.map((r, i) => ({
        shopId,
        name: r.name,
        method: r.method,
        base: r.base,
        amount: toCanonical(r.amount),
        capCents: toCents(r.cap),
        sortOrder: i,
      })),
    }),
  ]);

  revalidateMoneySurfaces();
  return { ok: true };
}

/* ───────────────────────── Taxes ───────────────────────── */

const TaxInput = z.object({
  salesTaxPct: z.number().min(0).max(100),
  taxOnLabor: z.boolean(),
  taxOnParts: z.boolean(),
  taxOnFees: z.boolean(),
  cap: z.number().nonnegative().nullable(),
});

export async function saveTaxes(input: z.infer<typeof TaxInput>): Promise<RoSettingsResult> {
  const parsed = TaxInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      taxRateBps: Math.round(d.salesTaxPct * 100),
      taxOnLabor: d.taxOnLabor,
      taxOnParts: d.taxOnParts,
      taxOnFees: d.taxOnFees,
      taxCapCents: toCents(d.cap),
    },
  });

  revalidateMoneySurfaces();
  return { ok: true };
}

/* ───────────────────────── GP/hr Goal ───────────────────────── */

export async function saveGpGoal(goalDollars: number | null): Promise<RoSettingsResult> {
  const parsed = z.number().nonnegative().nullable().safeParse(goalDollars);
  if (!parsed.success) return { ok: false, error: "Enter a valid amount." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };
  await prisma.shop.update({ where: { id: shopId }, data: { gpPerHourGoalCents: toCents(parsed.data) } });
  revalidateMoneySurfaces();
  return { ok: true };
}

/* ───────────────────────── Advanced Settings ───────────────────────── */

const AdvancedInput = z.object({
  reqOdometer: z.boolean(),
  reqMarketingSource: z.boolean(),
  reqTechOnLabor: z.boolean(),
  reqJobCategory: z.boolean(),
  reqPoForParts: z.boolean(),
  reqBillingForParts: z.boolean(),
  reqPaymentCardType: z.boolean(),
  reqDotCodes: z.boolean(),
  reqDigitalSignature: z.boolean(),
  reqReturnPartsBeforeSave: z.boolean(),
  techHoursDisplay: z.enum(["JOB_COMPLETED", "RO_COMPLETED", "RO_POSTED"]),
});

export async function saveAdvancedSettings(input: AdvancedSettings): Promise<RoSettingsResult> {
  const parsed = AdvancedInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };
  await prisma.shop.update({ where: { id: shopId }, data: { roAdvanced: parsed.data } });
  revalidateMoneySurfaces();
  return { ok: true };
}

/* ───────────────────────── Job board auto-archive ───────────────────────── */

const ArchiveSettingsInput = z.object({
  enabled: z.boolean(),
  days: z.union([
    z.literal(7),
    z.literal(14),
    z.literal(30),
    z.literal(45),
    z.literal(60),
    z.literal(90),
  ]),
});

export async function saveCompletedRoArchiveSettings(
  input: z.infer<typeof ArchiveSettingsInput>,
): Promise<RoSettingsResult> {
  const parsed = ArchiveSettingsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      completedRoAutoArchiveEnabled: parsed.data.enabled,
      completedRoAutoArchiveDays: parsed.data.days,
    },
  });

  revalidatePath("/settings/ro-settings");
  revalidatePath("/job-board");
  revalidatePath("/dashboard");
  return { ok: true };
}
