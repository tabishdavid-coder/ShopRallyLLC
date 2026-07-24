"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "@/lib/platform";
import { isPlatformOemAutomationUiEnabled } from "@/lib/oem-automation-sources";
import {
  getRepairSourcePrompt,
  runPlatformHealthChecks,
  seedScraperSources,
} from "@/server/platform/oem-automation";
import { recordAutomationJobRun } from "@/server/jobs/oem-automation";

export type PlatformActionResult =
  | { ok: true; message?: string; prompt?: string }
  | { ok: false; error: string };

function gateUi(): string | null {
  if (!isPlatformOemAutomationUiEnabled()) {
    return "OEM automation UI is not enabled for this environment.";
  }
  return null;
}

/** Platform admin: ping all active OEM sources and write alerts. */
export async function triggerOemHealthCheck(): Promise<PlatformActionResult> {
  const blocked = gateUi();
  if (blocked) return { ok: false, error: blocked };

  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Platform admin access required." };
  }

  try {
    const result = await runPlatformHealthChecks();
    await recordAutomationJobRun("daily_health_check", result);
    revalidatePath("/platform/system");
    return {
      ok: true,
      message: `Checked ${result.sourcesChecked} sources — ${result.healthy} healthy, ${result.degraded} degraded.`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Health check failed." };
  }
}

/** Platform admin: seed default scraper sources if missing. */
export async function initOemScraperSources(): Promise<PlatformActionResult> {
  const blocked = gateUi();
  if (blocked) return { ok: false, error: blocked };

  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Platform admin access required." };
  }

  try {
    const count = await seedScraperSources();
    revalidatePath("/platform/system");
    return { ok: true, message: `Upserted ${count} scraper sources.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Init failed." };
  }
}

/** Platform admin: Cursor-assisted repair prompt for a broken source. */
export async function requestOemRepairPrompt(input: {
  sourceName: string;
  sampleResponse?: string;
}): Promise<PlatformActionResult> {
  const blocked = gateUi();
  if (blocked) return { ok: false, error: blocked };

  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Platform admin access required." };
  }

  const result = await getRepairSourcePrompt(input);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, prompt: result.prompt };
}
