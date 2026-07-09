"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { JobBoard, JobCard } from "@/lib/job-board";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

function columnTotal(cards: JobCard[]) {
  return cards.reduce((sum, c) => sum + c.totalCents, 0);
}

export function StageProgress({ board, compact = false }: { board: JobBoard; compact?: boolean }) {
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
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-card shadow-sm",
        compact ? "flex flex-col justify-center px-3 py-2.5" : "px-4 py-3.5",
      )}
    >
      <div className={cn("flex flex-wrap items-center justify-between gap-2", compact ? "mb-1" : "mb-2")}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pipeline
        </p>
        <Link
          href="/job-board"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-navy hover:underline"
        >
          {total} ROs
          <ArrowUpRight className="size-2.5" />
        </Link>
      </div>
      <div className={cn("flex overflow-hidden rounded-full bg-muted", compact ? "h-2" : "h-2.5")}>
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
      <div
        className={cn(
          "grid gap-1",
          compact ? "mt-2 grid-cols-3 text-xs" : "mt-3 gap-2 sm:grid-cols-3 text-sm",
        )}
      >
        {segments.map((s) => (
          <div key={s.key} className="flex items-baseline justify-between gap-1">
            <span className={cn("font-medium", s.text)}>
              {s.label}{" "}
              <span className="font-normal text-muted-foreground">({s.count})</span>
            </span>
            <span className="font-mono text-muted-foreground">{formatCents(s.cents)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
