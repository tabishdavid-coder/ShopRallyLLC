import { runAllShopSeoContentGeneration } from "@/server/services/seo-content-generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Cron fallback for bi-weekly SEO content generation when Inngest is not configured. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAllShopSeoContentGeneration();
  return Response.json({ ok: true, ...result });
}
