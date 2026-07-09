"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  parseSnapshotDay,
  SNAPSHOT_DAY_LABELS,
  type SnapshotDayView,
} from "@/lib/daily-snapshot";
import { cn } from "@/lib/utils";

const SNAPSHOT_DAYS: SnapshotDayView[] = ["today", "tomorrow"];

export function SnapshotDayToggle({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = parseSnapshotDay(searchParams.get("day"));

  function setDay(day: SnapshotDayView) {
    const params = new URLSearchParams(searchParams.toString());
    if (day === "today") {
      params.delete("day");
    } else {
      params.set("day", day);
    }
    const q = params.toString();
    router.push(q ? `/dashboard/snapshot?${q}` : "/dashboard/snapshot");
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-lg border border-border/70 bg-card p-0.5 shadow-sm",
        className,
      )}
      role="group"
      aria-label="Snapshot day"
    >
      {SNAPSHOT_DAYS.map((day) => (
        <Button
          key={day}
          type="button"
          size="sm"
          variant={active === day ? "default" : "ghost"}
          className={cn(
            "h-7 px-2.5 text-xs",
            active === day && "bg-brand-navy hover:bg-brand-navy/90",
          )}
          onClick={() => setDay(day)}
          aria-pressed={active === day}
        >
          {SNAPSHOT_DAY_LABELS[day]}
        </Button>
      ))}
    </div>
  );
}
