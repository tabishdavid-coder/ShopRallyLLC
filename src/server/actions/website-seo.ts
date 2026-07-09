"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { WebsiteBuildStatus } from "@/generated/prisma";
import { GROWTH_ENGINE, GROWTH_PRODUCTS } from "@/lib/growth-engine-brand";
import { PLANS } from "@/lib/plans";
import {
  WebsiteBuildRequestSchema,
  WebsiteConfigPatchSchema,
  WebsiteServicesSchema,
} from "@/lib/website-seo";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";
import { getCurrentUser } from "@/lib/platform";
import { ensureWebsiteConfig } from "@/server/website-seo";
import { submitShopSitemapToGsc } from "@/server/actions/google-search-console";
import { gates } from "@/server/permission-gates";

export type WebsiteSeoActionResult = { ok: true } | { ok: false; error: string };

async function requireWebsiteFeature(): Promise<{ shopId: string } | { error: string }> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { error: denied.error };
  const [hasShopSite, hasSeo] = await Promise.all([
    canUseFeature(shopId, "shop_site"),
    canUseFeature(shopId, "website_seo"),
  ]);
  if (!hasShopSite && !hasSeo) {
    return {
      error: `${GROWTH_PRODUCTS.shopSite.label} requires ${PLANS.ENTERPRISE.name}, a ShopSite subscription ($59/mo), or a plan upgrade. See Settings → Subscription.`,
    };
  }
  return { shopId };
}

export async function updateWebsiteConfig(
  raw: z.infer<typeof WebsiteConfigPatchSchema>,
): Promise<WebsiteSeoActionResult> {
  const gate = await requireWebsiteFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const parsed = WebsiteConfigPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (parsed.data.servicesJson) {
    const services = WebsiteServicesSchema.safeParse(parsed.data.servicesJson);
    if (!services.success) {
      return { ok: false, error: services.error.issues[0]?.message ?? "Invalid services." };
    }
  }

  await ensureWebsiteConfig(gate.shopId);

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) data[key] = value;
  }

  if (parsed.data.googleAnalyticsId === "") {
    data.googleAnalyticsId = null;
  }

  await prisma.shopWebsiteConfig.update({
    where: { shopId: gate.shopId },
    data,
  });

  revalidatePath("/marketing/website");
  const shop = await prisma.shop.findUnique({
    where: { id: gate.shopId },
    select: { bookingSlug: true, code: true },
  });
  if (shop) {
    const slug = shop.bookingSlug ?? shop.code.toLowerCase();
    revalidatePath(`/sites/${slug}`);
    revalidatePath(`/sites/${slug}/services`);
    revalidatePath(`/sites/${slug}/contact`);
  }
  return { ok: true };
}

export async function publishWebsite(published: boolean): Promise<WebsiteSeoActionResult> {
  const gate = await requireWebsiteFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  await ensureWebsiteConfig(gate.shopId);
  await prisma.shopWebsiteConfig.update({
    where: { shopId: gate.shopId },
    data: { published },
  });

  if (published) {
    try {
      await submitShopSitemapToGsc(gate.shopId);
    } catch (err) {
      console.warn("[website-seo] GSC sitemap submit failed:", err);
    }
  }

  revalidatePath("/marketing/website");
  revalidatePath("/marketing/seo-automation");
  const shop = await prisma.shop.findUnique({
    where: { id: gate.shopId },
    select: { bookingSlug: true, code: true },
  });
  if (shop) {
    const slug = shop.bookingSlug ?? shop.code.toLowerCase();
    revalidatePath(`/sites/${slug}`);
    revalidatePath(`/sites/${slug}/services`);
    revalidatePath(`/sites/${slug}/contact`);
  }
  return { ok: true };
}

export async function requestWebsiteBuild(
  raw: z.infer<typeof WebsiteBuildRequestSchema>,
): Promise<WebsiteSeoActionResult & { ticketId?: string }> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;

  const parsed = WebsiteBuildRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    select: { name: true },
  });

  const body = [
    `Shop: ${shop.name}`,
    "",
    "Goals:",
    parsed.data.goals,
    parsed.data.notes ? `\nAdditional notes:\n${parsed.data.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const ticket = await prisma.supportTicket.create({
    data: {
      shopId,
      name: parsed.data.name,
      email: parsed.data.email,
      subject: `[Website Build] ${shop.name}`,
      body,
      category: "WEBSITE_BUILD",
    },
  });

  await ensureWebsiteConfig(shopId);
  await prisma.shopWebsiteConfig.update({
    where: { shopId },
    data: { buildStatus: WebsiteBuildStatus.QUOTE_REQUESTED },
  });

  revalidatePath("/support");
  revalidatePath("/platform/websites");
  return { ok: true, ticketId: ticket.id };
}

/** Prefill managed-service request form. */
export async function getWebsiteBuildFormDefaults(): Promise<{ name: string; email: string }> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) throw new Error(denied.error);
  const user = await getCurrentUser();
  const name =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Shop User";
  return { name, email: user.email };
}
