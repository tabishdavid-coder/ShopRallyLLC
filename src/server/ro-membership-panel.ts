import { getRoMaintenancePanelData } from "@/server/maintenance-subscriptions";
import { getSubscriptionServiceProfile } from "@/server/maintenance-service-visits";
import { getCurrentUser } from "@/lib/platform";
import type { RepairOrderDetail } from "@/server/repair-order";

export type RoMembershipPanelContext = {
  roId: string;
  vehicleId: string;
  roVehicleLabel: string;
  mileageIn: number | null;
  defaultTechnicianName: string;
  subscriptions: {
    subscriptionId: string;
    planName: string;
    status: import("@/generated/prisma").PlanSubscriptionStatus;
    enrolledVehicleId: string;
    enrolledVehicleLabel: string;
    vehicleVerified: boolean;
    services: import("@/lib/maintenance-service-profile").ServiceProfileItem[];
  }[];
  mismatched: {
    subscriptionId: string;
    planName: string;
    enrolledVehicleLabel: string;
  }[];
  hasMembership: boolean;
};

export async function getRoMembershipPanelContext(
  shopId: string,
  ro: Pick<RepairOrderDetail, "id" | "vehicleId" | "customerId" | "mileageIn" | "vehicle">,
): Promise<RoMembershipPanelContext> {
  const [maintenanceData, user] = await Promise.all([
    getRoMaintenancePanelData(shopId, ro.vehicleId, ro.customerId),
    getCurrentUser(),
  ]);

  const roVehicleLabel = [
    ro.vehicle.year,
    ro.vehicle.make,
    ro.vehicle.model,
    ro.vehicle.plate ? `(${ro.vehicle.plate})` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const subscriptions = await Promise.all(
    maintenanceData.matching.map(async (s) => {
      const profile = await getSubscriptionServiceProfile(shopId, s.subscriptionId);
      return {
        subscriptionId: s.subscriptionId,
        planName: s.planName,
        status: s.status,
        enrolledVehicleId: s.enrolledVehicleId,
        enrolledVehicleLabel: s.enrolledVehicleLabel,
        vehicleVerified: s.vehicleVerified,
        services: profile?.services ?? [],
      };
    }),
  );

  const mismatched = maintenanceData.mismatched.map((m) => ({
    subscriptionId: m.subscriptionId,
    planName: m.planName,
    enrolledVehicleLabel: m.enrolledVehicleLabel,
  }));

  const defaultTechnicianName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return {
    roId: ro.id,
    vehicleId: ro.vehicleId,
    roVehicleLabel,
    mileageIn: ro.mileageIn,
    defaultTechnicianName,
    subscriptions,
    mismatched,
    hasMembership: subscriptions.length > 0 || mismatched.length > 0,
  };
}
