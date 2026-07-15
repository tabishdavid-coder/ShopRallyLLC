import { notFound } from "next/navigation";

import { EstimateBuildingLabPanel } from "@/components/estimate-building/estimate-building-lab-panel";
import { requireRepairOrder } from "@/server/repair-order-access";

/** Production estimate tab — merged Estimate Building Lab UX (Batch 7). */
export default async function EstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { shopId } = await requireRepairOrder(id);

  return (
    <EstimateBuildingLabPanel roId={id} shopId={shopId} variant="production" />
  );
}
