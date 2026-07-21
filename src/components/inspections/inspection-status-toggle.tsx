"use client";

import { cn } from "@/lib/utils";
import { INSPECTION_ITEM_STATUS, INSPECTION_STATUS_TOGGLE } from "@/lib/inspection";
import type { InspectionItemStatus } from "@/generated/prisma";

const RATINGS: InspectionItemStatus[] = [
  INSPECTION_ITEM_STATUS.GREEN,
  INSPECTION_ITEM_STATUS.YELLOW,
  INSPECTION_ITEM_STATUS.RED,
];

const SHORT: Record<InspectionItemStatus, string> = {
  GREEN: "G",
  YELLOW: "Y",
  RED: "R",
  NA: "—",
};

const FULL: Record<InspectionItemStatus, string> = {
  GREEN: "Pass",
  YELLOW: "Monitor",
  RED: "Fail",
  NA: "—",
};

export function InspectionStatusToggle({
  value,
  onChange,
  disabled,
  size = "touch",
}: {
  value: InspectionItemStatus;
  onChange: (status: InspectionItemStatus) => void;
  disabled?: boolean;
  /** `touch` = bay-floor DVI targets; `compact` for dense lists */
  size?: "touch" | "compact";
}) {
  const touch = size === "touch";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-stretch rounded-lg bg-slate-100/80 p-0.5 ring-1 ring-slate-200/80",
        touch ? "gap-0.5" : "gap-0.5",
      )}
      role="group"
      aria-label="Item rating"
    >
      {RATINGS.map((status) => {
        const active = value === status;
        const styles = INSPECTION_STATUS_TOGGLE[status];
        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={FULL[status]}
            onClick={() => onChange(status)}
            className={cn(
              "font-bold tracking-wide transition-[background-color,color,box-shadow,transform] duration-150",
              "disabled:pointer-events-none disabled:opacity-45",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40 focus-visible:ring-offset-1",
              touch
                ? "min-h-11 min-w-[3.25rem] rounded-md px-3 text-sm sm:min-w-[4.25rem] sm:px-3.5"
                : "size-8 rounded text-xs",
              active
                ? cn(styles.active, touch && "scale-[1.02]")
                : cn(
                    "border border-transparent bg-transparent",
                    styles.idle,
                    "hover:border-current/20",
                  ),
            )}
          >
            <span className="flex flex-col items-center leading-none">
              <span>{SHORT[status]}</span>
              {touch ? (
                <span
                  className={cn(
                    "mt-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    active ? "text-white/90" : "opacity-70",
                  )}
                >
                  {FULL[status]}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
