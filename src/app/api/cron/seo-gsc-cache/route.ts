import { NextResponse } from "next/server";

import { refreshAllShopSeoMetricCaches } from "@/server/seo-gsc-cache-runner";

export const dynamic = "force-dynamic";

/** Manual/cron trigger for GSC cache refresh — protect with CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshAllShopSeoMetricCaches();
  return NextResponse.json(result);
}
