import { ROStatus } from "@/generated/prisma";

/** RO statuses where estimate jobs/lines can be edited. COMPLETED/INVOICED are read-only. */
export function isEstimateEditable(status: ROStatus): boolean {
  return (
    status === ROStatus.ESTIMATE ||
    status === ROStatus.APPROVED ||
    status === ROStatus.IN_PROGRESS
  );
}

export { DEFAULT_PART_MULTIPLIER } from "@/lib/matrix";
