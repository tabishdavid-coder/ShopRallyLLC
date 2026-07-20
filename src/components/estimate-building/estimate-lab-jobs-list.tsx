"use client";

import type { ComponentProps } from "react";

import { EstimateJobsList } from "@/components/repair-order/estimate-jobs-list";
import { EstimateJobActionsCluster } from "@/components/estimate-building/estimate-job-actions-cluster";
import { useEstimateLabParts } from "@/components/estimate-building/estimate-lab-parts-provider";
import type { EstimateJobsLayout } from "@/generated/prisma";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import { estimateJobsLayoutToVariant } from "@/lib/estimate-jobs-layout";
import { usePartsTechUiEnabled } from "@/lib/shop-capabilities";

type ListProps = Omit<
  ComponentProps<typeof EstimateJobsList>,
  "variant" | "onJobOpenParts" | "addJobFooter" | "jobsLayout" | "showHeaderControls" | "headerAction"
>;

/** Lab wrapper — canned / + Job / AI in jobs header; parts menu wiring on job cards. */
export function EstimateLabJobsList(
  props: ListProps & {
    jobsLayout?: EstimateJobsLayout;
    cannedJobs: CannedJobSummary[];
    vehicleId: string;
    customerName: string;
    vehicleLabel: string;
    specLine: string;
    mileageIn?: number | null;
    odometerNotWorking?: boolean;
  },
) {
  const { openPartsMenu } = useEstimateLabParts();
  const partsTechOk = usePartsTechUiEnabled();
  const cardVariant = estimateJobsLayoutToVariant(props.jobsLayout ?? "INLINE");
  const {
    jobsLayout,
    cannedJobs,
    vehicleId: _vehicleId,
    customerName: _customerName,
    vehicleLabel: _vehicleLabel,
    specLine: _specLine,
    mileageIn: _mileageIn,
    odometerNotWorking: _odometerNotWorking,
    canEdit,
    roId,
    baseRateCents,
    partTiers,
    laborTiers,
    cannedJobCategories,
    ...listProps
  } = props;

  return (
    <EstimateJobsList
      {...listProps}
      roId={roId}
      canEdit={canEdit}
      baseRateCents={baseRateCents}
      partTiers={partTiers}
      laborTiers={laborTiers}
      cannedJobCategories={cannedJobCategories}
      variant={cardVariant}
      jobsLayout={jobsLayout ?? "INLINE"}
      showHeaderControls={false}
      headerAction={
        canEdit ? (
          <EstimateJobActionsCluster
            roId={roId}
            cannedJobs={cannedJobs}
            cannedJobCategories={cannedJobCategories ?? []}
            baseRateCents={baseRateCents}
            partTiers={partTiers}
            laborTiers={laborTiers}
          />
        ) : null
      }
      onJobOpenParts={
        cardVariant === "lab" && partsTechOk
          ? (jobId, mode) => openPartsMenu({ jobId, mode })
          : undefined
      }
    />
  );
}
