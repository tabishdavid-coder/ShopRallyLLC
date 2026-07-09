import { cn } from "@/lib/utils";
import {
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_PILL,
} from "@/lib/inspection";
import type { InspectionStatus } from "@/generated/prisma";

export function InspectionWorkflowBadge({
  status,
  className,
}: {
  status: InspectionStatus;
  className?: string;
}) {
  const styles: Record<InspectionStatus, string> = {
    NOT_STARTED: "bg-slate-100 text-slate-700 border-slate-200",
    IN_PROGRESS: "border-brand-light/35 bg-brand-light/15 text-brand-navy",
    COMPLETED: "bg-emerald-500/15 text-emerald-800 border-emerald-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      {INSPECTION_STATUS_LABELS[status]}
    </span>
  );
}

export function InspectionItemStatusBadge({
  status,
  className,
}: {
  status: import("@/generated/prisma").InspectionItemStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        INSPECTION_STATUS_PILL[status],
        className,
      )}
    >
      {status === "GREEN" ? "Pass" : status === "YELLOW" ? "Monitor" : status === "RED" ? "Fail" : "—"}
    </span>
  );
}
