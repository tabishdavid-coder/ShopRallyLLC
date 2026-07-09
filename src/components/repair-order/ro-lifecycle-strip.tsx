import type { ROStatus } from "@/generated/prisma";
import { cn } from "@/lib/utils";

const STEPS: { label: string; match: ROStatus[] }[] = [
  { label: "Intake", match: ["ESTIMATE"] },
  { label: "Quoted", match: ["ESTIMATE"] },
  { label: "In bay", match: ["APPROVED", "IN_PROGRESS"] },
  { label: "Complete", match: ["COMPLETED"] },
  { label: "Invoiced", match: ["INVOICED"] },
];

function stepIndex(status: ROStatus): number {
  if (status === "INVOICED") return 4;
  if (status === "COMPLETED") return 3;
  if (status === "APPROVED" || status === "IN_PROGRESS") return 2;
  return 1;
}

/** ShopRally RO lifecycle — distinct from competitor tab-only navigation. */
export function RoLifecycleStrip({
  status,
  compact = false,
  inline = false,
}: {
  status: ROStatus;
  compact?: boolean;
  /** Extra-small strip for the hero toolbar row beside odometer. */
  inline?: boolean;
}) {
  const active = stepIndex(status);

  return (
    <ol
      className={cn(
        "ro-lifecycle-strip flex min-w-0 flex-1 flex-wrap items-center gap-0.5 sm:flex-nowrap sm:gap-0",
        compact && "ro-lifecycle-strip--compact",
        inline && "ro-lifecycle-strip--inline",
      )}
      aria-label="Repair order lifecycle"
    >
      {STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={step.label} className="flex min-w-0 items-center">
            {i > 0 ? (
              <span
                className={cn(
                  "ro-lifecycle-connector mx-0.5 hidden h-px sm:inline-block",
                  inline ? "w-2 sm:w-3" : "mx-1 w-4 sm:mx-2 sm:w-8",
                  done && "ro-lifecycle-connector--done",
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "ro-lifecycle-step inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-[0.06em]",
                inline
                  ? "px-1.5 py-px text-[9px] sm:px-2 sm:py-0.5 sm:text-[10px]"
                  : "gap-1.5 px-2 py-0.5 text-[11px] sm:px-2.5 sm:py-1",
                current && "ro-lifecycle-step--current",
                done && !current && "ro-lifecycle-step--done",
                !done && !current && "ro-lifecycle-step--upcoming",
              )}
            >
              <span
                className={cn("ro-lifecycle-dot shrink-0 rounded-full", inline ? "size-1" : "size-1.5")}
                aria-hidden
              />
              <span className="truncate">{step.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
