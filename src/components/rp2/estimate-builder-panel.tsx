import { notFound } from "next/navigation";

import { EstimateWorkArea } from "@/components/repair-order/estimate-work-area";
import { getRepairOrder } from "@/server/repair-order";
import { getVehicleHistory } from "@/server/job-history";
import { getShopTechnicians } from "@/server/staff";
import { getShopId } from "@/lib/shop";
import { prisma } from "@/db/client";
import { ROStatus } from "@/generated/prisma";
import { filterActiveRoFees } from "@/server/ro-fees";
import { listCannedJobsForPicker, listCannedJobCategories } from "@/server/canned-jobs";
import { ServiceConcernsPanel } from "@/components/repair-order/service-concerns-panel";
import { EstimateSelectionProvider } from "@/components/repair-order/estimate-selection-context";
import { EstimateJobsList } from "@/components/repair-order/estimate-jobs-list";
import { EstimateAddJob } from "@/components/repair-order/estimate-add-job";
import { RoEstimateHeroToolbar } from "@/components/repair-order/ro-estimate-hero-toolbar";
import { EstimateRoAdjustments } from "@/components/repair-order/estimate-ro-adjustments";
import { parseApprovalSignature } from "@/lib/approval-signature";
import { isEstimateEditable } from "@/lib/estimate-editable";
import { EstimateActionToastProvider } from "@/components/repair-order/estimate-action-toast";
import { EstimateLaborGuideShell } from "@/components/estimate-building/estimate-labor-guide-shell";
import { EstimateWorkflowSummary } from "@/components/rp2/estimate-workflow-summary";
import { RO_STATUS_PILL } from "@/lib/ro-status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export async function EstimateBuilderPanel({ roId }: { roId: string }) {
  const shopId = await getShopId();
  const ro = await getRepairOrder({ shopId, id: roId });
  if (!ro) notFound();

  const { history, declined } = await getVehicleHistory(shopId, ro.vehicleId, ro.id);
  const [technicians, discountTemplates, allFeeTemplates, cannedJobs, cannedJobCategories] =
    await Promise.all([
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
    ]);
  const feeTemplates = allFeeTemplates.filter((f) => f.autoApply);
  const filteredFees = filterActiveRoFees(ro.fees, allFeeTemplates);
  const activeRoFees = filteredFees.filter((f) => !f.jobId);
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
  const pill = RO_STATUS_PILL[ro.status];

  const hubParts = ro.jobs.flatMap((j) =>
    j.partLines.map((p) => ({
      id: p.id,
      description: p.description,
      brand: p.brand,
      partNumber: p.partNumber,
      quantity: p.quantity,
      costCents: p.costCents,
      retailCents: p.retailCents,
      status: p.status,
      vendor: p.vendor,
      jobName: j.name,
    })),
  );

  const specLine = v
    ? [
        v.vin ? `VIN ${v.vin}` : null,
        ro.mileageIn ? `${ro.mileageIn.toLocaleString()} mi` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const builderBody = (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="border-b border-border px-3 py-2">
          <RoEstimateHeroToolbar
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
            jobs={ro.jobs.map((j) => ({ id: j.id, name: j.name }))}
            parts={hubParts}
          />
        </div>

        <EstimateWorkArea layout="stacked">
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
            layout="banner"
          />

          <div className="min-w-0 flex flex-col bg-background">
          {hasJobs ? (
            <>
              <EstimateJobsList
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
                approvedVia={ro.approvedVia}
                roAuthorizedAt={ro.authorizedAt}
                approvalSentAt={ro.approvalSentAt}
                approvalSignature={approvalSignature}
                cannedJobCategories={cannedJobCategories}
                embedded
              />
              {canEdit ? (
                <div className="border-t border-border px-3 pb-2">
                  <EstimateAddJob
                    roId={ro.id}
                    cannedJobs={cannedJobs}
                    cannedJobCategories={cannedJobCategories}
                    baseRateCents={baseRate}
                    partTiers={ro.shop.partMatrix}
                    laborTiers={ro.shop.laborMatrix}
                  />
                </div>
              ) : null}
              <EstimateRoAdjustments
                roId={ro.id}
                fees={activeRoFees}
                discounts={ro.discounts.filter((d) => !d.jobId)}
                discountTemplates={discountTemplates}
                feeTemplates={feeTemplates.map(({ autoApply: _, ...t }) => t)}
                jobCount={ro.jobs.length}
              />
            </>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {canEdit
                  ? "No quoted jobs yet. Add a job here or pull items from Service Concerns."
                  : "No jobs on this estimate."}
              </p>
              {canEdit ? (
                <div className="mt-4 flex justify-center">
                  <EstimateAddJob
                    roId={ro.id}
                    cannedJobs={cannedJobs}
                    cannedJobCategories={cannedJobCategories}
                    baseRateCents={baseRate}
                    partTiers={ro.shop.partMatrix}
                    laborTiers={ro.shop.laborMatrix}
                  />
                </div>
              ) : null}
            </div>
          )}
          </div>
        </EstimateWorkArea>
      </div>

      {hasJobs ? (
        <EstimateWorkflowSummary
          roId={ro.id}
          roNumber={ro.number}
          customerName={customerName}
          phone={ro.customer.phone}
          approvable={approvable}
          taxRateBps={ro.shop.taxRateBps}
        />
      ) : null}
    </div>
  );

  return (
    <EstimateActionToastProvider>
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-white px-4 py-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-crm-label">
              Estimate Builder
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-brand-navy">RO #{ro.number}</h2>
              <Badge variant="outline" className={cn("rounded-md text-[10px]", pill.className)}>{pill.label}</Badge>
            </div>
          </div>
          <div className="hidden h-8 w-px bg-border sm:block" />
          <div className="min-w-0 text-xs text-crm-caption">
            <span className="font-medium text-foreground">{customerName}</span>
            <span className="mx-1.5">·</span>
            <span>{vehicleLabel}</span>
            {specLine ? (
              <>
                <span className="mx-1.5">·</span>
                <span>{specLine}</span>
              </>
            ) : null}
          </div>
        </div>

        {!canEdit && hasJobs ? (
          <div className="mx-4 mt-2 shrink-0 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
            Read-only — completed or invoiced estimates cannot be edited here.
          </div>
        ) : null}

        {hasJobs ? (
          <EstimateLaborGuideShell
            roId={ro.id}
            vehicleId={ro.vehicleId}
            customerName={customerName}
            vehicleLabel={vehicleLabel}
            specLine={specLine}
            mileageIn={ro.mileageIn}
            odometerNotWorking={ro.odometerNotWorking}
          >
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
          </EstimateLaborGuideShell>
        ) : (
          builderBody
        )}
      </div>
    </EstimateActionToastProvider>
  );
}
