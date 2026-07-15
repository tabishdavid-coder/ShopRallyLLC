"use client";

import type { ComponentProps } from "react";

import { EstimateJobsList } from "@/components/repair-order/estimate-jobs-list";
import { useEstimateLabParts } from "@/components/estimate-building/estimate-lab-parts-provider";
import type { EstimateJobsLayout } from "@/generated/prisma";
import { estimateJobsLayoutToVariant } from "@/lib/estimate-jobs-layout";
import { usePartsTechUiEnabled } from "@/lib/shop-capabilities";

type ListProps = Omit<
  ComponentProps<typeof EstimateJobsList>,
  "variant" | "onJobOpenParts" | "addJobFooter" | "jobsLayout"
>;

/** Lab wrapper — parts menu wiring (add-job lives in the toolbar's + Job launcher). */
export function EstimateLabJobsList(
  props: ListProps & {
    jobsLayout?: EstimateJobsLayout;
  },
) {
  const { openPartsMenu } = useEstimateLabParts();
  const partsTechOk = usePartsTechUiEnabled();
  const cardVariant = estimateJobsLayoutToVariant(props.jobsLayout ?? "INLINE");
  const { jobsLayout: _jobsLayout, ...listProps } = props;

  return (
    <EstimateJobsList
      {...listProps}
      variant={cardVariant}
      jobsLayout={props.jobsLayout ?? "INLINE"}
      onJobOpenParts={
        cardVariant === "lab" && partsTechOk
          ? (jobId, mode) => openPartsMenu({ jobId, mode })
          : undefined
      }
    />
  );
}
