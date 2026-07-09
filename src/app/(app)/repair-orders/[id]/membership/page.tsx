import { notFound, redirect } from "next/navigation";

import { RoMaintenancePanel } from "@/components/maintenance/ro-maintenance-panel";
import { getShopId } from "@/lib/shop";
import { getRepairOrder } from "@/server/repair-order";
import { getRoMembershipPanelContext } from "@/server/ro-membership-panel";
import { defaultRoOpenHref } from "@/lib/ro-workspace";

export default async function RoMembershipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shopId = await getShopId();
  const ro = await getRepairOrder({ shopId, id });
  if (!ro) notFound();

  const membership = await getRoMembershipPanelContext(shopId, ro);
  if (!membership.hasMembership) {
    redirect(defaultRoOpenHref(id));
  }

  return (
    <RoMaintenancePanel
      roId={membership.roId}
      vehicleId={membership.vehicleId}
      roVehicleLabel={membership.roVehicleLabel}
      mileageIn={membership.mileageIn}
      defaultTechnicianName={membership.defaultTechnicianName}
      subscriptions={membership.subscriptions}
      mismatched={membership.mismatched}
      fullPage
    />
  );
}
