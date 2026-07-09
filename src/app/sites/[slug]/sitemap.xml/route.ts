import { notFound } from "next/navigation";

import { generateShopSitemap } from "@/server/website-seo";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const xml = await generateShopSitemap(slug);
  if (!xml) notFound();

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
