import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";

import { getRoSidebarOptions } from "@/server/ro-sidebar-options";
import { getCustomerTagNames } from "@/server/actions/customer-settings";
import { getLastTireOrderSize } from "@/server/actions/vehicle-specs";
import { getRepairOrder } from "@/server/repair-order";
import { getVehicleMaintenanceMemory } from "@/server/vehicle-maintenance-memory";
import { getShopId } from "@/lib/shop";
import { vehicleSpecsView } from "@/lib/vehicle-specs-view";
import { buildAllowedRoTabSegments, roTabSegmentFromPathname } from "@/lib/crm-access";
import { isRoEstimateLikeWorkspacePath, defaultRoOpenHref } from "@/lib/ro-workspace";
import { RoWorkspacePanel } from "@/components/repair-order/ro-workspace-panel";
import { RoContextDeck } from "@/components/repair-order/ro-context-deck";
import { RoApproveActions } from "@/components/repair-order/ro-approve-actions";
import { PrintMenu } from "@/components/repair-order/print-menu";
import { ShareMenu } from "@/components/repair-order/share-menu";
import { RoOdometerHeader } from "@/components/repair-order/ro-odometer-header";
import { EstimateActionToastProvider } from "@/components/repair-order/estimate-action-toast";
import { RoMessages } from "@/components/repair-order/ro-messages";
import { EstimateViewToast } from "@/components/repair-order/estimate-view-toast";
import { getRoMembershipPanelContext } from "@/server/ro-membership-panel";
import { getEffectivePermissions } from "@/server/permissions";
import { customerDisplayName } from "@/lib/format";
import { isEstimateEditable } from "@/lib/estimate-editable";
import { EstimateWorkspaceHeroBar } from "@/components/estimate-building/estimate-workspace-hero-bar";
import { EstimateWorkspaceScope } from "@/components/estimate-building/estimate-workspace-scope";
import { ROStatus } from "@/generated/prisma";

export default async function RepairOrderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shopId = await getShopId();
  const ro = await getRepairOrder({ shopId, id });
  if (!ro) notFound();

  const pathname = (await headers()).get("x-pathname") ?? "";
  const basePath = `/repair-orders/${id}`;

  const effective = await getEffectivePermissions(shopId);
  const allowedSegments = buildAllowedRoTabSegments(effective);
  const activeSegment = roTabSegmentFromPathname(pathname, id);
  if (activeSegment != null && allowedSegments && !allowedSegments.includes(activeSegment)) {
    redirect(defaultRoOpenHref(id));
  }

  const isEstimateWorkspace = isRoEstimateLikeWorkspacePath(pathname);

  const [sidebarOptions, customerTags, membership, vehicleSpecs, lastTireOrder, maintenanceMemory] =
    await Promise.all([
      getRoSidebarOptions(shopId),
      getCustomerTagNames(),
      getRoMembershipPanelContext(shopId, ro),
      Promise.resolve(vehicleSpecsView(ro.vehicle)),
      getLastTireOrderSize(shopId, ro.vehicleId),
      getVehicleMaintenanceMemory(shopId, ro.vehicleId, { excludeRoId: ro.id }),
    ]);

  const approvable =
    ro.status === ROStatus.ESTIMATE || ro.status === ROStatus.APPROVED;

  const authorizedJobCount = ro.jobs.filter(
    (j) =>
      j.authorized ||
      j.laborLines.some((l) => l.authorized) ||
      j.partLines.some((p) => p.authorized),
  ).length;

  const tabBadges = {
    summary: undefined,
    estimate: ro.jobs.length > 0 ? ro.jobs.length : undefined,
    "work-in-progress": authorizedJobCount > 0 ? authorizedJobCount : undefined,
    membership: undefined,
  };

  const phones = [
    ro.customer.phone ? { label: `${ro.customer.phone} - Mobile`, value: ro.customer.phone } : null,
    ro.customer.altPhone ? { label: `${ro.customer.altPhone} - Other`, value: ro.customer.altPhone } : null,
  ].filter((p): p is { label: string; value: string } => Boolean(p));

  const vehicleLabel = ro.vehicle
    ? [ro.vehicle.year, ro.vehicle.make, ro.vehicle.model, ro.vehicle.trim].filter(Boolean).join(" ")
    : null;

  const heroActions = (
    <>
      {approvable ? (
        <RoApproveActions
          roId={ro.id}
          roNumber={ro.number}
          customerName={customerDisplayName(ro.customer)}
          phone={ro.customer.phone}
        />
      ) : null}
      <RoMessages
        customerId={ro.customerId}
        customerName={customerDisplayName(ro.customer)}
        customerPhone={ro.customer.phone}
        marketingOptIn={ro.customer.marketingOptIn}
        roId={ro.id}
      />
      <ShareMenu
        roId={ro.id}
        roNumber={ro.number}
        customerFirstName={ro.customer.firstName}
        shopName={ro.shop.name}
        phones={phones}
        email={ro.customer.email}
        invoiceId={ro.invoice?.id ?? null}
        invoiceNumber={ro.invoice?.number ?? null}
        inspectionId={ro.inspections[0]?.id ?? null}
      />
      <PrintMenu roId={ro.id} />
    </>
  );

  return (
    <div
      className={
        isEstimateWorkspace
          ? "estimate-workspace flex min-h-0 flex-1 flex-col bg-background"
          : "flex min-h-0 flex-1 flex-col bg-muted/25"
      }
    >
      {isEstimateWorkspace ? <EstimateWorkspaceScope /> : null}
      <EstimateViewToast
        roId={ro.id}
        roNumber={ro.number}
        initialViewed={ro.estimateViewedAt != null}
        initialNotified={ro.estimateViewedNotifiedAt != null}
      />

      <div
        className={
          isEstimateWorkspace
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 md:px-5 md:py-5"
        }
      >
        <EstimateActionToastProvider>
        <RoWorkspacePanel
          basePath={basePath}
          showMembershipTab={membership.hasMembership}
          badges={tabBadges}
          allowedSegments={allowedSegments}
          fillContent={isEstimateWorkspace}
          contextDeck={
            isEstimateWorkspace ? undefined : (
            <RoContextDeck
              ro={ro}
              options={sidebarOptions}
              customerTags={customerTags}
              vehicleSpecs={vehicleSpecs}
              lastTireOrder={lastTireOrder}
              maintenanceMemory={maintenanceMemory}
            />
            )
          }
          header={
            <EstimateWorkspaceHeroBar
              roId={ro.id}
              roNumber={ro.number}
              roStatus={ro.status}
              customerName={customerDisplayName(ro.customer)}
              vehicleLabel={vehicleLabel}
              createdAt={ro.createdAt.toISOString()}
              createdByName={ro.serviceWriterName}
              serviceWriterId={ro.serviceWriterId}
              serviceWriters={sidebarOptions.serviceWriters}
              canEdit={isEstimateEditable(ro.status)}
              odometer={
                isEstimateWorkspace ? undefined : (
                  <RoOdometerHeader
                    roId={ro.id}
                    mileageIn={ro.mileageIn}
                    mileageOut={ro.mileageOut}
                    odometerNotWorking={ro.odometerNotWorking}
                    reqOdometer={sidebarOptions.reqOdometer}
                  />
                )
              }
              actions={heroActions}
            />
          }
        >
          {children}
        </RoWorkspacePanel>
        </EstimateActionToastProvider>
      </div>
    </div>
  );
}
