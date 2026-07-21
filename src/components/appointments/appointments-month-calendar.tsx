"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import {
  getMonthGridDays,
  getMonthStart,
  isSameDay,
  isSameMonth,
  parseDateInput,
  toDateInputValue,
} from "@/lib/appointments";
import type { AppointmentRow, CalendarBlockRow } from "@/server/appointments";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AppointmentsMonthCalendar({
  focusDateIso,
  appointments,
  blocks,
  selectedId,
  onSelect,
  onSelectDay,
  onBookDay,
}: {
  focusDateIso: string;
  appointments: AppointmentRow[];
  blocks: CalendarBlockRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Click day header / empty cell → jump to day view. */
  onSelectDay?: (dateIso: string) => void;
  onBookDay?: (dateIso: string) => void;
}) {
  const focus = useMemo(() => parseDateInput(focusDateIso), [focusDateIso]);
  const monthStart = useMemo(() => getMonthStart(focus), [focus]);
  const days = useMemo(() => getMonthGridDays(focus), [focus]);
  const today = new Date();

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const day of days) map.set(toDateInputValue(day), []);
    for (const a of appointments) {
      const key = toDateInputValue(new Date(a.startAt));
      const list = map.get(key);
      if (list) list.push(a);
    }
    for (const list of map.values()) {
      list.sort((x, y) => new Date(x.startAt).getTime() - new Date(y.startAt).getTime());
    }
    return map;
  }, [appointments, days]);

  const blocksByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of blocks) {
      const key = toDateInputValue(new Date(b.startAt));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [blocks]);

  const weekCount = Math.max(1, Math.ceil(days.length / 7));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-lg border border-border bg-white shadow-sm">
      <div className="grid shrink-0 grid-cols-7 border-b border-border bg-muted/30">
        {DOW.map((d) => (
          <div
            key={d}
            className="border-r border-border px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid min-h-0 flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${weekCount}, minmax(7.5rem, 1fr))` }}
      >
        {days.map((day) => {
          const key = toDateInputValue(day);
          const inMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, today);
          const dayAppts = byDay.get(key) ?? [];
          const blockCount = blocksByDay.get(key) ?? 0;
          const visible = dayAppts.slice(0, 3);
          const more = dayAppts.length - visible.length;

          return (
            <div
              key={key}
              className={cn(
                "group flex min-h-0 flex-col border-b border-r border-border p-1.5 last:border-r-0",
                !inMonth && "bg-muted/25 text-muted-foreground",
                isToday && inMonth && "bg-brand-navy/[0.03]",
              )}
            >
              <button
                type="button"
                className={cn(
                  "mb-1 flex size-7 items-center justify-center self-end rounded-full text-xs font-semibold",
                  isToday && inMonth
                    ? "bg-brand-navy text-white"
                    : "text-foreground hover:bg-muted",
                  !inMonth && "text-muted-foreground",
                )}
                onClick={() => onSelectDay?.(key)}
                aria-label={`Open ${key}`}
              >
                {day.getDate()}
              </button>

              <div className="flex min-h-0 flex-1 flex-col gap-0.5">
                {visible.map((a) => {
                  const name = a.customer?.name ?? a.title;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      title={`${formatShortTime(a.startAt)} · ${name}`}
                      onClick={() => onSelect(a.id)}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-white",
                        "bg-brand-navy hover:bg-brand-navy/90",
                        selectedId === a.id && "ring-2 ring-brand-light",
                      )}
                    >
                      <span className="tabular-nums opacity-90">{formatShortTime(a.startAt)}</span>{" "}
                      {name}
                    </button>
                  );
                })}
                {more > 0 ? (
                  <button
                    type="button"
                    className="px-1 text-left text-[10px] font-medium text-brand-navy hover:underline"
                    onClick={() => onSelectDay?.(key)}
                  >
                    +{more} more
                  </button>
                ) : null}
                {blockCount > 0 && dayAppts.length === 0 ? (
                  <span className="px-1 text-[10px] text-slate-500">
                    {blockCount} block{blockCount === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>

              {onBookDay && inMonth ? (
                <button
                  type="button"
                  className="mt-auto hidden rounded px-1 py-0.5 text-[10px] font-medium text-brand-navy opacity-0 hover:bg-brand-navy/10 group-hover:block group-hover:opacity-100"
                  onClick={() => onBookDay(key)}
                >
                  + Book
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
