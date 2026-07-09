import { resolveHostToSiteSlug } from "@/server/services/custom-domain-routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESOLVE_HEADER = "x-middleware-resolve";

/** Internal host → microsite slug lookup for custom-domain middleware rewrites. */
export async function GET(request: Request) {
  if (request.headers.get(RESOLVE_HEADER) !== "1") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const host = new URL(request.url).searchParams.get("host")?.trim();
  if (!host) {
    return Response.json({ error: "host required" }, { status: 400 });
  }

  const slug = await resolveHostToSiteSlug(host);
  if (!slug) {
    return Response.json({ slug: null }, { status: 404 });
  }

  return Response.json({ slug });
}
