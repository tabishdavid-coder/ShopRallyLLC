import { notFound } from "next/navigation";

import { InventoryPartDetailView } from "@/components/inventory/inventory-part-detail";
import { getShopId } from "@/lib/shop";
import { getInventoryPart } from "@/server/inventory";

export default async function InventoryPartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const shopId = await getShopId();
  const part = await getInventoryPart(shopId, id);
  if (!part) notFound();

  return (
    <div className="workspace-surface">
      <InventoryPartDetailView part={part} editMode={sp.edit === "1"} />
    </div>
  );
}
