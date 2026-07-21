import { NextResponse } from "next/server";

import { syncAllConnectedGoogleReviews } from "@/server/google-reviews-sync-runner";

export const dynamic = "force-dynamic";

/** Manual/cron trigger for Google Reviews fleet sync — protect with CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllConnectedGoogleReviews({ concurrency: 3 });
  return NextResponse.json(result);
}
