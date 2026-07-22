import { notFound } from "next/navigation";

import { TireStockDetailView } from "@/components/tires/tire-stock-detail";
import { getShopId } from "@/lib/shop";
import { getTireStock } from "@/server/tire-stock";

export default async function TireDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const shopId = await getShopId();
  const tire = await getTireStock(shopId, id);
  if (!tire) notFound();

  return (
    <div className="workspace-surface">
      <TireStockDetailView tire={tire} editMode={sp.edit === "1"} />
    </div>
  );
}
