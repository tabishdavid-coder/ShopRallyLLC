"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { publicUrl } from "@/lib/app-url";
import {
  emptyPlatformShopForm,
  parsePlatformShopForm,
  type PlatformShopFormState,
} from "@/lib/platform-shop-form";
import { checkRateLimit } from "@/lib/rate-limit";
import { requirePlatformAdmin } from "@/lib/platform";
import { buildMailtoUrl, emailConfigured, getEmail } from "@/server/services/email";
import { checkShopLegalCompliance } from "@/server/legal";
import { recordPlatformAuditEvent } from "@/server/platform/audit";
import { provisionPlatformShop } from "@/server/platform/provision-shop";
import { PlatformAuditEventType, ShopProvisionMethod, ShopStatus } from "@/generated/prisma";

const INTAKE_DAYS = 14;

export type IntakeActionResult =
  | { ok: true; intakeUrl: string; emailSent: boolean; mailtoUrl?: string }
  | { ok: false; error: string };

export type SubmitIntakeResult =
  | { ok: true; shopName: string }
  | { ok: false; error: string };

export type ActivatePendingResult =
  | { ok: true; shopId: string; masterId: string; shopName: string }
  | { ok: false; error: string };

const InviteInput = z.object({
  prospectEmail: z.string().trim().email("Enter a valid email address."),
  prospectName: z.string().trim().max(120).optional(),
});

/** Platform admin: generate intake link and optionally email the prospect. */
export async function createShopIntakeInvite(
  raw: z.infer<typeof InviteInput>,
): Promise<IntakeActionResult> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Platform admin access required." };
  }

  const parsed = InviteInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid invite details." };
  }

  const platform = await prisma.platform.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!platform) return { ok: false, error: "No platform record found." };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INTAKE_DAYS);

  const tokenRow = await prisma.shopIntakeToken.create({
    data: {
      platformId: platform.id,
      prospectEmail: parsed.data.prospectEmail.trim(),
      prospectName: parsed.data.prospectName?.trim() || null,
      expiresAt,
    },
    select: { token: true },
  });

  const intakeUrl = publicUrl(`/onboard/shop/${tokenRow.token}`);
  const subject = "Complete your ShopRally shop setup";
  const body = [
    parsed.data.prospectName ? `Hi ${parsed.data.prospectName},` : "Hello,",
    "",
    "ShopRally invited you to complete your shop onboarding form. It takes about 5 minutes.",
    "",
    intakeUrl,
    "",
    `This link expires in ${INTAKE_DAYS} days and can only be used once.`,
    "",
    "— ShopRally Platform",
  ].join("\n");

  let emailSent = false;
  let mailtoUrl: string | undefined;

  if (emailConfigured()) {
    try {
      await getEmail().send(parsed.data.prospectEmail, subject, body);
      emailSent = true;
    } catch {
      mailtoUrl = buildMailtoUrl(parsed.data.prospectEmail, subject, body);
    }
  } else {
    mailtoUrl = buildMailtoUrl(parsed.data.prospectEmail, subject, body);
  }

  revalidatePath("/platform/shops");
  return { ok: true, intakeUrl, emailSent, mailtoUrl };
}

/** Public: load intake token metadata for the form. */
export async function getShopIntakeContext(token: string) {
  if (!token?.trim()) return null;

  const row = await prisma.shopIntakeToken.findUnique({
    where: { token: token.trim() },
    select: {
      prospectEmail: true,
      prospectName: true,
      expiresAt: true,
      usedAt: true,
      shopId: true,
    },
  });
  if (!row) return null;
  if (row.usedAt || row.shopId) return { status: "used" as const };
  if (row.expiresAt.getTime() < Date.now()) return { status: "expired" as const };

  return {
    status: "open" as const,
    prospectEmail: row.prospectEmail,
    prospectName: row.prospectName,
    expiresAt: row.expiresAt,
    defaults: emptyPlatformShopForm({
      email: row.prospectEmail,
      shopEmail: row.prospectEmail,
      primaryContactName: row.prospectName ?? "",
    }),
  };
}

/** Public: prospect submits intake → creates PENDING shop (master ID assigned server-side). */
export async function submitShopIntake(
  token: string,
  form: PlatformShopFormState,
  options?: { msaAcknowledged?: boolean },
): Promise<SubmitIntakeResult> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(`shop-intake:${ip}`, { max: 8, windowMs: 60_000 })) {
    return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
  }

  const tokenRow = await prisma.shopIntakeToken.findUnique({
    where: { token: token.trim() },
    select: { id: true, platformId: true, expiresAt: true, usedAt: true, shopId: true },
  });
  if (!tokenRow) return { ok: false, error: "This intake link is invalid." };
  if (tokenRow.usedAt || tokenRow.shopId) {
    return { ok: false, error: "This intake link has already been used." };
  }
  if (tokenRow.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This intake link has expired. Contact ShopRally for a new link." };
  }

  const parsed = parsePlatformShopForm(form);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  if (!options?.msaAcknowledged) {
    return {
      ok: false,
      error: "You must acknowledge the ShopRally platform agreements to continue.",
    };
  }

  try {
    const result = await provisionPlatformShop(tokenRow.platformId, {
      ...parsed.data,
      status: ShopStatus.PENDING,
      intakeTokenId: tokenRow.id,
      provisionMethod: ShopProvisionMethod.INTAKE_FORM,
      msaAcknowledged: true,
    });

    revalidatePath("/platform/onboarding");
    revalidatePath("/platform/shops");
    return { ok: true, shopName: result.name };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not save your shop details.";
    return { ok: false, error: msg };
  }
}

/** Platform admin: approve a PENDING intake shop → TRIAL and reveal master ID once. */
export async function activatePendingShop(shopId: string): Promise<ActivatePendingResult> {
  let admin;
  try {
    admin = await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Platform admin access required." };
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      name: true,
      status: true,
      masterId: true,
      platformId: true,
      msaAcknowledgedAt: true,
    },
  });
  if (!shop) return { ok: false, error: "Shop not found." };
  if (shop.status !== ShopStatus.PENDING) {
    return { ok: false, error: "Only pending intake shops can be activated." };
  }

  const legal = await checkShopLegalCompliance(shopId);
  if (!legal.compliant && !shop.msaAcknowledgedAt) {
    return {
      ok: false,
      error:
        "Shop must acknowledge MSA at intake or complete legal acceptance before activation.",
    };
  }

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      status: ShopStatus.TRIAL,
      lastActiveAt: new Date(),
    },
  });

  await recordPlatformAuditEvent({
    platformId: shop.platformId,
    shopId: shop.id,
    eventType: PlatformAuditEventType.SHOP_ACTIVATED,
    actorUserId: admin.id,
    actorEmail: admin.email,
    method: ShopProvisionMethod.INTAKE_FORM,
    metadata: { shopName: shop.name, masterId: shop.masterId },
  });

  revalidatePath("/platform/onboarding");
  revalidatePath("/platform/shops");
  revalidatePath(`/platform/shops/${shopId}`);

  return {
    ok: true,
    shopId: shop.id,
    masterId: shop.masterId,
    shopName: shop.name,
  };
}
