"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { WebsiteBuildStatus } from "@/generated/prisma";
import { prisma } from "@/db/client";
import { defaultNextReviewDue } from "@/lib/website-build-pipeline";
import { requirePlatformAdmin } from "@/lib/platform";
import { ensureWebsiteConfig } from "@/server/website-seo";
import { siteSlugFromShop, publicSitePath } from "@/lib/website-seo";

export type PlatformWebsiteActionResult = { ok: true } | { ok: false; error: string };

const UpdatePipelineSchema = z.object({
  shopId: z.string().min(1),
  buildStatus: z.nativeEnum(WebsiteBuildStatus).optional(),
  operatorNotes: z.string().max(8000).optional(),
  published: z.boolean().optional(),
  nextReviewDueAt: z.string().datetime().optional().nullable(),
  markReviewed: z.boolean().optional(),
});

function revalidateWebsitePaths(shopId: string) {
  revalidatePath("/platform/websites");
  revalidatePath(`/platform/websites/${shopId}`);
}

/** Platform admin: update ShopSite build pipeline for a tenant. */
export async function updateWebsiteBuildPipeline(
  raw: z.infer<typeof UpdatePipelineSchema>,
): Promise<PlatformWebsiteActionResult> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Platform admin access required." };
  }

  const parsed = UpdatePipelineSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { shopId, buildStatus, operatorNotes, published, nextReviewDueAt, markReviewed } =
    parsed.data;

  await ensureWebsiteConfig(shopId);

  const now = new Date();
  const data: Record<string, unknown> = {};

  if (operatorNotes !== undefined) {
    data.operatorNotes = operatorNotes.trim() || null;
  }

  if (buildStatus !== undefined) {
    data.buildStatus = buildStatus;
    if (buildStatus === WebsiteBuildStatus.LAUNCHED) {
      data.published = true;
      data.launchedAt = now;
      if (nextReviewDueAt === undefined) {
        data.nextReviewDueAt = defaultNextReviewDue(now);
      }
    }
    if (buildStatus === WebsiteBuildStatus.UPKEEP) {
      if (nextReviewDueAt === undefined) {
        const existing = await prisma.shopWebsiteConfig.findUnique({
          where: { shopId },
          select: { nextReviewDueAt: true },
        });
        if (!existing?.nextReviewDueAt) {
          data.nextReviewDueAt = defaultNextReviewDue(now);
        }
      }
    }
    if (
      buildStatus === WebsiteBuildStatus.IN_BUILD ||
      buildStatus === WebsiteBuildStatus.CLIENT_REVIEW ||
      buildStatus === WebsiteBuildStatus.QUOTE_REQUESTED
    ) {
      if (published === undefined) {
        data.published = false;
      }
    }
  }

  if (published !== undefined) {
    data.published = published;
    if (published) {
      data.launchedAt = now;
      if (buildStatus === undefined) {
        data.buildStatus = WebsiteBuildStatus.LAUNCHED;
      }
    }
  }

  if (nextReviewDueAt !== undefined) {
    data.nextReviewDueAt = nextReviewDueAt ? new Date(nextReviewDueAt) : null;
  }

  if (markReviewed) {
    data.lastOperatorReviewAt = now;
    data.nextReviewDueAt = defaultNextReviewDue(now);
    if (buildStatus === undefined) {
      data.buildStatus = WebsiteBuildStatus.UPKEEP;
    }
  }

  await prisma.shopWebsiteConfig.update({
    where: { shopId },
    data,
  });

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { bookingSlug: true, code: true },
  });
  if (shop) {
    const slug = siteSlugFromShop(shop.bookingSlug, shop.code);
    revalidatePath(`/sites/${slug}`);
    revalidatePath(publicSitePath(slug));
    revalidatePath("/marketing/website");
  }

  revalidateWebsitePaths(shopId);
  return { ok: true };
}

/** Start build pipeline for a shop (creates config row if needed). */
export async function startWebsiteBuild(shopId: string): Promise<PlatformWebsiteActionResult> {
  return updateWebsiteBuildPipeline({
    shopId,
    buildStatus: WebsiteBuildStatus.IN_BUILD,
    published: false,
  });
}
