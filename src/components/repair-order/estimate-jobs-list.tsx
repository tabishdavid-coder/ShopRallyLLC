"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { EstimateJobCard } from "@/components/repair-order/estimate-job-card";
import { EstimateLabJobsDndList } from "@/components/estimate-building/estimate-lab-jobs-dnd-list";
import { EstimateJobsHeader } from "@/components/repair-order/estimate-jobs-header";
import { useEstimateSelection } from "@/components/repair-order/estimate-selection-context";
import type { ApprovalSignatureInfo } from "@/components/repair-order/approval-signature-panel";
import type { AdjustTemplate } from "@/components/estimate-building/estimate-lab-adjustment-shared";
import type { Technician } from "@/server/staff";
import type { RepairOrderDetail } from "@/server/repair-order";
import type { PartTier, LaborTier } from "@/lib/matrix";
import type { EstimateJobsLayout } from "@/generated/prisma";
import { cn } from "@/lib/utils";

type Fee = RepairOrderDetail["fees"][number];
type Discount = RepairOrderDetail["discounts"][number];

export function EstimateJobsList({
  roId,
  canEdit,
  taxBps,
  partTiers,
  laborTiers,
  baseRateCents,
  gpGoalCents,
  technicians,
  fees,
  discounts,
  feeTemplates = [],
  discountTemplates = [],
  approvedVia,
  roAuthorizedAt = null,
  approvalSentAt = null,
  approvalSignature = null,
  cannedJobCategories = [],
  embedded = false,
  variant = "default",
  jobsLayout,
  onJobOpenParts,
  addJobFooter,
  showHeaderControls = true,
  headerAction,
}: {
  roId: string;
  canEdit: boolean;
  taxBps: number;
  partTiers: PartTier[];
  laborTiers: LaborTier[];
  baseRateCents: number;
  gpGoalCents?: number | null;
  technicians: Technician[];
  fees: Fee[];
  discounts: Discount[];
  feeTemplates?: AdjustTemplate[];
  discountTemplates?: AdjustTemplate[];
  approvedVia?: string | null;
  /** RO-level authorization timestamp — drives declined vs pending on job cards. */
  roAuthorizedAt?: Date | string | null;
  /** When the approval link was sent — jobs show Pending before RO is authorized. */
  approvalSentAt?: Date | string | null;
  approvalSignature?: ApprovalSignatureInfo | null;
  cannedJobCategories?: string[];
  embedded?: boolean;
  variant?: "default" | "lab";
  jobsLayout?: EstimateJobsLayout;
  /** Lab only — open parts panel for a job (manual entry vs supplier lookup). */
  onJobOpenParts?: (jobId: string, mode: "manual" | "lookup") => void;
  /** Optional footer slot (e.g. lab add-job launcher at list bottom). */
  addJobFooter?: ReactNode;
  showHeaderControls?: boolean;
  headerAction?: ReactNode;
}) {
  const { mergedJobs, toggleJob, toggleLabor, togglePart, setJobDraft } = useEstimateSelection();
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [expandToken, setExpandToken] = useState(0);

  function toggleBulkCollapse() {
    setAllCollapsed((c) => {
      if (c) setExpandToken((t) => t + 1);
      return !c;
    });
  }

  return (
    <div
      className={cn(
        embedded
          ? "space-y-3 px-3 pb-3 pt-2.5 sm:px-4"
          : "space-y-2 rounded-none bg-white p-3 ring-1 ring-[#CBD8E7]",
      )}
    >
      <EstimateJobsHeader
        collapsed={allCollapsed}
        onToggleCollapse={toggleBulkCollapse}
        variant={variant}
        jobsReorderable={variant === "lab" && canEdit}
        settingsHref="/settings/ro-settings?section=estimate-workspace"
        jobsLayout={jobsLayout}
        showHeaderControls={showHeaderControls}
        headerAction={headerAction}
      />
      {variant === "lab" && canEdit ? (
        <EstimateLabJobsDndList
          roId={roId}
          jobs={mergedJobs}
          canEdit={canEdit}
          taxBps={taxBps}
          partTiers={partTiers}
          laborTiers={laborTiers}
          baseRateCents={baseRateCents}
          gpGoalCents={gpGoalCents}
          technicians={technicians}
          fees={fees}
          discounts={discounts}
          feeTemplates={feeTemplates}
          discountTemplates={discountTemplates}
          approvedVia={approvedVia}
          roAuthorizedAt={roAuthorizedAt}
          approvalSentAt={approvalSentAt}
          approvalSignature={approvalSignature}
          onToggleJob={toggleJob}
          onToggleLabor={toggleLabor}
          onTogglePart={togglePart}
          forceCollapsed={allCollapsed}
          expandToken={expandToken}
          onDraftChange={setJobDraft}
          cannedJobCategories={cannedJobCategories}
          variant={variant}
          onJobOpenParts={onJobOpenParts}
        />
      ) : (
        mergedJobs.map((job, i) => (
          <EstimateJobCard
            key={job.id}
            index={i}
            job={job}
            canEdit={canEdit}
            taxBps={taxBps}
            partTiers={partTiers}
            laborTiers={laborTiers}
            baseRateCents={baseRateCents}
            gpGoalCents={gpGoalCents}
            technicians={technicians}
            roId={roId}
            roAuthorizedAt={roAuthorizedAt}
            approvalSentAt={approvalSentAt}
            customerApproved={approvedVia === "CUSTOMER" && Boolean(job.approvedAt)}
            approvalSignature={approvalSignature}
            jobFees={fees.filter((f) => f.jobId === job.id)}
            jobDiscounts={discounts.filter((d) => d.jobId === job.id)}
            feeTemplates={feeTemplates}
            discountTemplates={discountTemplates}
            onToggleJob={(auth) => toggleJob(job.id, auth)}
            onToggleLabor={(lineId, auth) => toggleLabor(job.id, lineId, auth)}
            onTogglePart={(lineId, auth) => togglePart(job.id, lineId, auth)}
            forceCollapsed={allCollapsed}
            expandToken={expandToken}
            onDraftChange={setJobDraft}
            cannedJobCategories={cannedJobCategories}
            variant={variant}
            onOpenParts={
              onJobOpenParts ? (mode) => onJobOpenParts(job.id, mode) : undefined
            }
          />
        ))
      )}
      {addJobFooter ? <div className="pt-0.5">{addJobFooter}</div> : null}
    </div>
  );
}
