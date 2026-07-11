"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { prisma } from "@/db/client";
import { isPlatformAdmin, requirePlatformAdmin } from "@/lib/platform";
import { ACTIVE_SHOP_COOKIE, canAccessShop } from "@/lib/shop";
import { recordShopCrmEntered } from "@/server/platform/shop-crm-access";
import {
  parsePlatformShopForm,
  type PlatformShopFormState,
} from "@/lib/platform-shop-form";
import { provisionPlatformShop } from "@/server/platform/provision-shop";
import { ShopStatus, ShopPlan, BillingStatus, ShopProvisionMethod, type Prisma } from "@/generated/prisma";
import {
  mergeReleaseFlagsIntoPlanFeatures,
  RELEASE_MODULES,
  type ReleaseFlagMap,
  type ReleaseModule,
} from "@/lib/release-flags";

const LegacyCreateShopInput = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(6),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  city: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(40).optional().nullable(),
  status: z.nativeEnum(ShopStatus).optional(),
  plan: z.nativeEnum(ShopPlan).optional(),
  billingStatus: z.nativeEnum(BillingStatus).optional(),
});

const UpdateShopInput = LegacyCreateShopInput.extend({
  id: z.string().min(1),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type CreateShopResult =
  | { ok: true; shopId: string; masterId: string; shopName: string }
  | { ok: false; error: string };

/** Switch active shop context (cookie). Platform admins may pick any shop. */
export async function switchShop(shopId: string): Promise<ActionResult> {
  if (!shopId) return { ok: false, error: "Shop is required." };

  const allowed = await canAccessShop(shopId);
  if (!allowed) return { ok: false, error: "You do not have access to this shop." };

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_SHOP_COOKIE, shopId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  if (await isPlatformAdmin()) {
    await recordShopCrmEntered(shopId, "switchShop");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Platform admin: provision a shop directly with full onboarding fields. */
export async function createPlatformShop(
  form: PlatformShopFormState,
  options?: { msaAcknowledged?: boolean },
): Promise<CreateShopResult> {
  let admin;
  try {
    admin = await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Platform admin access required." };
  }

  if (!options?.msaAcknowledged) {
    return {
      ok: false,
      error: "Confirm the shop will accept ShopRally agreements before go-live.",
    };
  }

  const parsed = parsePlatformShopForm(form);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const platform = await prisma.platform.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!platform) return { ok: false, error: "No platform record found." };

  const status =
    parsed.data.billingStatus === BillingStatus.TRIAL
      ? ShopStatus.TRIAL
      : ShopStatus.ACTIVE;

  try {
    const result = await provisionPlatformShop(platform.id, {
      ...parsed.data,
      status,
      provisionMethod: ShopProvisionMethod.PLATFORM_DIRECT,
      createdByUserId: admin.id,
      createdByEmail: admin.email,
      msaAcknowledged: true,
    });

    revalidatePath("/platform/shops");
    revalidatePath("/platform/onboarding");
    return {
      ok: true,
      shopId: result.shopId,
      masterId: result.masterId,
      shopName: result.name,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create shop.";
    return { ok: false, error: msg };
  }
}

export async function updatePlatformShop(
  raw: z.infer<typeof UpdateShopInput>,
): Promise<ActionResult> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Platform admin access required." };
  }

  const parsed = UpdateShopInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid shop details." };
  const d = parsed.data;

  await prisma.shop.update({
    where: { id: d.id },
    data: {
      name: d.name,
      code: d.code.toUpperCase(),
      phone: d.phone ?? null,
      email: d.email?.trim() || null,
      city: d.city ?? null,
      state: d.state ?? null,
      status: d.status ?? ShopStatus.ACTIVE,
      ...(d.plan !== undefined ? { plan: d.plan } : {}),
      ...(d.billingStatus !== undefined ? { billingStatus: d.billingStatus } : {}),
    },
  });

  revalidatePath("/platform/shops");
  revalidatePath(`/platform/shops/${d.id}`);
  return { ok: true };
}

const ReleaseFlagsPatch = z.record(z.string(), z.boolean());

/** Platform admin: flip per-shop release flags (deploy ≠ release). */
export async function updateShopReleaseFlags(
  shopId: string,
  patch: ReleaseFlagMap,
): Promise<ActionResult> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Platform admin access required." };
  }

  if (!shopId.trim()) return { ok: false, error: "Shop is required." };

  const parsed = ReleaseFlagsPatch.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid release flags." };

  const cleaned: ReleaseFlagMap = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (!(RELEASE_MODULES as readonly string[]).includes(key)) continue;
    if (typeof value !== "boolean") continue;
    cleaned[key as ReleaseModule] = value;
  }
  if (Object.keys(cleaned).length === 0) {
    return { ok: false, error: "No valid release flags to update." };
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { planFeatures: true },
  });
  if (!shop) return { ok: false, error: "Shop not found." };

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      planFeatures: mergeReleaseFlagsIntoPlanFeatures(
        shop.planFeatures,
        cleaned,
      ) as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/platform/shops");
  revalidatePath(`/platform/shops/${shopId}`);
  revalidatePath("/", "layout");
  return { ok: true };
}
