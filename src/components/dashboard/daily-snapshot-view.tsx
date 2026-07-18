"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Receipt,
  Settings2,
  UserPlus,
  Wrench,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Line, LineChart } from "recharts";

import { DashboardCustomizeDialog } from "@/components/dashboard/dashboard-customize-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoIntakeOptional } from "@/components/repair-order/ro-intake-context";
import {
  cloneDashboardCustomize,
  DEFAULT_DASHBOARD_CUSTOMIZE,
  loadDashboardCustomize,
  saveDashboardCustomize,
  type DashboardCustomizePrefs,
} from "@/lib/dashboard-customize";
import {
  SNAPSHOT_FILTER_HREFS,
  SNAPSHOT_FILTER_KINDS,
  SNAPSHOT_FILTER_LABELS,
  snapshotTimelineTitle,
  type DailySnapshotData,
  type SnapshotSummaryFilter,
} from "@/lib/daily-snapshot";
import type { DashboardHomeWidgets } from "@/lib/dashboard-home";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

const KPI_META: Record<
  SnapshotSummaryFilter,
  { icon: LucideIcon; tint: string; spark: string }
> = {
  collected: {
    icon: CircleDollarSign,
    tint: "bg-blue-50 text-blue-600",
    spark: "#3B82F6",
  },
  ros_opened: {
    icon: FileText,
    tint: "bg-emerald-50 text-emerald-600",
    spark: "#22C55E",
  },
  ros_completed: {
    icon: Wrench,
    tint: "bg-violet-50 text-violet-600",
    spark: "#8B5CF6",
  },
  appointments: {
    icon: Calendar,
    tint: "bg-orange-50 text-orange-600",
    spark: "#F4581C",
  },
  messages: {
    icon: MessageSquare,
    tint: "bg-sky-50 text-sky-500",
    spark: "#38BDF8",
  },
  activity: {
    icon: ClipboardList,
    tint: "bg-amber-50 text-amber-600",
    spark: "#EAB308",
  },
};

function sparkPoints(seed: number, value: number): { v: number }[] {
  const base = Math.max(value, 1);
  return Array.from({ length: 8 }, (_, i) => ({
    v: Math.max(0.2, base * (0.45 + ((seed + i * 17) % 7) / 12 + (i / 14))),
  }));
}

