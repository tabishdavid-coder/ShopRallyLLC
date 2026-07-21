import { NextResponse } from "next/server";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { getCloudStorage } from "@/server/services/cloud-storage";

export const runtime = "nodejs";

/**
 * Serve an RO attachment.
 * - Staff: authenticated shop session matching attachment.shopId
 * - Customer: ?t=<approvalToken> or ?t=<inspectionShareToken> for customerVisible rows
 * - Absolute https url (future Blob): redirect
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachment = await prisma.roAttachment.findUnique({
    where: { id },
    select: {
      id: true,
      shopId: true,
      repairOrderId: true,
      inspectionId: true,
      contentType: true,
      fileName: true,
      storageKey: true,
      url: true,
      customerVisible: true,
    },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(request.url);
  const publicToken = url.searchParams.get("t")?.trim() || "";

  let allowed = false;

  if (publicToken) {
    if (!attachment.customerVisible) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const ro = await prisma.repairOrder.findFirst({
      where: {
        id: attachment.repairOrderId,
        shopId: attachment.shopId,
        approvalToken: publicToken,
      },
      select: { id: true },
    });
    if (ro) {
      allowed = true;
    } else if (attachment.inspectionId) {
      const insp = await prisma.inspection.findFirst({
        where: {
          id: attachment.inspectionId,
          shopId: attachment.shopId,
          shareToken: publicToken,
        },
        select: { id: true },
      });
      allowed = Boolean(insp);
    } else {
      // RO-level photo shared via inspection link: allow if any inspection on RO has this token
      const insp = await prisma.inspection.findFirst({
        where: {
          repairOrderId: attachment.repairOrderId,
          shopId: attachment.shopId,
          shareToken: publicToken,
        },
        select: { id: true },
      });
      allowed = Boolean(insp);
    }
  } else {
    try {
      const shopId = await getShopId();
      allowed = shopId === attachment.shopId;
    } catch {
      allowed = false;
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Future Blob CDN urls
  if (attachment.url.startsWith("https://") || attachment.url.startsWith("http://")) {
    return NextResponse.redirect(attachment.url, 302);
  }

  const storage = getCloudStorage();
  const bytes = storage.read ? await storage.read(attachment.storageKey) : null;
  if (!bytes) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": attachment.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${attachment.fileName.replace(/"/g, "")}"`,
      "Cache-Control": publicToken ? "private, max-age=300" : "private, no-store",
    },
  });
}
