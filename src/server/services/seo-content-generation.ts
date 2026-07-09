import "server-only";

import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/db/client";
import { SeoJobType, SeoPropertySource, SeoRunStatus } from "@/generated/prisma";
import { submitShopSitemapToGsc } from "@/server/actions/google-search-console";
import {
  defaultMetaDescription,
  defaultMetaTitle,
  defaultWebsiteServices,
  type WebsiteService,
} from "@/lib/website-seo";
import { canUseFeature } from "@/lib/subscription";
import { ensureShopSeoSettings } from "@/server/seo-settings";
import { ensureWebsiteConfig } from "@/server/website-seo";
import { isAiConfigured } from "@/server/services/ai/client";
import { suggestSeoContent } from "@/server/services/ai/seo-content";

export type SeoContentSource = "ai" | "template";

export type SeoContentGenerationResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  servicesAdded?: number;
  keywordsAdded?: number;
  metaUpdated?: boolean;
  contentSource?: SeoContentSource;
  aiFallbackReason?: string;
};

type TemplateContent = {
  services: WebsiteService[];
  servicesAdded: number;
  keywords: string[];
  keywordsAdded: number;
  metaTitle: string;
  metaDescription: string;
  metaUpdated: boolean;
};

function serviceTitleExists(services: WebsiteService[], title: string): boolean {
  const key = title.trim().toLowerCase();
  return services.some((s) => s.title.trim().toLowerCase() === key);
}

function buildKeywords(city: string | null, services: WebsiteService[]): string[] {
  const base = city
    ? [`auto repair ${city.toLowerCase()}`, `mechanic ${city.toLowerCase()}`, "oil change", "brake repair"]
    : ["auto repair", "oil change", "brake repair"];
  for (const svc of services.slice(0, 6)) {
    const t = svc.title.toLowerCase();
    if (city) base.push(`${t} ${city.toLowerCase()}`);
    else base.push(t);
  }
  return [...new Set(base.map((k) => k.slice(0, 40)))].slice(0, 20);
}

function parseServices(raw: unknown, shopName: string): WebsiteService[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultWebsiteServices(shopName);
  const parsed: WebsiteService[] = [];
  for (const row of raw) {
    if (
      row &&
      typeof row === "object" &&
      "title" in row &&
      typeof (row as { title: unknown }).title === "string"
    ) {
      parsed.push({
        title: (row as WebsiteService).title,
        description: String((row as WebsiteService).description ?? ""),
      });
    }
  }
  return parsed.length ? parsed : defaultWebsiteServices(shopName);
}

async function buildTemplateSeoContent(
  shopId: string,
  shop: { name: string; city: string | null; state: string | null },
  config: {
    servicesJson: unknown;
    keywords: string[];
    metaTitle: string | null;
    metaDescription: string | null;
  },
): Promise<TemplateContent> {
  let services = parseServices(config.servicesJson, shop.name);
  let servicesAdded = 0;

  const cannedJobs = await prisma.cannedJob.findMany({
    where: { shopId, isActive: true },
    orderBy: [{ usageCount: "desc" }, { name: "asc" }],
    take: 10,
    select: { name: true, description: true, category: true },
  });

  for (const job of cannedJobs) {
    const title = job.category?.trim() || job.name.trim();
    if (!title || serviceTitleExists(services, title)) continue;
    const place = [shop.city, shop.state].filter(Boolean).join(", ");
    services.push({
      title,
      description:
        job.description?.trim() ||
        `${title} at ${shop.name}${place ? ` in ${place}` : ""}. Expert diagnostics, fair pricing, and quality parts.`,
    });
    servicesAdded += 1;
    if (services.length >= 12) break;
  }

  const keywords = buildKeywords(shop.city, services);
  const keywordsAdded = keywords.filter((k) => !config.keywords.includes(k)).length;

  const metaTitle = config.metaTitle?.trim() || defaultMetaTitle(shop.name, shop.city);
  const metaDescription =
    config.metaDescription?.trim() || defaultMetaDescription(shop.name, shop.city);
  const metaUpdated = !config.metaTitle?.trim() || !config.metaDescription?.trim();

  if (services.length < 3) {
    services = defaultWebsiteServices(shop.name);
  }

  return {
    services,
    servicesAdded,
    keywords,
    keywordsAdded,
    metaTitle,
    metaDescription,
    metaUpdated,
  };
}

