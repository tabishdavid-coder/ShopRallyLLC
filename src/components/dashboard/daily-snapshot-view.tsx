"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  DollarSign,
  MessageSquare,
  Receipt,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SnapshotDayToggle } from "@/components/dashboard/snapshot-day-toggle";
import {
  SNAPSHOT_EVENT_LABELS,
  SNAPSHOT_FILTER_HREFS,
  SNAPSHOT_FILTER_KINDS,
  SNAPSHOT_FILTER_LABELS,
  snapshotTimelineTitle,
  type DailySnapshotData,
  type DailySnapshotEventKind,
  type SnapshotSummaryFilter,
} from "@/lib/daily-snapshot";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<
  DailySnapshotEventKind,
  { badge: string; icon: LucideIcon }
> = {
  ro_opened: { badge: "bg-brand-light/40 text-brand-navy", icon: Receipt },
  ro_completed: { badge: "bg-emerald-100 text-emerald-700", icon: Wrench },
  activity: { badge: "bg-brand-navy/10 text-brand-navy", icon: ClipboardList },
  payment: { badge: "bg-emerald-100 text-emerald-700", icon: DollarSign },
  appointment: { badge: "bg-amber-100 text-amber-700", icon: Calendar },
  message_in: { badge: "bg-sky-100 text-sky-700", icon: MessageSquare },
  message_out: { badge: "bg-violet-100 text-violet-700", icon: MessageSquare },
};

