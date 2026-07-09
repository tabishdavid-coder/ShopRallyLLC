"use client";

import type { ComponentProps } from "react";

import { EstimateJobsList } from "@/components/repair-order/estimate-jobs-list";
import { EstimateJobLauncher } from "@/components/estimate-building/estimate-job-launcher";
import { useEstimateLabParts } from "@/components/estimate-building/estimate-lab-parts-provider";
import type { EstimateJobsLayout } from "@/generated/prisma";
import { estimateJobsLayoutToVariant } from "@/lib/estimate-jobs-layout";

type ListProps = Omit<
  ComponentProps<typeof EstimateJobsList>,
  "variant" | "onJobOpenParts" | "addJobFooter" | "jobsLayout"
>;

type LauncherProps = Omit<
  ComponentProps<typeof EstimateJobLauncher>,
  "triggerLabel" | "triggerClassName"
>;

/** Lab wrapper — parts menu wiring + bottom add-job launcher. */
export function EstimateLabJobsList(
  props: ListProps &
    LauncherProps & {
      jobsLayout?: EstimateJobsLayout;
    },
) {
  const { openPartsMenu } = useEstimateLabParts();
  const cardVariant = estimateJobsLayoutToVariant(props.jobsLayout ?? "INLINE");
  const {
    roId,
    canEdit,
    cannedJobs,
    cannedJobCategories,
    baseRateCents,
    partTiers,
    laborTiers,
    vehicleId,
    customerName,
    vehicleLabel,
    specLine,
    mileageIn,
    odometerNotWorking,
    jobsLayout: _jobsLayout,
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
      variant={cardVariant}
      jobsLayout={props.jobsLayout ?? "INLINE"}
      onJobOpenParts={
        cardVariant === "lab" ? (jobId, mode) => openPartsMenu({ jobId, mode }) : undefined
      }
      addJobFooter={
        canEdit ? (
          <div className="rounded-lg border-2 border-dashed border-brand-navy/25 bg-white/90 px-3 py-2.5">
            <EstimateJobLauncher
              roId={roId}
              cannedJobs={cannedJobs}
              cannedJobCategories={cannedJobCategories}
              baseRateCents={baseRateCents}
              partTiers={partTiers}
              laborTiers={laborTiers}
              vehicleId={vehicleId}
              customerName={customerName}
              vehicleLabel={vehicleLabel}
              specLine={specLine}
              mileageIn={mileageIn}
              odometerNotWorking={odometerNotWorking}
              triggerLabel="+ Add job"
              triggerClassName="h-9 w-full gap-2 border-brand-navy/30 bg-brand-navy text-sm font-semibold text-white shadow-none hover:bg-brand-navy/90"
            />
          </div>
        ) : null
      }
    />
  );
}
