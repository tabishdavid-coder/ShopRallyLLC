import type { NextRequest } from "next/server";

import { prisma } from "@/db/client";
import { getShopMatrices, shopPartRetail } from "@/server/pricing-matrix";
import { getPartsTechForShop } from "@/server/services/partstech";

/**
 * PartsTech punchout return URL. Fetches the cart quote and posts it to the
 * opener window for service mapping — does NOT auto-import to a single job.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const roId = url.searchParams.get("roId") ?? "";
  const sessionId =
    url.searchParams.get("sessionId") ??
    url.searchParams.get("quoteId") ??
    url.searchParams.get("session") ??
    "";

  let error = "";
  let partsPayload: {
    partstechId: string;
    brand: string;
    partNumber: string;
    description: string;
    costCents: number;
    retailCents: number;
    supplier?: string;
    quantity: number;
  }[] = [];

  try {
    if (!roId) {
      error = "Repair order not found.";
    } else if (!sessionId) {
      error = "No PartsTech session returned.";
    } else {
      const ro = await prisma.repairOrder.findUnique({
        where: { id: roId },
        select: { shopId: true },
      });
      if (!ro) {
        error = "Repair order not found.";
      } else {
        const provider = await getPartsTechForShop(ro.shopId);
        if (!provider.getQuote) {
          error = "PartsTech quote fetch not configured.";
        } else {
          const parts = await provider.getQuote(sessionId);
          const { partTiers } = await getShopMatrices(ro.shopId);
          partsPayload = parts.map((p) => ({
            partstechId: p.partstechId,
            brand: p.brand,
            partNumber: p.partNumber,
            description: p.description,
            costCents: p.costCents,
            retailCents: partTiers.length ? shopPartRetail(p.costCents, partTiers) : p.retailCents,
            supplier: p.supplier,
            quantity: 1,
          }));
          if (!partsPayload.length) error = "No parts in PartsTech quote.";
        }
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Import failed.";
  }

  const message = error
    ? "Could not load your quote. Close this window and try again."
    : `${partsPayload.length} part${partsPayload.length === 1 ? "" : "s"} ready — assign each to a service in ShopRally.`;

  const payload = JSON.stringify({
    type: "partstech-quote",
    roId,
    sessionId,
    parts: partsPayload,
    error,
  });

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>PartsTech</title></head>
<body style="font-family:system-ui,sans-serif;padding:2.5rem;text-align:center;color:#1b2a4a">
<p style="font-size:1rem">${message}</p>
<script>
  var payload = ${payload};
  try {
    if (window.opener) window.opener.postMessage(payload, "*");
    else if (window.parent !== window) window.parent.postMessage(payload, "*");
  } catch (e) {}
</script>
</body></html>`;

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
