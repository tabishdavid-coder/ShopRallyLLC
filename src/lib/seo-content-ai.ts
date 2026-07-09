import { z } from "zod";

import type { WebsiteService } from "@/lib/website-seo";

export type SeoContentDraftResult = {
  metaTitle: string;
  metaDescription: string;
  services: WebsiteService[];
  keywords: string[];
};

const SeoContentOutputSchema = z.object({
  metaTitle: z.string().min(1).max(70),
  metaDescription: z.string().min(1).max(320),
  services: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(500),
      }),
    )
    .min(1)
    .max(12),
  keywords: z.array(z.string().trim().min(1).max(40)).max(20),
});

/** Parse LLM JSON output — shared by service + test script. */
export function parseSeoContentAiResponse(raw: string): SeoContentDraftResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI did not return valid SEO content JSON.");
  }

  let parsed: z.infer<typeof SeoContentOutputSchema>;
  try {
    parsed = SeoContentOutputSchema.parse(JSON.parse(jsonMatch[0]));
  } catch {
    throw new Error("AI returned invalid SEO content format.");
  }

  return {
    metaTitle: parsed.metaTitle.trim().slice(0, 70),
    metaDescription: parsed.metaDescription.trim().slice(0, 320),
    services: parsed.services.map((s) => ({
      title: s.title.slice(0, 120),
      description: s.description.slice(0, 500),
    })),
    keywords: [...new Set(parsed.keywords.map((k) => k.slice(0, 40)))].slice(0, 20),
  };
}
