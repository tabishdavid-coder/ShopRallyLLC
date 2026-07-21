"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  CalendarDays,
  Clock,
  ExternalLink,
  UserCheck,
  XCircle,
  Ban,
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppointmentStatus } from "@/generated/prisma";
import {
  APPOINTMENT_STATUS_META,
  addDays,
  addMonths,
  getWeekStart,
  parseDateInput,
  toDateInputValue,
  type CalendarView,
} from "@/lib/appointments";
import { defaultRoOpenHref } from "@/lib/ro-workspace";
import { cn } from "@/lib/utils";

export function AppointmentsToolbar({
  view,
  focusDateIso,
  rangeLabel,
  query,
  shopHours,
  onNewAppointment,
  onBlockTime,
  printDateIso,
}: {
  view: CalendarView;
  focusDateIso: string;
  rangeLabel: string;
  query: string;
  shopHours: string;
  onNewAppointment: () => void;
  onBlockTime?: () => void;
  /** Focused calendar date for “Print day” sheet (YYYY-MM-DD). Defaults to today. */
  printDateIso?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);

  const focus = parseDateInput(focusDateIso);

  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (search) sp.set("q", search);
      else sp.delete("q");
      startTransition(() => router.push(`${pathname}?${sp.toString()}`));
    }, 350);
    return () => clearTimeout(t);
  }, [search, query, params, pathname, router]);

  function pushCalendar(nextView: CalendarView, nextFocus: Date) {
    const sp = new URLSearchParams(params.toString());
    sp.set("view", nextView);
    const dateIso = toDateInputValue(nextFocus);
    sp.set("date", dateIso);
    if (nextView === "week") sp.set("week", toDateInputValue(getWeekStart(nextFocus)));
    else sp.delete("week");
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  function shiftFocus(delta: number) {
    if (view === "day") pushCalendar(view, addDays(focus, delta));
    else if (view === "month") pushCalendar(view, addMonths(focus, delta));
    else pushCalendar(view, addDays(getWeekStart(focus), delta * 7));
  }

  function goToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Zoom into today's single-day time grid (not just jump within week/month).
    pushCalendar("day", today);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={view}
          onValueChange={(v) => {
            if (v === "day" || v === "week" || v === "month") {
              pushCalendar(v, focus);
            }
          }}
        >
          <SelectTrigger className="w-[120px]" size="sm">
            <SelectValue placeholder="Week" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shiftFocus(-1)}
            aria-label={`Previous ${view}`}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shiftFocus(1)}
            aria-label={`Next ${view}`}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="min-w-[140px] text-sm font-medium text-foreground">{rangeLabel}</div>

        <Button variant="outline" size="sm" onClick={goToday}>
          Today
        </Button>

        <div className="hidden items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground sm:flex">
          <Clock className="size-3.5 text-brand-navy" />
          <span>Shop hours {shopHours}</span>
        </div>

        <div className="relative min-w-56 flex-1 sm:max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          {isPending ? (
            <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
          ) : null}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search upcoming appointments"
            className="pl-8"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 border-border text-brand-navy"
          >
            <Link
              href={`/appointments/print?date=${printDateIso ?? toDateInputValue(new Date())}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Printer className="size-4" /> Print day
            </Link>
          </Button>
          {onBlockTime ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-slate-300 text-slate-700"
              onClick={onBlockTime}
            >
              <Ban className="size-4" /> Block time
            </Button>
          ) : null}
          <Button
            size="sm"
            className="gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90"
            onClick={onNewAppointment}
          >
            <Plus className="size-4" /> New Appointment
          </Button>
        </div>
      </div>
    </div>
  );
}

export type TodayAppointmentItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  customerName: string;
  vehicleLabel: string | null;
  serviceName: string | null;
  repairOrderId: string | null;
  repairOrderNumber: number | null;
};

export function TodayAppointmentsSidebar({
  appointments,
  onSelect,
  onBookToday,
  onStatusChange,
}: {
  appointments: TodayAppointmentItem[];
  onSelect: (id: string) => void;
  onBookToday?: () => void;
  onStatusChange?: (id: string, status: AppointmentStatus) => void;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const now = new Date();

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const upcoming = sorted.filter((a) => new Date(a.endAt) >= now);
  const earlier = sorted.filter((a) => new Date(a.endAt) < now);

  async function quickStatus(id: string, status: AppointmentStatus) {
    if (!onStatusChange) return;
    setPendingId(id);
    try {
      await onStatusChange(id, status);
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <aside className="hidden w-80 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm lg:flex">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <CalendarDays className="size-4 text-brand-navy" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-brand-navy">Today</h2>
          <p className="text-[11px] text-muted-foreground">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
        <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-xs font-semibold text-brand-navy">
          {appointments.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {appointments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <CalendarDays className="mx-auto mb-2 size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No appointments today</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click the calendar or book a walk-in.
            </p>
            {onBookToday ? (
              <Button
                type="button"
                size="sm"
                className="mt-4 gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
                onClick={onBookToday}
              >
                <Plus className="size-3.5" /> Book today
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.length > 0 ? (
              <TodaySection title="Up next" count={upcoming.length}>
                {upcoming.map((a) => (
                  <TodayAppointmentCard
                    key={a.id}
                    appointment={a}
                    pending={pendingId === a.id}
                    onSelect={onSelect}
                    onStatusChange={onStatusChange ? quickStatus : undefined}
                  />
                ))}
              </TodaySection>
            ) : null}

            {earlier.length > 0 ? (
              <TodaySection title="Earlier today" count={earlier.length} muted>
                {earlier.map((a) => (
                  <TodayAppointmentCard
                    key={a.id}
                    appointment={a}
                    pending={pendingId === a.id}
                    onSelect={onSelect}
                    onStatusChange={onStatusChange ? quickStatus : undefined}
                    muted
                  />
                ))}
              </TodaySection>
            ) : null}

            {onBookToday ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full gap-1.5 border-border text-brand-navy"
                onClick={onBookToday}
              >
                <Plus className="size-3.5" /> Book another today
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

function TodaySection({
  title,
  count,
  muted,
  children,
}: {
  title: string;
  count: number;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <h3
          className={cn(
            "text-[11px] font-bold uppercase tracking-wide",
            muted ? "text-muted-foreground" : "text-brand-navy",
          )}
        >
          {title}
        </h3>
        <span className="text-[10px] text-muted-foreground">{count}</span>
      </div>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function TodayAppointmentCard({
  appointment: a,
  pending,
  muted,
  onSelect,
  onStatusChange,
}: {
  appointment: TodayAppointmentItem;
  pending?: boolean;
  muted?: boolean;
  onSelect: (id: string) => void;
  onStatusChange?: (id: string, status: AppointmentStatus) => void;
}) {
  const start = new Date(a.startAt);
  const time = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const statusMeta = APPOINTMENT_STATUS_META[a.status];
  const canConfirm = a.status === "SCHEDULED";
  const canArrive = a.status === "SCHEDULED" || a.status === "CONFIRMED";
  const canNoShow =
    a.status === "SCHEDULED" || a.status === "CONFIRMED" || a.status === "IN_PROGRESS";

  return (
    <li
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-white transition-shadow hover:shadow-sm",
        muted && "opacity-80",
      )}
    >
      <button type="button" onClick={() => onSelect(a.id)} className="w-full px-3 py-2.5 text-left">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tabular-nums text-brand-navy">{time}</span>
          <span className={cn("rounded-full px-1.5 py-px text-[10px] font-semibold", statusMeta.className)}>
            {statusMeta.label}
          </span>
        </div>
        <div className="mt-1 truncate text-sm font-semibold text-foreground">{a.customerName}</div>
        {a.vehicleLabel ? (
          <div className="truncate text-xs text-muted-foreground">{a.vehicleLabel}</div>
        ) : null}
        {a.serviceName ? (
          <div className="truncate text-xs text-muted-foreground">{a.serviceName}</div>
        ) : null}
      </button>

      <div className="flex flex-wrap items-center gap-1 border-t border-border/80 bg-muted/20 px-2 py-1.5">
        {a.repairOrderId && a.repairOrderNumber ? (
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-brand-navy">
            <Link href={defaultRoOpenHref(a.repairOrderId)}>
              RO #{a.repairOrderNumber}
              <ExternalLink className="ml-1 size-3" />
            </Link>
          </Button>
        ) : null}

        {onStatusChange && canConfirm ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={pending}
            onClick={() => onStatusChange(a.id, "CONFIRMED")}
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : "Confirm"}
          </Button>
        ) : null}

        {onStatusChange && canArrive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-emerald-700 hover:text-emerald-800"
            disabled={pending}
            onClick={() => onStatusChange(a.id, "IN_PROGRESS")}
          >
            <UserCheck className="size-3" /> Arrived
          </Button>
        ) : null}

        {onStatusChange && canNoShow ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-brand-red hover:text-brand-red"
            disabled={pending}
            onClick={() => onStatusChange(a.id, "NO_SHOW")}
          >
            <XCircle className="size-3" /> No-show
          </Button>
        ) : null}
      </div>
    </li>
  );
}
