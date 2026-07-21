"use client";

import { Ban } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CalendarBlockRow } from "@/server/appointments";

export function CalendarBlockChip({
  block,
  selected,
  onClick,
  style,
  compact = false,
}: {
  block: CalendarBlockRow;
  selected?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  compact?: boolean;
}) {
  const start = new Date(block.startAt);
  const time = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute z-[5] flex overflow-hidden rounded-md border border-dashed border-slate-400/80 text-left shadow-sm transition",
        "bg-[repeating-linear-gradient(-45deg,#e2e8f0,#e2e8f0_4px,#f1f5f9_4px,#f1f5f9_8px)]",
        "hover:border-slate-500",
        selected && "ring-2 ring-slate-500 ring-offset-1",
        !style?.left && !style?.right && "inset-x-1",
      )}
      style={style}
      title={block.notes ? `${block.title} — ${block.notes}` : block.title}
    >
      <span className="w-1 shrink-0 bg-slate-500" aria-hidden />
      <span className="min-w-0 flex-1 px-1.5 py-1 sm:px-2 text-slate-700">
        <div className="flex items-center gap-1">
          {!compact ? <Ban className="size-3 shrink-0 opacity-70" aria-hidden /> : null}
          <span className="shrink-0 text-[10px] font-semibold tabular-nums">{time}</span>
          <span className="min-w-0 truncate text-[11px] font-semibold">{block.title}</span>
        </div>
        {!compact ? (
          <div className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500">
            Blocked
          </div>
        ) : null}
      </span>
    </button>
  );
}
