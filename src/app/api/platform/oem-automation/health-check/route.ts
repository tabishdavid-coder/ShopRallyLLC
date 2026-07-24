import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/platform";
import { isPlatformOemAutomationUiEnabled } from "@/lib/oem-automation-sources";
import { runPlatformHealthChecks } from "@/server/platform/oem-automation";
import { recordAutomationJobRun } from "@/server/jobs/oem-automation";

export const dynamic = "force-dynamic";

/** Platform admin: manual OEM source health check. */
export async function POST() {
  if (!isPlatformOemAutomationUiEnabled()) {
    return NextResponse.json({ error: "OEM automation UI disabled" }, { status: 403 });
  }

  try {
    await requirePlatformAdmin();
  } catch {
    return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
  }

  const result = await runPlatformHealthChecks();
  await recordAutomationJobRun("daily_health_check", result);
  return NextResponse.json(result);
}