function KpiCard({
  label,
  value,
  hint,
  filter,
  active,
  onClick,
  moduleHref,
  numericValue,
}: {
  label: string;
  value: string;
  hint: string;
  filter: SnapshotSummaryFilter;
  active?: boolean;
  onClick: () => void;
  moduleHref?: string;
  numericValue: number;
}) {
  const meta = KPI_META[filter];
  const Icon = meta.icon;
  const spark = sparkPoints(filter.length, numericValue);

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md",
            meta.tint,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="mt-2 h-8 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={spark}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={meta.spark}
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );

  const className = cn(
    "rounded-lg border bg-card p-3 text-left shadow-none transition-all [--card-spacing:0]",
    "hover:border-brand-navy/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30",
    active ? "border-brand-light ring-2 ring-brand-light/30" : "border-border/80",
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

function TimelineEntry({ event }: { event: DailySnapshotData["events"][number] }) {
  const time = new Date(event.occurredAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <div className="flex flex-col items-center">
        <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[#00A9FF] ring-4 ring-[#00A9FF]/15" />
        <span className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="min-w-0 flex-1 pt-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{event.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {time}
              {event.detail ? ` · ${event.detail}` : ""}
            </p>
          </div>
          {event.repairOrderId && event.roNumber != null ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-7 shrink-0 gap-1 border-sky-200 bg-sky-50 px-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
            >
              <Link href={`/repair-orders/${event.repairOrderId}/estimate`}>
                RO #{event.roNumber}
                <ChevronRight className="size-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

const QUICK_ACTIONS: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tint: string;
  intake?: boolean;
}[] = [
  {
    title: "New Repair Order",
    description: "Start a quote for a customer",
    href: "/repair-orders/new",
    icon: FileText,
    tint: "bg-orange-50 text-orange-600",
    intake: true,
  },
  {
    title: "New Appointment",
    description: "Book a drop-off or visit",
    href: "/appointments",
    icon: CalendarPlus,
    tint: "bg-blue-50 text-blue-600",
  },
  {
    title: "New Customer",
    description: "Add a person or business",
    href: "/customers?add=1",
    icon: UserPlus,
    tint: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Credit Memo",
    description: "Issue store credit (coming soon)",
    href: "/payments",
    icon: Receipt,
    tint: "bg-violet-50 text-violet-600",
  },
];

export function DailySnapshotView({
  data,
  widgets,
  shopId,
}: {
  data: DailySnapshotData;
  widgets: DashboardHomeWidgets;
  shopId?: string;
}) {
  const { summary, events, dayLabel, view } = data;
  const timelineTitle = snapshotTimelineTitle(view);
  const dayWord = view === "tomorrow" ? "tomorrow" : "today";
  const timelineRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<SnapshotSummaryFilter | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [prefs, setPrefs] = useState<DashboardCustomizePrefs>(() =>
    cloneDashboardCustomize(DEFAULT_DASHBOARD_CUSTOMIZE),
  );
  const { openIntake, config } = useRoIntakeOptional();

  useEffect(() => {
    setPrefs(loadDashboardCustomize(shopId));
  }, [shopId]);

  const applyCustomize = useCallback(
    (next: DashboardCustomizePrefs) => {
      const normalized = cloneDashboardCustomize(next);
      setPrefs(normalized);
      saveDashboardCustomize(normalized, shopId);
    },
    [shopId],
  );

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

  const allTiles: {
    filter: SnapshotSummaryFilter;
    label: string;
    value: string;
    hint: string;
    numericValue: number;
  }[] = [
    {
      filter: "collected",
      label: "Collected",
      value: formatCents(summary.collectedCents),
      hint: `${summary.paymentCount} payment${summary.paymentCount === 1 ? "" : "s"}`,
      numericValue: summary.collectedCents,
    },
    {
      filter: "ros_opened",
      label: "ROs Opened",
      value: String(summary.rosOpened),
      hint: "New tickets today",
      numericValue: summary.rosOpened,
    },
    {
      filter: "ros_completed",
      label: "ROs Completed",
      value: String(summary.rosCompleted),
      hint: "Posted today",
      numericValue: summary.rosCompleted,
    },
    {
      filter: "appointments",
      label: "Appointments",
      value: String(summary.appointments),
      hint: "Scheduled today",
      numericValue: summary.appointments,
    },
    {
      filter: "messages",
      label: "Messages",
      value: String(summary.messages),
      hint: "SMS in + out",
      numericValue: summary.messages,
    },
    {
      filter: "activity",
      label: "Activity",
      value: String(summary.activityNotes),
      hint: "Notes & calls",
      numericValue: summary.activityNotes,
    },
  ];

  const tiles = allTiles.filter((tile) => prefs.kpis[tile.filter]);
  const showKpiRow = prefs.sections.kpiRow && tiles.length > 0;
  const showTimeline = prefs.sections.timeline;
  const showQuickActions = prefs.sections.quickActions;
  const showOverdue = prefs.sections.overdueFollowUps;
  const showEstimates = prefs.sections.estimateStatus;
  const showTopServices = prefs.sections.topServices;
  const bottomCount =
    Number(showOverdue) + Number(showEstimates) + Number(showTopServices);

  const estimateTotal = widgets.estimateStatus.reduce((s, x) => s + x.count, 0);
  const maxService = Math.max(...widgets.topServices.map((s) => s.amountCents), 1);

  const newRoButton = config ? (
    <Button
      type="button"
      size="sm"
      className="h-9 gap-1.5 rounded-sm bg-brand-navy text-white hover:bg-brand-navy/90"
      onClick={() => openIntake()}
    >
      <Plus className="size-3.5" />
      New Repair Order
    </Button>
  ) : (
    <Button
      asChild
      size="sm"
      className="h-9 gap-1.5 rounded-sm bg-brand-navy text-white hover:bg-brand-navy/90"
    >
      <Link href="/repair-orders/new">
        <Plus className="size-3.5" />
        New Repair Order
      </Link>
    </Button>
  );

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-auto pb-2">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{dayLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-sm border-[#DDE5EF]"
            onClick={() => setCustomizeOpen(true)}
          >
            <Settings2 className="size-3.5" />
            Customize
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-sm border-[#DDE5EF] bg-white text-brand-navy hover:bg-[#F8FAFC] hover:text-brand-navy"
          >
            <Link href="/appointments">
              <CalendarPlus className="size-3.5" />
              New Appointment
            </Link>
          </Button>
          {newRoButton}
        </div>
      </div>

      <DashboardCustomizeDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        value={prefs}
        onApply={applyCustomize}
      />

      {/* KPI row */}
      {showKpiRow ? (
        <div
          className={cn(
            "grid gap-3",
            tiles.length <= 2
              ? "grid-cols-2"
              : tiles.length <= 3
                ? "grid-cols-2 sm:grid-cols-3"
                : tiles.length <= 4
                  ? "grid-cols-2 sm:grid-cols-4"
                  : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
          )}
        >
          {tiles.map((tile) => (
            <KpiCard
              key={tile.filter}
              label={tile.label}
              value={tile.value}
              hint={tile.hint}
              filter={tile.filter}
              numericValue={tile.numericValue}
              active={activeFilter === tile.filter}
              onClick={() => toggleFilter(tile.filter)}
              moduleHref={SNAPSHOT_FILTER_HREFS[tile.filter]}
            />
          ))}
        </div>
      ) : null}

      {/* Timeline + Quick actions */}
      {showTimeline || showQuickActions ? (
        <div
          className={cn(
            "grid gap-3",
            showTimeline && showQuickActions ? "lg:grid-cols-3" : "grid-cols-1",
          )}
        >
          {showTimeline ? (
            <div
              ref={timelineRef}
              id="snapshot-timeline"
              className={cn(
                "scroll-mt-3",
                showQuickActions ? "lg:col-span-2" : "lg:col-span-1",
              )}
            >
              <Card className="rounded-lg border-border/80 shadow-none">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4 py-3">
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">
                      {timelineTitle}
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {activeFilter
                        ? `Showing ${SNAPSHOT_FILTER_LABELS[activeFilter].toLowerCase()} only`
                        : "Payments, RO movement, appointments, SMS, and logged activity."}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="h-8 shrink-0 text-xs">
                    <Link href="/dashboard/overview">View all activity</Link>
                  </Button>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  {filteredEvents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
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
                      ) : null}
                    </div>
                  ) : (
                    <ul className="mt-1">
                      {filteredEvents.slice(0, 12).map((event) => (
                        <TimelineEntry key={event.id} event={event} />
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {showQuickActions ? (
            <Card className="rounded-lg border-border/80 shadow-none">
              <CardHeader className="px-4 py-3 pb-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  Quick actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 px-2 pb-3">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const row = (
                    <>
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-md",
                          action.tint,
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">
                          {action.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {action.description}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </>
                  );

                  if (action.intake && config) {
                    return (
                      <button
                        key={action.title}
                        type="button"
                        onClick={() => openIntake()}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/60"
                      >
                        {row}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={action.title}
                      href={action.href}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      {row}
                    </Link>
                  );
                })}
                <Link
                  href="/repair-orders/new"
                  className="mt-1 inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700"
                >
                  View all actions
                  <ChevronRight className="size-3.5" />
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* Bottom row */}
      {bottomCount > 0 ? (
        <div
          className={cn(
            "grid gap-3",
            bottomCount === 1
              ? "grid-cols-1 md:max-w-md"
              : bottomCount === 2
                ? "md:grid-cols-2"
                : "md:grid-cols-3",
          )}
        >
          {showOverdue ? (
            <Card className="rounded-lg border-border/80 shadow-none">
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">
                    <Clock className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-3xl font-bold tabular-nums text-foreground">
                      {widgets.overdueFollowUps}
                    </p>
                    <p className="text-sm text-muted-foreground">customers need a follow up</p>
                  </div>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600/90">
                  Overdue follow ups
                </p>
                <Button asChild size="sm" variant="outline" className="mt-auto h-8 w-fit text-xs">
                  <Link href="/customers">View list</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {showEstimates ? (
            <Card className="rounded-lg border-border/80 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 pb-1">
                <CardTitle className="text-sm font-semibold">Open estimates by status</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="relative size-28 shrink-0">
                    {estimateTotal > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={widgets.estimateStatus.filter((s) => s.count > 0)}
                            dataKey="count"
                            nameKey="label"
                            innerRadius="58%"
                            outerRadius="88%"
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {widgets.estimateStatus
                              .filter((s) => s.count > 0)
                              .map((entry) => (
                                <Cell key={entry.key} fill={entry.color} />
                              ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex size-full items-center justify-center rounded-full border-8 border-muted" />
                    )}
                  </div>
                  <ul className="min-w-0 flex-1 space-y-2 text-sm">
                    {widgets.estimateStatus.map((s) => (
                      <li key={s.key} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-muted-foreground">{s.label}</span>
                        </span>
                        <span className="font-semibold tabular-nums">{s.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button asChild size="sm" variant="outline" className="mt-3 h-8 text-xs">
                  <Link href="/job-board">View estimates</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {showTopServices ? (
            <Card className="rounded-lg border-border/80 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 pb-1">
                <CardTitle className="text-sm font-semibold">Top performing services</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-[11px]"
                  disabled
                >
                  This month
                  <ChevronDown className="size-3" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                {widgets.topServices.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No completed service revenue this month yet.
                  </p>
                ) : (
                  widgets.topServices.map((svc) => (
                    <div key={svc.name} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">
                          <span className="mr-1.5 text-muted-foreground">{svc.rank}.</span>
                          {svc.name}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {formatCents(svc.amountCents)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[#3B82F6]"
                          style={{
                            width: `${Math.max(8, (svc.amountCents / maxService) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <Link href="/reports">View report</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
