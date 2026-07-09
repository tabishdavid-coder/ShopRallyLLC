"use client";

import { cn } from "@/lib/utils";
import { INSPECTION_ITEM_STATUS, INSPECTION_STATUS_TOGGLE } from "@/lib/inspection";
import type { InspectionItemStatus } from "@/generated/prisma";

const RATINGS: InspectionItemStatus[] = [
  INSPECTION_ITEM_STATUS.GREEN,
  INSPECTION_ITEM_STATUS.YELLOW,
  INSPECTION_ITEM_STATUS.RED,
];

const LABELS: Record<InspectionItemStatus, string> = {
  GREEN: "G",
  YELLOW: "Y",
  RED: "R",
  NA: "—",
};

export function InspectionStatusToggle({
  value,
  onChange,
  disabled,
  compact,
}: {
  value: InspectionItemStatus;
  onChange: (status: InspectionItemStatus) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {RATINGS.map((status) => {
        const active = value === status;
        const styles = INSPECTION_STATUS_TOGGLE[status];
        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            title={
              status === INSPECTION_ITEM_STATUS.GREEN
                ? "Pass"
                : status === INSPECTION_ITEM_STATUS.YELLOW
                  ? "Monitor"
                  : "Fail"
            }
            onClick={() => onChange(status)}
            className={cn(
              "rounded border font-semibold transition-colors disabled:opacity-50",
              compact ? "size-7 text-xs" : "min-w-8 px-2 py-1 text-sm",
              active ? styles.active : styles.idle,
            )}
          >
            {LABELS[status]}
          </button>
        );
      })}
    </div>
  );
}