/** Enrich microsite content — template baseline, optional Overdrive LLM refinement. */
export async function runShopSeoContentGeneration(
  shopId: string,
): Promise<SeoContentGenerationResult> {
  const settings = await ensureShopSeoSettings(shopId);
  if (!settings.contentAutopilotEnabled) {
    return { ok: true, skipped: true, reason: "Content autopilot disabled." };
  }

  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    select: { name: true, city: true, state: true },
  });

  const config = await ensureWebsiteConfig(shopId);
  const template = await buildTemplateSeoContent(shopId, shop, {
    servicesJson: config.servicesJson,
    keywords: config.keywords,
    metaTitle: config.metaTitle,
    metaDescription: config.metaDescription,
  });

  let services = template.services;
  let keywords = template.keywords;
  let metaTitle = template.metaTitle;
  let metaDescription = template.metaDescription;
  let contentSource: SeoContentSource = "template";
  let aiFallbackReason: string | undefined;

  const cannedJobs = await prisma.cannedJob.findMany({
    where: { shopId, isActive: true },
    orderBy: [{ usageCount: "desc" }, { name: "asc" }],
    take: 10,
    select: { name: true, category: true },
  });

  const canUseAi =
    settings.useAiContent &&
    isAiConfigured() &&
    (await canUseFeature(shopId, "ai_seo_content"));

  if (canUseAi) {
    try {
      const ai = await suggestSeoContent(shopId, {
        shopName: shop.name,
        city: shop.city,
        state: shop.state,
        existingMetaTitle: metaTitle,
        existingMetaDescription: metaDescription,
        services: template.services,
        cannedJobNames: cannedJobs.map((j) => j.category?.trim() || j.name.trim()).filter(Boolean),
        existingKeywords: template.keywords,
      });

      contentSource = "ai";
      services = ai.services.length >= 3 ? ai.services : template.services;
      keywords = ai.keywords.length > 0 ? ai.keywords : template.keywords;
      metaTitle = config.metaTitle?.trim() || ai.metaTitle;
      metaDescription = config.metaDescription?.trim() || ai.metaDescription;
    } catch (err) {
      aiFallbackReason = err instanceof Error ? err.message : "AI enrichment failed";
      if (process.env.NODE_ENV === "development") {
        console.warn("[seo-content-ai]", err);
      }
    }
  }

  const keywordsAdded = keywords.filter((k) => !config.keywords.includes(k)).length;
  const servicesBefore = parseServices(config.servicesJson, shop.name).length;
  const servicesAdded = Math.max(0, services.length - servicesBefore);
  const metaUpdated =
    template.metaUpdated ||
    (contentSource === "ai" &&
      (!config.metaTitle?.trim() || !config.metaDescription?.trim()));

  await prisma.shopWebsiteConfig.update({
    where: { shopId },
    data: {
      servicesJson: services as unknown as Prisma.InputJsonValue,
      keywords,
      metaTitle,
      metaDescription,
    },
  });

  await prisma.shopSeoSettings.update({
    where: { shopId },
    data: { lastContentRunAt: new Date() },
  });

  const configAfter = await prisma.shopWebsiteConfig.findUnique({
    where: { shopId },
    select: { published: true },
  });
  if (configAfter?.published) {
    try {
      await submitShopSitemapToGsc(shopId);
    } catch (err) {
      console.warn("[seo-content] GSC sitemap/index after content run failed:", err);
    }
  }

  const micrositeProperty = await prisma.seoProperty.findFirst({
    where: { shopId, source: SeoPropertySource.MICROSITE },
    select: { id: true },
  });
  if (micrositeProperty) {
    await prisma.seoAutomationRun.create({
      data: {
        propertyId: micrositeProperty.id,
        jobType: SeoJobType.CONTENT,
        status: SeoRunStatus.SUCCESS,
        summary: {
          servicesAdded,
          keywordsAdded,
          metaUpdated,
          contentSource,
          ...(aiFallbackReason ? { aiFallbackReason } : {}),
        } as unknown as Prisma.InputJsonValue,
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });
  }

  return {
    ok: true,
    servicesAdded,
    keywordsAdded,
    metaUpdated,
    contentSource,
    aiFallbackReason,
  };
}

export async function runAllShopSeoContentGeneration() {
  const shops = await prisma.shopSeoSettings.findMany({
    where: { contentAutopilotEnabled: true },
    select: { shopId: true },
  });

  let ran = 0;
  let skipped = 0;
  let failed = 0;

  for (const { shopId } of shops) {
    try {
      const result = await runShopSeoContentGeneration(shopId);
      if (result.skipped) skipped += 1;
      else ran += 1;
    } catch {
      failed += 1;
    }
  }

  return { scanned: shops.length, ran, skipped, failed };
}
