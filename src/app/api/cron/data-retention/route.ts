import { NextResponse } from "next/server";

import { runPlatformDataRetentionJob } from "@/server/jobs/data-retention";

export const dynamic = "force-dynamic";

/** Manual/cron trigger for platform data retention — protect with CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runPlatformDataRetentionJob();
  return NextResponse.json(result);
}
