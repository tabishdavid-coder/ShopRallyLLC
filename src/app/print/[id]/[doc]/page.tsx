import { notFound } from "next/navigation";

import { prisma } from "@/db/client";
import { getRepairOrder } from "@/server/repair-order";
import { getShopId } from "@/lib/shop";
import { PrintDocument } from "@/components/print/print-document";
import { resolveTransparency, type DocTransparency } from "@/lib/transparency";

// Print output must always reflect current RO data + shop settings.
export const dynamic = "force-dynamic";

const DOC_TITLES: Record<string, string> = {
  estimate: "Estimate",
  invoice: "Invoice",
  "repair-order": "Repair Order",
};

export default async function PrintPage({
  params,
}: {
  params: Promise<{ id: string; doc: string }>;
}) {
  const { id, doc } = await params;
  const title = DOC_TITLES[doc];
  if (!title) notFound();

  const shopId = await getShopId();
  const ro = await getRepairOrder({ shopId, id });
  if (!ro) notFound();

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { name: true, code: true, address: true, address2: true, city: true, state: true, zip: true, phone: true, email: true, website: true, logoUrl: true, docTransparency: true },
  });

  // The internal "repair-order" copy always shows everything; estimate/invoice
  // honor the shop's transparency settings.
  const t = resolveTransparency(shop?.docTransparency);
  const transparency: DocTransparency =
    doc === "estimate" ? t.estimate : doc === "invoice" ? t.invoice : { laborHours: true, partNumbers: true, partBrand: true, lineItemPrices: true };

  return <PrintDocument ro={ro} shop={shop} title={title} doc={doc} transparency={transparency} />;
}
