import { NextResponse } from "next/server";

import { OEM_AUTOMATION_JOBS, type OemAutomationJobName } from "@/lib/oem-automation-sources";
import { runOemAutomationJob, runAllOemAutomationJobs } from "@/server/jobs/oem-automation";

export const dynamic = "force-dynamic";

/** Cron trigger for OEM automation jobs — protect with CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const job = url.searchParams.get("job") as OemAutomationJobName | "all" | null;

  if (job === "all" || !job) {
    const results = await runAllOemAutomationJobs();
    return NextResponse.json({ ok: true, results });
  }

  if (!OEM_AUTOMATION_JOBS.includes(job)) {
    return NextResponse.json(
      { error: `Unknown job. Valid: ${OEM_AUTOMATION_JOBS.join(", ")}, all` },
      { status: 400 },
    );
  }

  const result = await runOemAutomationJob(job);
  return NextResponse.json(result);
}