function SummaryTile({
  label,
  value,
  hint,
  icon: Icon,
  active,
  onClick,
  moduleHref,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
  moduleHref?: string;
}) {
  const inner = (
    <>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          active ? "bg-brand-navy text-white" : "bg-brand-light/35 text-brand-navy",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-lg font-bold leading-tight text-brand-navy">{value}</p>
        {hint ? (
          <p className="truncate text-xs leading-snug text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </>
  );

  const className = cn(
    "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 shadow-sm transition-all",
    "hover:border-brand-navy/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40",
    active
      ? "border-brand-navy/50 bg-brand-navy/5 ring-2 ring-brand-navy/20"
      : "border-border/70 bg-card",
  );

  if (moduleHref) {
    return (
      <Link
        href={moduleHref}
        className={className}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          onClick();
        }}
        aria-pressed={active}
        title={`Filter timeline by ${label.toLowerCase()}. Ctrl+click to open ${label} module.`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick} aria-pressed={active}>
      {inner}
    </button>
  );
}

function SnapshotEventRow({ event }: { event: DailySnapshotData["events"][number] }) {
  const { badge, icon: Icon } = KIND_STYLE[event.kind];
  const time = new Date(event.occurredAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const body = (
    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className={cn("h-5 border-0 px-1.5 text-[10px] font-semibold uppercase", badge)}
          >
            {SNAPSHOT_EVENT_LABELS[event.kind]}
          </Badge>
          <time className="text-[11px] text-muted-foreground">{time}</time>
        </div>
        <p className="mt-1 text-sm font-semibold text-brand-navy">{event.title}</p>
        {event.detail ? (
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{event.detail}</p>
        ) : null}
      </div>
      {event.amountCents != null ? (
        <p className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700">
          {formatCents(event.amountCents)}
        </p>
      ) : null}
    </div>
  );

  if (event.repairOrderId) {
    return (
      <li className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm transition-colors hover:border-brand-navy/30">
        <Link
          href={`/repair-orders/${event.repairOrderId}/estimate`}
          className="flex gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40"
        >
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-brand-navy">
            <Icon className="size-4" aria-hidden />
          </span>
          {body}
        </Link>
      </li>
    );
  }

  return (
    <li className="flex gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-brand-navy">
        <Icon className="size-4" aria-hidden />
      </span>
      {body}
    </li>
  );
}

export function DailySnapshotView({ data }: { data: DailySnapshotData }) {
  const { summary, events, dayLabel, view } = data;
  const timelineTitle = snapshotTimelineTitle(view);
  const dayWord = view === "tomorrow" ? "tomorrow" : "today";
  const timelineRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<SnapshotSummaryFilter | null>(null);

  const toggleFilter = useCallback((filter: SnapshotSummaryFilter) => {
    setActiveFilter((prev) => (prev === filter ? null : filter));
    requestAnimationFrame(() => {
      timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const filteredEvents = useMemo(() => {
    if (!activeFilter) return events;
    const kinds = new Set(SNAPSHOT_FILTER_KINDS[activeFilter]);
    return events.filter((e) => kinds.has(e.kind));
  }, [activeFilter, events]);

  const tiles: {
    filter: SnapshotSummaryFilter;
    label: string;
    value: string;
    hint: string;
    icon: LucideIcon;
  }[] = [
    {
      filter: "collected",
      label: "Collected",
      value: formatCents(summary.collectedCents),
      hint: `${summary.paymentCount} payment${summary.paymentCount === 1 ? "" : "s"}`,
      icon: DollarSign,
    },
    {
      filter: "ros_opened",
      label: "ROs opened",
      value: String(summary.rosOpened),
      hint: "New tickets today",
      icon: Receipt,
    },
    {
      filter: "ros_completed",
      label: "ROs completed",
      value: String(summary.rosCompleted),
      hint: "Posted today",
      icon: Wrench,
    },
    {
      filter: "appointments",
      label: "Appointments",
      value: String(summary.appointments),
      hint: "Scheduled today",
      icon: Calendar,
    },
    {
      filter: "messages",
      label: "Messages",
      value: String(summary.messages),
      hint: "SMS in + out",
      icon: MessageSquare,
    },
    {
      filter: "activity",
      label: "Activity",
      value: String(summary.activityNotes),
      hint: "Notes & calls",
      icon: ClipboardList,
    },
  ];

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-auto pb-1">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold tracking-tight text-brand-navy">Daily snapshot</h2>
          <p className="text-xs text-muted-foreground">
            {dayLabel} · live shop activity · click a metric to filter the timeline
          </p>
        </div>
        <Suspense fallback={<div className="h-8 w-[140px] animate-pulse rounded-lg bg-muted" />}>
          <SnapshotDayToggle />
        </Suspense>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map((tile) => (
          <SummaryTile
            key={tile.filter}
            label={tile.label}
            value={tile.value}
            hint={tile.hint}
            icon={tile.icon}
            active={activeFilter === tile.filter}
            onClick={() => toggleFilter(tile.filter)}
            moduleHref={SNAPSHOT_FILTER_HREFS[tile.filter]}
          />
        ))}
      </div>

      <Card
        ref={timelineRef}
        id="snapshot-timeline"
        className="min-h-0 flex-1 scroll-mt-3 border-border/80 shadow-sm"
      >
        <CardHeader className="px-4 py-3 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold text-brand-navy">
                {timelineTitle}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {activeFilter
                  ? `Showing ${SNAPSHOT_FILTER_LABELS[activeFilter].toLowerCase()} only`
                  : "Payments, RO movement, appointments, SMS, and logged activity — newest first."}
              </p>
            </div>
            {activeFilter ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => setActiveFilter(null)}
              >
                Show all
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {filteredEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {activeFilter
                  ? `No ${SNAPSHOT_FILTER_LABELS[activeFilter].toLowerCase()} recorded ${dayWord}.`
                  : `No activity recorded yet ${dayWord}.`}
              </p>
              {activeFilter ? (
                <Button
                  type="button"
                  variant="link"
                  className="mt-2 h-auto p-0 text-xs"
                  onClick={() => setActiveFilter(null)}
                >
                  Show all activity
                </Button>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Open ROs, take payments, or log calls — they&apos;ll show up here as the day goes on.
                </p>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredEvents.map((event) => (
                <SnapshotEventRow key={event.id} event={event} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
