import "server-only";

import type { WebsiteService } from "@/lib/website-seo";
import { parseSeoContentAiResponse, type SeoContentDraftResult } from "@/lib/seo-content-ai";
import { createAiMessage } from "@/server/services/ai/client";

export type { SeoContentDraftResult };

export type SeoContentDraftContext = {
  shopName: string;
  city: string | null;
  state: string | null;
  existingMetaTitle: string;
  existingMetaDescription: string;
  services: WebsiteService[];
  cannedJobNames: string[];
  existingKeywords: string[];
};

export { parseSeoContentAiResponse };

export async function suggestSeoContent(
  shopId: string,
  ctx: SeoContentDraftContext,
): Promise<SeoContentDraftResult> {
  const place = [ctx.city, ctx.state].filter(Boolean).join(", ");
  const locationHint = place ? ` in ${place}` : "";
  const servicesBlock = ctx.services
    .map((s) => `- ${s.title}: ${s.description}`)
    .join("\n");
  const jobsBlock =
    ctx.cannedJobNames.length > 0
      ? ctx.cannedJobNames.map((n) => `- ${n}`).join("\n")
      : "(none)";
  const keywordsBlock =
    ctx.existingKeywords.length > 0 ? ctx.existingKeywords.join(", ") : "(none)";

  const { text: raw } = await createAiMessage({
    shopId,
    feature: "SEO_CONTENT",
    maxTokens: 2048,
    system:
      "You write local SEO copy for an independent auto repair shop microsite. " +
      "Output must be factual — use only the shop name, location, services, and job list provided. " +
      "Do not invent certifications, years in business, awards, or prices. " +
      "Meta title: 50–60 characters when possible, include shop name and city if known. " +
      "Meta description: 140–160 characters when possible, mention key services and location. " +
      "Service descriptions: 1–2 sentences each, unique and locally relevant. " +
      "Keywords: lowercase local search phrases (city + service when city is known). " +
      "Do not mention AI. Respond with JSON only.",
    userContent:
      `Shop: ${ctx.shopName}${locationHint}\n` +
      `Current meta title: ${ctx.existingMetaTitle}\n` +
      `Current meta description: ${ctx.existingMetaDescription}\n` +
      `Current services:\n${servicesBlock}\n` +
      `Active canned jobs (shop offerings):\n${jobsBlock}\n` +
      `Current keywords: ${keywordsBlock}\n\n` +
      `Improve meta tags (refine if present, do not leave empty), up to 12 service blurbs, ` +
      `and up to 20 local keywords.\n\n` +
      `JSON shape: {"metaTitle":"...","metaDescription":"...","services":[{"title":"...","description":"..."}],"keywords":["..."]}`,
  });

  return parseSeoContentAiResponse(raw);
}
