import { notFound } from "next/navigation";

import { EstimateBuildingLabPanel } from "@/components/estimate-building/estimate-building-lab-panel";
import { getShopId } from "@/lib/shop";
import { getRepairOrder } from "@/server/repair-order";

/** Production estimate tab — merged Estimate Building Lab UX (Batch 7). */
export default async function EstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shopId = await getShopId();
  const ro = await getRepairOrder({ shopId, id });
  if (!ro) notFound();

  return (
    <EstimateBuildingLabPanel roId={id} shopId={shopId} variant="production" />
  );
}
