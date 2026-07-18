"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { updateRepairOrderSidebar } from "@/server/actions/repair-orders";
import { cn } from "@/lib/utils";

type StaffPick = { id: string; name: string };

/** Service advisor picker — lives in the lab context header (not the right rail). */
export function EstimateLabServiceAdvisorSelect({
  roId,
  serviceWriterId,
  serviceWriters,
  canEdit,
  className,
  compact,
}: {
  roId: string;
  serviceWriterId: string | null;
  serviceWriters: StaffPick[];
  canEdit: boolean;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onChange(nextId: string) {
    start(async () => {
      const res = await updateRepairOrderSidebar({
        roId,
        serviceWriterId: nextId || null,
      });
      if (res.ok) router.refresh();
    });
  }

  return (
    <label className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <span
        className={cn(
          "shrink-0 font-semibold uppercase tracking-wide text-crm-label",
          compact
            ? "text-[10px] text-brand-navy/75"
            : "text-[10px]",
        )}
      >
        {compact ? "Advisor" : "Service advisor"}
      </span>
      <div className="relative min-w-[7.5rem]">
        <select
          className="h-7 w-full min-w-[7.5rem] rounded-md border border-input bg-background pl-2 pr-6 text-xs font-medium text-foreground disabled:opacity-60"
          value={serviceWriterId ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={!canEdit || pending || serviceWriters.length === 0}
          aria-label="Service advisor"
        >
          <option value="">Unassigned</option>
          {serviceWriters.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        {pending ? (
          <Loader2
            className="pointer-events-none absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
      </div>
    </label>
  );
}
