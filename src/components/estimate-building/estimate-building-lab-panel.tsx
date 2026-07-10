import { notFound } from "next/navigation";

import { getRepairOrder } from "@/server/repair-order";
import { getVehicleHistory } from "@/server/job-history";
import { getShopTechnicians } from "@/server/staff";
import { getShopId } from "@/lib/shop";
import { prisma } from "@/db/client";
import { InvoiceStatus, PartStatus, ROStatus } from "@/generated/prisma";
import { getInvoiceShareLink } from "@/server/invoice";
import { isShopOnlinePaymentsEnabled } from "@/server/services/stripe-connect";
import type { PaymentFinanceData } from "@/components/repair-order/payment-finance-panel";
import { filterActiveRoFees } from "@/server/ro-fees";
import { listCannedJobsForPicker, listCannedJobCategories } from "@/server/canned-jobs";
import { ServiceConcernsPanel } from "@/components/repair-order/service-concerns-panel";
import { EstimateSelectionProvider } from "@/components/repair-order/estimate-selection-context";
import { EstimateRoAdjustments } from "@/components/repair-order/estimate-ro-adjustments";
import { parseApprovalSignature } from "@/lib/approval-signature";
import { isEstimateEditable } from "@/lib/estimate-editable";
import { EstimateActionToastProvider } from "@/components/repair-order/estimate-action-toast";
import { EstimateLabDisplayProvider } from "@/components/estimate-building/estimate-lab-display-context";
import { EstimateLabToolbar } from "@/components/estimate-building/estimate-lab-toolbar";
import { EstimateJobLauncher } from "@/components/estimate-building/estimate-job-launcher";
import { EstimateLabJobsList } from "@/components/estimate-building/estimate-lab-jobs-list";
import { EstimateLabPartsProvider } from "@/components/estimate-building/estimate-lab-parts-provider";
import { EstimateLabLaborProvider } from "@/components/estimate-building/estimate-lab-labor-provider";
import { EstimateLabRoHeader } from "@/components/estimate-building/estimate-lab-ro-header";
import { EstimateLabContextDrawerProvider } from "@/components/estimate-building/estimate-lab-context-drawer-provider";
import { EstimateLabContextDeeplink } from "@/components/estimate-building/estimate-lab-context-deeplink";
import { EstimateLabContextHeader } from "@/components/estimate-building/estimate-lab-context-header";
import { EstimateLabWorkTabs } from "@/components/estimate-building/estimate-lab-work-tabs";
import { EstimateLabActivityTab } from "@/components/estimate-building/estimate-lab-activity-tab";
import { EstimateLabInspectionsTab } from "@/components/estimate-building/estimate-lab-inspections-tab";
import { EstimateLabPartsTab } from "@/components/estimate-building/estimate-lab-parts-tab";
import { EstimateLabAttachmentsTab } from "@/components/estimate-building/estimate-lab-attachments-tab";
import {
  EstimateLabRightRail,
  EstimateLabRightRailLive,
  type EstimateLabFinancialSummary,
} from "@/components/estimate-building/estimate-lab-right-rail";
import type { EstimateLabQuickReferenceData } from "@/components/estimate-building/estimate-lab-quick-reference";
import { loadEstimateContextDrawerData } from "@/server/estimate-context-drawer";
import { getCustomerPaymentHistory } from "@/server/customer-payment-history";
import { getDefaultAppointmentDuration } from "@/server/actions/appointments";
import { computeRoTotals } from "@/lib/ro-totals";
import { inspectionProgress } from "@/lib/inspection";
import { getDepositRequestForRo } from "@/server/deposit-request";
import { getIntegrationStatusForShop } from "@/server/integrations";
import { getRoSidebarOptions } from "@/server/ro-sidebar-options";
import { getVehicleSpecsBundle } from "@/server/vehicle-specs-bundle";
import { getRepairOrderAuditTrail } from "@/server/shop-audit";
import { RoAuditTrailPanel } from "@/components/repair-order/ro-audit-trail-panel";
import { buildHubParts } from "@/lib/hub-parts";
import { buildServiceJobSummaries } from "@/lib/service-job-parts";
import { resolveEstimateJobsLayout } from "@/lib/estimate-jobs-layout";
import {
  ESTIMATE_JOBS_CANVAS,
  ESTIMATE_JOBS_CONTENT,
  ESTIMATE_JOBS_SCROLL,
} from "@/lib/estimate-workspace-layout";
import { cn } from "@/lib/utils";
import type { RepairOrderDetail } from "@/server/repair-order";

