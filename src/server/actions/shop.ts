"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";
import type { Transparency } from "@/lib/transparency";
import type { Commissions } from "@/lib/commissions";

export type ShopActionResult = { ok: true } | { ok: false; error: string };

const trimmedOrNull = z
  .string()
  .trim()
  .transform((s) => (s.length ? s : null))
  .nullable()
  .optional();

const ShopProfilePatch = z.object({
  // Identity card
  name: z.string().trim().min(1, "Shop name is required.").optional(),
  shopIdLabel: trimmedOrNull,
  licenseNo: trimmedOrNull,
  taxId: trimmedOrNull,
  // Address
  address: trimmedOrNull,
  address2: trimmedOrNull,
  city: trimmedOrNull,
  state: trimmedOrNull,
  zip: trimmedOrNull,
  // Contact
  phone: trimmedOrNull,
  email: trimmedOrNull,
  website: trimmedOrNull,
  // Logo (data URL or hosted path; null to clear)
  logoUrl: z.string().nullable().optional(),
});

export type ShopProfilePatch = z.infer<typeof ShopProfilePatch>;

/**
 * Update the current shop's profile. Accepts a partial patch so each card on the
 * Shop Profile tab (identity / address / contact / logo) can save independently.
 * This is the single source of truth — name/address/phone/email/website/logo are
 * read by the print documents, estimate share, and anywhere the shop is shown.
 */
export async function updateShopProfile(patch: ShopProfilePatch): Promise<ShopActionResult> {
  const parsed = ShopProfilePatch.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  // Drop undefined keys so we only update fields that were actually sent.
  const data = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );
  if (Object.keys(data).length === 0) return { ok: true };

  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };
  await prisma.shop.update({ where: { id: shopId }, data });

  // The shop feeds many surfaces — refresh the ones that render it.
  revalidatePath("/settings");
  revalidatePath("/marketing/payment-account");
  revalidatePath("/settings/payments");
  revalidatePath("/payments/account");
  revalidatePath("/dashboard");
  revalidatePath("/repair-orders", "layout");
  return { ok: true };
}

/* ───────────────────────── Appointments ───────────────────────── */

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM.");
const AppointmentsInput = z.object({
  apptDayStart: HHMM,
  apptDayEnd: HHMM,
  apptDefaultDurationMins: z.number().int().min(5).max(600),
});

export async function updateAppointments(input: z.infer<typeof AppointmentsInput>): Promise<ShopActionResult> {
  const parsed = AppointmentsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  if (parsed.data.apptDayEnd <= parsed.data.apptDayStart) {
    return { ok: false, error: "End time must be after start time." };
  }
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };
  await prisma.shop.update({ where: { id: shopId }, data: parsed.data });
  revalidatePath("/settings/appointments");
  revalidatePath("/appointments");
  return { ok: true };
}

/* ───────────────────────── Online booking ───────────────────────── */

const BookingSlug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.")
  .min(2)
  .max(60);

const OnlineBookingInput = z.object({
  onlineBookingEnabled: z.boolean(),
  bookingSlug: BookingSlug,
});

export async function updateOnlineBooking(
  input: z.infer<typeof OnlineBookingInput>,
): Promise<ShopActionResult> {
  const parsed = OnlineBookingInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const conflict = await prisma.shop.findFirst({
    where: {
      bookingSlug: parsed.data.bookingSlug,
      NOT: { id: shopId },
    },
    select: { id: true },
  });
  if (conflict) {
    return { ok: false, error: "That booking URL is already taken. Choose another slug." };
  }

  await prisma.shop.update({
    where: { id: shopId },
    data: parsed.data,
  });

  revalidatePath("/settings/booking");
  revalidatePath(`/book/${parsed.data.bookingSlug}`);
  return { ok: true };
}

/* ───────────────────────── Transparency ───────────────────────── */

export async function updateTransparency(value: Transparency): Promise<ShopActionResult> {
  const Doc = z.object({
    laborHours: z.boolean(),
    partNumbers: z.boolean(),
    partBrand: z.boolean(),
    lineItemPrices: z.boolean(),
  });
  const parsed = z.object({ estimate: Doc, invoice: Doc }).safeParse(value);
  if (!parsed.success) return { ok: false, error: "Invalid transparency settings." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };
  await prisma.shop.update({ where: { id: shopId }, data: { docTransparency: parsed.data } });
  revalidatePath("/settings/ro-settings");
  revalidatePath("/settings/estimates-invoices");
  revalidatePath("/settings/markups/transparency");
  revalidatePath("/repair-orders", "layout");
  return { ok: true };
}

/* ───────────────────────── Commissions ───────────────────────── */

export async function updateCommissions(value: Commissions): Promise<ShopActionResult> {
  const parsed = z
    .object({
      laborBps: z.number().int().min(0).max(100000),
      partsBps: z.number().int().min(0).max(100000),
      basis: z.enum(["GROSS_PROFIT", "SALE"]),
    })
    .safeParse(value);
  if (!parsed.success) return { ok: false, error: "Invalid commission settings." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };
  await prisma.shop.update({ where: { id: shopId }, data: { commissions: parsed.data } });
  revalidatePath("/settings/commissions");
  return { ok: true };
}
