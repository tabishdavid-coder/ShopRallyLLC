"use client";

import type { JobBoard, JobCard } from "@/lib/job-board";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

function columnTotal(cards: JobCard[]) {
  return cards.reduce((sum, c) => sum + c.totalCents, 0);
}

export function StageProgress({ board }: { board: JobBoard }) {
  const estimatesCol = board.columns.find((c) => c.kind === "estimates");
  const wipCol = board.columns.find((c) => c.kind === "workInProgress");
  const completedCol = board.columns.find((c) => c.kind === "completed");

  const segments = [
    {
      key: "estimates",
      label: estimatesCol?.title ?? "Estimates",
      count: board.estimates.length,
      cents: columnTotal(board.estimates),
      color: "bg-brand-light",
      text: "text-brand-navy",
    },
    {
      key: "wip",
      label: wipCol?.title ?? "Work in Progress",
      count: board.workInProgress.length,
      cents: columnTotal(board.workInProgress),
      color: "bg-brand-navy",
      text: "text-brand-navy",
    },
    {
      key: "completed",
      label: completedCol?.title ?? "Completed",
      count: board.completed.length,
      cents: columnTotal(board.completed),
      color: "bg-brand-red",
      text: "text-brand-red",
    },
  ] as const;

  const total = segments.reduce((n, s) => n + s.count, 0) || 1;

  return (
    <div className="rounded-xl border border-border/80 bg-card px-4 py-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pipeline
        </p>
        <p className="text-xs text-muted-foreground">{total} repair orders on board</p>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {segments.map((s) =>
          s.count > 0 ? (
            <div
              key={s.key}
              className={cn("h-full transition-all", s.color)}
              style={{ width: `${(s.count / total) * 100}%` }}
              title={`${s.label}: ${s.count}`}
            />
          ) : null,
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {segments.map((s) => (
          <div key={s.key} className="flex items-baseline justify-between gap-2 text-sm">
            <span className={cn("font-medium", s.text)}>
              {s.label}{" "}
              <span className="font-normal text-muted-foreground">({s.count})</span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {formatCents(s.cents)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