export type EstimateWorkspaceVariant = "lab" | "production";

function buildLabFinancial(
  ro: RepairOrderDetail,
  totals: ReturnType<typeof computeRoTotals>,
): EstimateLabFinancialSummary {
  const paidCents = ro.invoice?.payments.reduce((s, p) => s + p.amountCents, 0) ?? 0;
  const taxPct = (ro.shop.taxRateBps / 100).toFixed(2);

  return {
    laborCents: totals.laborCents,
    partsCents: totals.partsCents,
    tireCents: 0,
    otherCents: 0,
    shopSuppliesCents: ro.shopSuppliesCents,
    serviceDiscountsCents: 0,
    roDiscountsCents: totals.discountsCents,
    serviceFeesCents: 0,
    roFeesCents: totals.feesCents,
    taxCents: totals.taxesCents,
    taxLabel: `Sales tax ${taxPct}%`,
    estimateTotalCents: totals.totalCents,
    paidCents,
    remainingCents: Math.max(0, totals.totalCents - paidCents),
  };
}

function buildQuickReference(ro: RepairOrderDetail): EstimateLabQuickReferenceData {
  let partsNeeded = 0;
  let partsQuoted = 0;
  let partsOrdered = 0;
  let unassignedJobs = 0;

  for (const job of ro.jobs) {
    if (!job.technicianId) unassignedJobs++;
    for (const part of job.partLines) {
      if (part.status === PartStatus.NEEDED) partsNeeded++;
      else if (part.status === PartStatus.QUOTED) partsQuoted++;
      else if (part.status === PartStatus.ORDERED) partsOrdered++;
    }
  }

  return {
    createdAt: ro.createdAt,
    promiseTime: ro.promiseTime,
    approvalSentAt: ro.approvalSentAt,
    estimateViewedAt: ro.estimateViewedAt,
    authorizedAt: ro.authorizedAt,
    partsNeeded,
    partsQuoted,
    partsOrdered,
    technicianId: ro.technicianId,
    technicianName: ro.technicianName,
    unassignedJobs,
    vin: ro.vehicle?.vin ?? null,
    plate: ro.vehicle?.plate ?? null,
    plateState: ro.vehicle?.plateState ?? null,
  };
}

function buildAuthJobs(ro: RepairOrderDetail) {
  return ro.jobs.map((j) => ({
    id: j.id,
    approvedAt: j.approvedAt,
    authorized: j.authorized,
    laborLines: j.laborLines.map((l) => ({ authorized: l.authorized })),
    partLines: j.partLines.map((p) => ({ authorized: p.authorized })),
  }));
}

/** Blended estimate builder — design lab or production RO estimate tab.
 *  New CRM UX ships on `variant="production"` (`/repair-orders/[id]/estimate`).
 *  Design lab (`/design-review/estimate-building`) is preview-only — gate features with `isProductionWorkspace`. */
