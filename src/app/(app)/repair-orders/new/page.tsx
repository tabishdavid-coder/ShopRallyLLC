import { getShopId } from "@/lib/shop";
import { loadRoIntakeConfig } from "@/server/ro-intake-config";
import { NewRepairOrderPageClient } from "@/components/repair-order/new-repair-order-page-client";

export default async function NewRepairOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; vehicleId?: string; from?: string }>;
}) {
  const { customerId, vehicleId, from } = await searchParams;
  const shopId = await getShopId();
  const config = await loadRoIntakeConfig(shopId);

  return (
    <NewRepairOrderPageClient
      config={config}
      initialCustomerId={customerId}
      initialVehicleId={vehicleId}
      fromQuickLabor={from === "quick-labor"}
    />
  );
}
