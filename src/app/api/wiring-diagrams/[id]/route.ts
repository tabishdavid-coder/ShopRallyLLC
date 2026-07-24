import { NextResponse } from "next/server";

import { getShopId } from "@/lib/shop";
import { getCloudStorage } from "@/server/services/cloud-storage";
import { getWiringDiagramForShop } from "@/server/services/wiring-diagrams/wiring-diagram-service";

export const runtime = "nodejs";

/** Serve a cached shop-licensed wiring diagram (staff session only). */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let shopId: string;
  try {
    shopId = await getShopId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const diagram = await getWiringDiagramForShop(shopId, id);
  if (!diagram) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const storage = getCloudStorage();
  const bytes = storage.read ? await storage.read(diagram.storageKey) : null;
  if (!bytes) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  const fileName = (diagram.fileName ?? "wiring-diagram.pdf").replace(/"/g, "");

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": diagram.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