export async function EstimateBuildingLabPanel({
  roId,
  shopId: shopIdProp,
  variant = "lab",
}: {
  roId: string;
  shopId?: string;
  variant?: EstimateWorkspaceVariant;
}) {
  const shopId = shopIdProp ?? (await getShopId());
  const ro = await getRepairOrder({ shopId, id: roId });
  if (!ro) notFound();

  const isLab = variant === "lab";
  const isProductionWorkspace = variant === "production";

  const [
    deposit,
    { history, declined },
    technicians,
    discountTemplates,
    allFeeTemplates,
    cannedJobs,
    cannedJobCategories,
    partstechStatus,
    weldonStatus,
    sidebarOptions,
    auditEvents,
    contextDrawerData,
    vehicleSpecsBundle,
    defaultAppointmentDurationMins,
    invoiceShareLink,
    stripeEnabled,
    customerPaymentHistory,
  ] = await Promise.all([
    getDepositRequestForRo(shopId, ro.id),
    getVehicleHistory(shopId, ro.vehicleId, ro.id),
    getShopTechnicians(shopId),
    prisma.shopDiscountTemplate.findMany({
      where: { shopId },
      orderBy: { sortOrder: "asc" },
      select: { name: true, method: true, base: true, amount: true },
    }),
    prisma.shopFeeTemplate.findMany({
      where: { shopId },
      orderBy: { sortOrder: "asc" },
      select: {
        name: true,
        method: true,
        base: true,
        amount: true,
        capCents: true,
        taxable: true,
        autoApply: true,
      },
    }),
    listCannedJobsForPicker(shopId),
    listCannedJobCategories(shopId),
    getIntegrationStatusForShop(shopId, "partstech"),
    getIntegrationStatusForShop(shopId, "weldon"),
    getRoSidebarOptions(shopId),
    isLab ? Promise.resolve([]) : getRepairOrderAuditTrail(shopId, ro.id, "estimate"),
    loadEstimateContextDrawerData(shopId, ro.customerId),
    ro.vehicleId
      ? getVehicleSpecsBundle(shopId, ro.vehicleId, { excludeRoId: ro.id })
      : Promise.resolve(null),
    getDefaultAppointmentDuration(),
    getInvoiceShareLink({ shopId, repairOrderId: ro.id }),
    isShopOnlinePaymentsEnabled(shopId),
    getCustomerPaymentHistory(shopId, ro.customerId),
  ]);
  const feeTemplates = allFeeTemplates.filter((f) => f.autoApply);
  const filteredFees = filterActiveRoFees(ro.fees, allFeeTemplates);
  const activeRoFees = filteredFees.filter((f) => !f.jobId);
  const roTotals = computeRoTotals({
    jobs: ro.jobs.map((j) => ({
      id: j.id,
      laborTaxable: j.laborTaxable,
      partsTaxable: j.partsTaxable,
      laborLines: j.laborLines.map((l) => ({ totalCents: l.totalCents, authorized: l.authorized })),
      partLines: j.partLines.map((p) => ({ totalCents: p.totalCents, authorized: p.authorized })),
    })),
    fees: filteredFees,
    discounts: ro.discounts,
    shopSuppliesCents: ro.shopSuppliesCents,
    taxRateBps: ro.shop.taxRateBps,
    taxOnLabor: ro.shop.taxOnLabor,
    taxOnParts: ro.shop.taxOnParts,
    taxOnFees: ro.shop.taxOnFees,
    taxCapCents: ro.shop.taxCapCents,
  });
  const baseFinancial = buildLabFinancial(ro, roTotals);
  const authJobs = buildAuthJobs(ro);
  const gpGoalCents = ro.shop.gpPerHourGoalCents;
  const customerConcerns = ro.vehicleConcerns.filter((c) => c.kind === "CUSTOMER");
  const technicianConcerns = ro.vehicleConcerns.filter((c) => c.kind === "TECHNICIAN");

  const v = ro.vehicle;
  const vehicleLabel = v
    ? [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ")
    : "Vehicle";
  const customerName =
    ro.customer.company?.trim() ||
    `${ro.customer.firstName ?? ""} ${ro.customer.lastName ?? ""}`.trim();

  const approvable = ro.status === ROStatus.ESTIMATE || ro.status === ROStatus.APPROVED;
  const canEdit = isEstimateEditable(ro.status);
  const baseRate = ro.laborRateCents ?? ro.shop.laborRateCents;
  const hasJobs = ro.jobs.length > 0;
  const approvalSignature = parseApprovalSignature(ro);

  const inspectionRows = ro.inspections.map((insp) => {
    const progress = inspectionProgress(
      insp.items.map((i) => ({ status: i.status })),
    );
    return {
      id: insp.id,
      templateName: insp.templateName,
      status: insp.status,
      performedAt: insp.performedAt,
      itemCount: progress.total,
      ratedCount: progress.rated,
    };
  });

  const specLine = v
    ? [
        v.vin ? `VIN ${v.vin}` : null,
        ro.mileageIn ? `${ro.mileageIn.toLocaleString("en-US")} mi` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const vehicleSpec = v
    ? [v.engine, v.drivetrain].filter(Boolean).join(" · ") || null
    : null;

  const paymentBalanceDueCents = ro.invoice?.balanceCents ?? ro.totalCents;
  const canArchiveRo =
    (ro.status === ROStatus.COMPLETED || ro.status === ROStatus.INVOICED) &&
    Boolean(ro.invoice?.payments.length) &&
    paymentBalanceDueCents <= 0;

  const rightRailCommon = {
    roId: ro.id,
    roNumber: ro.number,
    roStatus: ro.status,
    canArchive: canArchiveRo,
    customerId: ro.customerId,
    customerName,
    customerFirstName: ro.customer.firstName?.trim() || customerName.split(/\s+/)[0] || "Customer",
    phone: ro.customer.phone,
    email: ro.customer.email,
    marketingOptIn: ro.customer.marketingOptIn,
    shopName: ro.shop.name,
    canEdit,
    approvable,
    deposit,
    estimateTotalCents: ro.totalCents,
    quickReference: buildQuickReference(ro),
    vehicleSpecs: vehicleSpecsBundle,
    technicians: sidebarOptions.technicians,
    // Design-mode-only payment status override — production always shows real invoice data.
    allowPaymentPreview: variant === "lab",
  };

  const jobsLayout = resolveEstimateJobsLayout(ro.shop.estimateJobsLayout);

  const editableVehicle = v
    ? {
        id: v.id,
        vin: v.vin,
        plate: v.plate,
        plateState: v.plateState,
        unitNumber: v.unitNumber,
        notes: v.notes,
        year: v.year,
        make: v.make,
        model: v.model,
        trim: v.trim,
        engine: v.engine,
        transmission: v.transmission,
        drivetrain: v.drivetrain,
        bodyClass: v.bodyClass,
        tireSizeFront: v.tireSizeFront,
        tireSizeRear: v.tireSizeRear,
      }
    : null;

  const customerRecord = {
    id: ro.customer.id,
    firstName: ro.customer.firstName ?? "",
    lastName: ro.customer.lastName ?? "",
    company: ro.customer.company,
    phone: ro.customer.phone,
    email: ro.customer.email,
    address: ro.customer.address,
    city: ro.customer.city,
    state: ro.customer.state,
    zip: ro.customer.zip,
    marketingOptIn: ro.customer.marketingOptIn,
    notes: ro.customer.notes,
    tags: ro.customer.tags ?? [],
  };

  const builderMain = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <EstimateLabContextHeader
        variant={variant}
        roId={ro.id}
        roNumber={ro.number}
        roStatus={ro.status}
        customerId={ro.customerId}
        customerName={customerName}
        createdAt={ro.createdAt.toISOString()}
        createdByName={ro.serviceWriterName}
        serviceWriterId={ro.serviceWriterId}
        serviceWriters={sidebarOptions.serviceWriters}
        canEdit={canEdit}
        mileageIn={ro.mileageIn}
        mileageOut={ro.mileageOut}
        odometerNotWorking={ro.odometerNotWorking}
        reqOdometer={sidebarOptions.reqOdometer}
        customer={customerRecord}
        vehicle={editableVehicle}
        drawerData={contextDrawerData}
        vehicleSpecs={vehicleSpecsBundle}
      />

      {!canEdit && hasJobs ? (
        <div
          className={cn(
            "mt-2 shrink-0 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground",
            isLab ? "mx-4" : "mx-3 md:mx-4",
          )}
        >
          Read-only — completed or invoiced estimates cannot be edited here.
        </div>
      ) : null}

      <EstimateLabRoHeader
        roId={ro.id}
        canEdit={canEdit}
        shopNotes={ro.notes}
        customerRecommendations={ro.customerRecommendations ?? null}
      />

      <EstimateLabWorkTabs
        panels={{
          concerns: (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ServiceConcernsPanel
                roId={ro.id}
                customerConcerns={customerConcerns}
                technicianConcerns={technicianConcerns}
                history={history}
                declined={declined}
                approval={{
                  sentAt: ro.approvalSentAt,
                  viewedAt: ro.estimateViewedAt,
                  authorizedAt: ro.authorizedAt,
                  approvedVia: ro.approvedVia,
                }}
                roStatus={ro.status}
                embedded
                layout="stacked"
                variant="lab"
              />
            </div>
          ),
          services: (
            <div className={ESTIMATE_JOBS_CANVAS}>
              <EstimateLabToolbar
                roId={ro.id}
                canEdit={canEdit}
                cannedJobs={cannedJobs}
                cannedJobCategories={cannedJobCategories}
                baseRateCents={baseRate}
                partTiers={ro.shop.partMatrix}
                laborTiers={ro.shop.laborMatrix}
                vehicleId={ro.vehicleId}
                customerName={customerName}
                vehicleLabel={vehicleLabel}
                specLine={specLine}
                mileageIn={ro.mileageIn}
                odometerNotWorking={ro.odometerNotWorking}
              />
              <div className={ESTIMATE_JOBS_SCROLL}>
                {hasJobs ? (
                  <>
                    <EstimateLabJobsList
                      roId={ro.id}
                      canEdit={canEdit}
                      taxBps={ro.shop.taxRateBps}
                      partTiers={ro.shop.partMatrix}
                      laborTiers={ro.shop.laborMatrix}
                      baseRateCents={baseRate}
                      gpGoalCents={gpGoalCents}
                      technicians={technicians}
                      fees={ro.fees}
                      discounts={ro.discounts}
                      feeTemplates={allFeeTemplates.map(({ autoApply: _, ...t }) => t)}
                      discountTemplates={discountTemplates}
                      approvedVia={ro.approvedVia}
                      approvedAt={ro.authorizedAt}
                      approvalSignature={approvalSignature}
                      cannedJobCategories={cannedJobCategories}
                      embedded
                      jobsLayout={jobsLayout}
                    />
                    <div className={cn(ESTIMATE_JOBS_CONTENT, "pb-4")}>
                      <EstimateRoAdjustments
                        roId={ro.id}
                        fees={activeRoFees}
                        discounts={ro.discounts.filter((d) => !d.jobId)}
                        discountTemplates={discountTemplates}
                        feeTemplates={feeTemplates.map(({ autoApply: _, ...t }) => t)}
                        jobCount={ro.jobs.length}
                      />
                    </div>
                  </>
                ) : (
                  <div className={cn(ESTIMATE_JOBS_CONTENT, "py-12 text-center")}>
                    <p className="text-sm font-medium text-foreground">
                      No jobs on this estimate yet
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use the toolbar to search jobs & templates, open the Labor Book, or add a
                      blank job.
                    </p>
                    {canEdit ? (
                      <div className="mt-5 flex justify-center">
                        <EstimateJobLauncher
                          roId={ro.id}
                          cannedJobs={cannedJobs}
                          cannedJobCategories={cannedJobCategories}
                          baseRateCents={baseRate}
                          partTiers={ro.shop.partMatrix}
                          laborTiers={ro.shop.laborMatrix}
                          vehicleId={ro.vehicleId}
                          customerName={customerName}
                          vehicleLabel={vehicleLabel}
                          specLine={specLine}
                          mileageIn={ro.mileageIn}
                          odometerNotWorking={ro.odometerNotWorking}
                          triggerLabel="Add to estimate"
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ),
          inspections: (
            <EstimateLabInspectionsTab
              roId={ro.id}
              roNumber={ro.number}
              inspections={inspectionRows}
              existingTemplateNames={ro.inspections.map((i) => i.templateName)}
            />
          ),
          activity: (
            <EstimateLabActivityTab
              roId={ro.id}
              activities={ro.activities.map((a) => ({
                id: a.id,
                type: a.type,
                description: a.description,
                createdAt: a.createdAt,
              }))}
            />
          ),
          parts: (
            <EstimateLabPartsTab
              canEdit={canEdit}
              partstechState={partstechStatus.state}
              weldonState={weldonStatus.state}
            />
          ),
          attachments: <EstimateLabAttachmentsTab />,
        }}
      />
    </div>
  );

  const builderBody = (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {builderMain}
      {hasJobs ? (
        <EstimateLabRightRailLive
          {...rightRailCommon}
          baseFinancial={baseFinancial}
          baseJobs={authJobs}
          gpGoalCents={gpGoalCents}
        />
      ) : (
        <EstimateLabRightRail
          {...rightRailCommon}
          jobs={authJobs}
          financial={baseFinancial}
        />
      )}
    </div>
  );

  const hubParts = buildHubParts(ro.jobs);
  const serviceJobs = buildServiceJobSummaries(ro.jobs);

  const invoiceShareUrl = invoiceShareLink.ok ? invoiceShareLink.url : null;
  const paymentInvoiceId = invoiceShareLink.ok ? invoiceShareLink.invoiceId : (ro.invoice?.id ?? null);
  const paymentIsPaid = paymentBalanceDueCents <= 0 || ro.invoice?.status === InvoiceStatus.PAID;
  const paymentSubtotalCents =
    ro.laborSubtotalCents + ro.partsSubtotalCents + ro.shopSuppliesCents + ro.feesSubtotalCents;
  const paymentPayments = [...(ro.invoice?.payments ?? [])].sort(
    (a, b) => b.paidAt.getTime() - a.paidAt.getTime(),
  );
  const paymentPhones = [
    ro.customer.phone ? { label: `${ro.customer.phone} - Mobile`, value: ro.customer.phone } : null,
    ro.customer.altPhone ? { label: `${ro.customer.altPhone} - Other`, value: ro.customer.altPhone } : null,
  ].filter((p): p is { label: string; value: string } => Boolean(p));

  const paymentData: PaymentFinanceData = {
    repairOrderId: ro.id,
    roNumber: ro.number,
    roStatus: ro.status,
    isPaid: paymentIsPaid,
    invoiceStatus: ro.invoice?.status ?? null,
    balanceDueCents: paymentIsPaid ? 0 : paymentBalanceDueCents,
    stripeEnabled,
    invoiceId: paymentInvoiceId,
    invoiceNumber: ro.invoice?.number ?? null,
    shareUrl: invoiceShareUrl,
    customerFirstName: rightRailCommon.customerFirstName,
    shopName: ro.shop.name,
    phones: paymentPhones,
    email: ro.customer.email,
    laborSubtotalCents: ro.laborSubtotalCents,
    feesSubtotalCents: ro.feesSubtotalCents,
    subtotalCents: paymentSubtotalCents,
    taxCents: ro.taxCents,
    grandTotalCents: ro.totalCents,
    totalPaidCents: ro.totalCents - paymentBalanceDueCents,
    payments: paymentPayments.map((p) => ({
      id: p.id,
      method: p.method,
      amountCents: p.amountCents,
      paidAt: p.paidAt.toISOString(),
      reference: p.reference,
      stripePaymentIntentId: p.stripePaymentIntentId,
      customerName,
      repairOrderId: ro.id,
      roNumber: ro.number,
      status: "succeeded" as const,
    })),
    customerPayments: customerPaymentHistory.payments,
    failedCustomerPayments: customerPaymentHistory.failedPayments,
  };

  const workspaceInner = (
    <EstimateLabContextDrawerProvider
      customer={customerRecord}
      customerId={ro.customerId}
      vehicle={editableVehicle}
      roId={ro.id}
      roNumber={ro.number}
      mileageIn={ro.mileageIn}
      odometerNotWorking={ro.odometerNotWorking}
      canEdit={canEdit}
      drawerData={contextDrawerData}
      vehicleSpecs={vehicleSpecsBundle}
      paymentData={paymentData}
      appointmentEmployees={technicians}
      defaultAppointmentDurationMins={defaultAppointmentDurationMins}
    >
      <EstimateLabContextDeeplink />
    <EstimateLabDisplayProvider>
      <EstimateLabPartsProvider
        roId={ro.id}
        jobs={serviceJobs}
        hubParts={hubParts}
        vehicleLabel={vehicleLabel}
        specLine={specLine}
        canEdit={canEdit}
        partstechState={partstechStatus.state}
        weldonState={weldonStatus.state}
      >
        <EstimateLabLaborProvider
          roId={ro.id}
          vehicleId={ro.vehicleId}
          customerName={customerName}
          vehicleLabel={vehicleLabel}
          specLine={specLine}
          mileageIn={ro.mileageIn}
          odometerNotWorking={ro.odometerNotWorking}
        >
        <div
          className={cn(
            "estimate-workspace flex h-full min-h-0 flex-col",
            isLab && "border border-brand-light/40 bg-background shadow-sm",
            isProductionWorkspace && "bg-background",
          )}
        >
          {hasJobs ? (
            <EstimateSelectionProvider
              jobs={ro.jobs}
              fees={filteredFees}
              discounts={ro.discounts}
              shopSuppliesCents={ro.shopSuppliesCents}
              taxRateBps={ro.shop.taxRateBps}
              taxOnLabor={ro.shop.taxOnLabor}
              taxOnParts={ro.shop.taxOnParts}
              taxOnFees={ro.shop.taxOnFees}
              taxCapCents={ro.shop.taxCapCents}
            >
              {builderBody}
            </EstimateSelectionProvider>
          ) : (
            builderBody
          )}

          {!isLab && !isProductionWorkspace ? (
            <RoAuditTrailPanel
              className="mt-6 shrink-0"
              title="Estimate change log"
              description="Who changed jobs, lines, and authorization on this repair order."
              events={auditEvents}
            />
          ) : null}
        </div>
        </EstimateLabLaborProvider>
      </EstimateLabPartsProvider>
    </EstimateLabDisplayProvider>
    </EstimateLabContextDrawerProvider>
  );

  if (isLab) {
    return <EstimateActionToastProvider>{workspaceInner}</EstimateActionToastProvider>;
  }

  return workspaceInner;
}
