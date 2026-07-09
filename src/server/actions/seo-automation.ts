"use server";

import { revalidatePath } from "next/cache";

import { SeoPropertyStatus } from "@/generated/prisma";
import { GROWTH_ENGINE, GROWTH_PRODUCTS } from "@/lib/growth-engine-brand";
import { PLANS } from "@/lib/plans";
import { AddExternalSeoPropertySchema } from "@/lib/seo-automation";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";
import { publicSitePath, siteSlugFromShop } from "@/lib/website-seo";
import { prisma } from "@/db/client";
import type { SeoStripeCatalogId } from "@/lib/seo-stripe-products";
import { SEO_STRIPE_CATALOG } from "@/lib/seo-stripe-products";
import { updateShopSeoSettings, dismissSeoRecommendation as dismissSeoRecommendationForShop, snoozeSeoRecommendation as snoozeSeoRecommendationForShop } from "@/server/seo-settings";
import { createSeoAddonCheckoutSession } from "@/server/services/seo-stripe-checkout";
import { runShopSeoContentGeneration } from "@/server/services/seo-content-generation";
import {
  addExternalSeoProperty,
  runSeoPropertyAudit,
  setSeoPropertyAutomation,
  setShopCustomDomain,
  verifySeoPropertyDomain,
} from "@/server/seo-automation";
import { gates } from "@/server/permission-gates";

export type SeoAutomationActionResult = { ok: true } | { ok: false; error: string };

async function requireSeoFeature(): Promise<{ shopId: string } | { error: string }> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { error: denied.error };
  const allowed = await canUseFeature(shopId, "website_seo");
  if (!allowed) {
    return {
      error: `${GROWTH_PRODUCTS.seoAutopilot.label} requires ${PLANS.ENTERPRISE.name} or a Local SEO subscription ($129/mo). Upgrade in Settings → Subscription.`,
    };
  }
  return { shopId };
}

export async function toggleSeoPropertyAutomation(
  propertyId: string,
  automationEnabled: boolean,
): Promise<SeoAutomationActionResult> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const result = await setSeoPropertyAutomation(gate.shopId, propertyId, {
    automationEnabled,
    status: automationEnabled ? SeoPropertyStatus.ACTIVE : SeoPropertyStatus.PAUSED,
  });
  if (!result.ok) return result;

  revalidatePath("/marketing/seo-automation");
  return { ok: true };
}

export async function pauseSeoProperty(propertyId: string): Promise<SeoAutomationActionResult> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const result = await setSeoPropertyAutomation(gate.shopId, propertyId, {
    automationEnabled: false,
    status: SeoPropertyStatus.PAUSED,
  });
  if (!result.ok) return result;

  revalidatePath("/marketing/seo-automation");
  return { ok: true };
}

export async function resumeSeoProperty(propertyId: string): Promise<SeoAutomationActionResult> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const result = await setSeoPropertyAutomation(gate.shopId, propertyId, {
    automationEnabled: true,
    status: SeoPropertyStatus.ACTIVE,
  });
  if (!result.ok) return result;

  revalidatePath("/marketing/seo-automation");
  return { ok: true };
}

export async function runSeoAuditNow(propertyId: string): Promise<SeoAutomationActionResult> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const result = await runSeoPropertyAudit(propertyId, gate.shopId);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/marketing/seo-automation");
  return { ok: true };
}

export async function addExternalSeoSite(
  raw: { domain: string },
): Promise<SeoAutomationActionResult> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const parsed = AddExternalSeoPropertySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid domain." };
  }

  const result = await addExternalSeoProperty(gate.shopId, parsed.data.domain);
  if (!result.ok) return result;

  revalidatePath("/marketing/seo-automation");
  return { ok: true };
}

export async function verifySeoProperty(
  propertyId: string,
): Promise<SeoAutomationActionResult & { method?: string }> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const result = await verifySeoPropertyDomain(gate.shopId, propertyId);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/marketing/seo-automation");
  return { ok: true, method: result.method };
}

export async function updateSeoAutopilotSettings(input: {
  contentAutopilotEnabled?: boolean;
  useAiContent?: boolean;
  monthlyReportEnabled?: boolean;
  reportEmail?: string | null;
}): Promise<SeoAutomationActionResult> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  await updateShopSeoSettings(gate.shopId, input);
  revalidatePath("/marketing/seo-automation");
  return { ok: true };
}

export async function dismissSeoRecommendation(label: string): Promise<SeoAutomationActionResult> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const trimmed = label.trim();
  if (!trimmed) return { ok: false, error: "Nothing to dismiss." };

  await dismissSeoRecommendationForShop(gate.shopId, trimmed);
  revalidatePath("/marketing/seo-automation");
  return { ok: true };
}

export async function snoozeSeoRecommendation(
  label: string,
  days = 7,
): Promise<SeoAutomationActionResult> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const trimmed = label.trim();
  if (!trimmed) return { ok: false, error: "Nothing to snooze." };

  await snoozeSeoRecommendationForShop(gate.shopId, trimmed, days);
  revalidatePath("/marketing/seo-automation");
  return { ok: true };
}

export async function startSeoAddonCheckout(
  catalogId: SeoStripeCatalogId,
): Promise<SeoAutomationActionResult & { url?: string }> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  if (!(catalogId in SEO_STRIPE_CATALOG)) {
    return { ok: false, error: "Unknown product." };
  }

  const result = await createSeoAddonCheckoutSession(shopId, catalogId);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, url: result.url };
}

export async function saveShopCustomDomain(
  domain: string,
): Promise<SeoAutomationActionResult> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const trimmed = domain.trim();
  if (trimmed.length > 253) {
    return { ok: false, error: "Domain is too long." };
  }

  const result = await setShopCustomDomain(gate.shopId, trimmed || null);
  if (!result.ok) return result;

  revalidatePath("/marketing/seo-automation");
  revalidatePath("/marketing/website");
  return { ok: true };
}

export async function runSeoContentNow(): Promise<
  SeoAutomationActionResult & { summary?: string }
> {
  const gate = await requireSeoFeature();
  if ("error" in gate) return { ok: false, error: gate.error };

  const result = await runShopSeoContentGeneration(gate.shopId);
  if (!result.ok) {
    return { ok: false, error: result.reason ?? "Content generation failed." };
  }

  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: gate.shopId },
    select: { bookingSlug: true, code: true },
  });
  const slug = siteSlugFromShop(shop.bookingSlug, shop.code);
  revalidatePath(publicSitePath(slug));
  revalidatePath(`/sites/${slug}`);
  revalidatePath("/marketing/seo-automation");
  revalidatePath("/marketing/website");

  if (result.skipped) {
    return { ok: true, summary: result.reason ?? "Skipped." };
  }

  const parts: string[] = [];
  if (result.contentSource === "ai") parts.push("AI-enhanced");
  else if (result.contentSource === "template") parts.push("template mode");
  if (result.servicesAdded) parts.push(`${result.servicesAdded} service(s) added`);
  if (result.keywordsAdded) parts.push(`${result.keywordsAdded} keyword(s) added`);
  if (result.metaUpdated) parts.push("meta tags filled in");
  if (result.aiFallbackReason) parts.push(`AI fallback: ${result.aiFallbackReason}`);

  return {
    ok: true,
    summary: parts.length ? parts.join(" · ") : "Content refreshed.",
  };
}
