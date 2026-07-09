"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  CalendarDays,
  Clock,
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
import { addDays, formatWeekRange, getWeekStart, toDateInputValue } from "@/lib/appointments";

export function AppointmentsToolbar({
  weekStartIso,
  query,
  shopHours,
  onNewAppointment,
}: {
  weekStartIso: string;
  query: string;
  shopHours: string;
  onNewAppointment: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);

  const weekStart = new Date(weekStartIso);

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

  function pushWeek(next: Date) {
    const sp = new URLSearchParams(params.toString());
    sp.set("week", toDateInputValue(next));
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  function goToday() {
    pushWeek(getWeekStart(new Date()));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value="week" disabled>
          <SelectTrigger className="w-[120px]" size="sm">
            <SelectValue placeholder="Week" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Week</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => pushWeek(addDays(weekStart, -7))}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => pushWeek(addDays(weekStart, 7))}
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="min-w-[140px] text-sm font-medium text-foreground">
          {formatWeekRange(weekStart)}
        </div>

        <Button variant="outline" size="sm" onClick={goToday}>
          Today
        </Button>

        <div className="hidden items-center gap-1.5 rounded-md border border-brand-light/40 bg-brand-light/10 px-2.5 py-1 text-xs text-muted-foreground sm:flex">
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

        <div className="ml-auto flex items-center gap-2">
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

export function TodayAppointmentsSidebar({
  appointments,
  onSelect,
  onBookToday,
}: {
  appointments: {
    id: string;
    title: string;
    startAt: string;
    customerName: string;
    vehicleLabel: string | null;
  }[];
  onSelect: (id: string) => void;
  onBookToday?: () => void;
}) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col rounded-lg border border-brand-light/30 bg-card lg:flex">
      <div className="flex items-center gap-2 border-b border-brand-light/30 px-4 py-3">
        <CalendarDays className="size-4 text-brand-navy" />
        <h2 className="text-sm font-semibold text-brand-navy">Today</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {appointments.length}
        </span>
      </div>
      <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-2">
        {appointments.length === 0 ? (
          <div className="px-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">No appointments today</p>
            {onBookToday ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 border-brand-light/50 text-brand-navy hover:bg-brand-light/10"
                onClick={onBookToday}
              >
                Book today
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-1">
            {appointments.map((a) => {
              const start = new Date(a.startAt);
              const time = start.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(a.id)}
                    className="w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-brand-light/15"
                  >
                    <div className="text-xs font-medium text-brand-navy">{time}</div>
                    <div className="truncate text-sm font-medium">{a.customerName}</div>
                    {a.vehicleLabel ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {a.vehicleLabel}
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
