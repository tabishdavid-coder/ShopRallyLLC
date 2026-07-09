"use server";

import { revalidatePath } from "next/cache";

import { SeoPropertyStatus } from "@/generated/prisma";
import { isPlatformAdmin } from "@/lib/platform";
import { setPlatformSeoPropertyAutomation } from "@/server/seo-automation";

export type PlatformSeoActionResult = { ok: true } | { ok: false; error: string };

async function requirePlatformAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isPlatformAdmin())) {
    return { ok: false, error: "Platform admin access required." };
  }
  return { ok: true };
}

export async function platformPauseSeoProperty(propertyId: string): Promise<PlatformSeoActionResult> {
  const gate = await requirePlatformAdmin();
  if (!gate.ok) return gate;

  const result = await setPlatformSeoPropertyAutomation(propertyId, {
    automationEnabled: false,
    status: SeoPropertyStatus.PAUSED,
  });
  if (!result.ok) return result;

  revalidatePath("/platform/seo-automation");
  revalidatePath("/marketing/seo-automation");
  return { ok: true };
}

export async function platformResumeSeoProperty(propertyId: string): Promise<PlatformSeoActionResult> {
  const gate = await requirePlatformAdmin();
  if (!gate.ok) return gate;

  const result = await setPlatformSeoPropertyAutomation(propertyId, {
    automationEnabled: true,
    status: SeoPropertyStatus.ACTIVE,
  });
  if (!result.ok) return result;

  revalidatePath("/platform/seo-automation");
  revalidatePath("/marketing/seo-automation");
  return { ok: true };
}
