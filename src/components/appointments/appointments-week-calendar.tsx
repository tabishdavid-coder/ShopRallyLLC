"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import {
  addDays,
  formatDayHeader,
  formatMinutesLabel,
  isSameDay,
  minutesToTimeInput,
  parseTimeToMinutes,
  toDateInputValue,
} from "@/lib/appointments";
import type { AppointmentRow } from "@/server/appointments";

const HOUR_HEIGHT = 56;
const SLOT_MINUTES = 15;

export function AppointmentsWeekCalendar({
  weekStartIso,
  dayStart,
  dayEnd,
  appointments,
  selectedId,
  onSelect,
  onBookSlot,
}: {
  weekStartIso: string;
  dayStart: string;
  dayEnd: string;
  appointments: AppointmentRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBookSlot?: (date: string, startTime: string) => void;
}) {
  const weekStart = new Date(weekStartIso);
  const startMins = parseTimeToMinutes(dayStart);
  const endMins = parseTimeToMinutes(dayEnd);
  const totalMins = Math.max(endMins - startMins, 60);
  const gridHeight = (totalMins / 60) * HOUR_HEIGHT;

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStartIso],
  );

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let m = startMins; m < endMins; m += 60) list.push(m);
    return list;
  }, [startMins, endMins]);

  const today = new Date();

  const byDay = useMemo(() => {
    const map = new Map<number, AppointmentRow[]>();
    for (let i = 0; i < 7; i++) map.set(i, []);
    for (const a of appointments) {
      const start = new Date(a.startAt);
      for (let i = 0; i < 7; i++) {
        const day = days[i];
        if (isSameDay(start, day)) {
          map.get(i)!.push(a);
          break;
        }
      }
    }
    return map;
  }, [appointments, days]);

  function blockStyle(a: AppointmentRow) {
    const start = new Date(a.startAt);
    const end = new Date(a.endAt);
    const startOffset = start.getHours() * 60 + start.getMinutes() - startMins;
    const endOffset = end.getHours() * 60 + end.getMinutes() - startMins;
    const top = Math.max(0, (startOffset / 60) * HOUR_HEIGHT);
    const height = Math.max(28, ((endOffset - startOffset) / 60) * HOUR_HEIGHT);
    return { top, height };
  }

  function handleDayClick(event: React.MouseEvent<HTMLDivElement>, day: Date) {
    if (!onBookSlot) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const ratio = Math.min(Math.max(y / gridHeight, 0), 1);
    const clickedMins = startMins + ratio * totalMins;
    const snapped = Math.round(clickedMins / SLOT_MINUTES) * SLOT_MINUTES;
    const clamped = Math.min(Math.max(snapped, startMins), endMins - SLOT_MINUTES);
    onBookSlot(toDateInputValue(day), minutesToTimeInput(clamped));
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-brand-light/30 bg-card">
      <div className="sticky top-0 z-20 grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-brand-light/30 bg-card">
        <div className="border-r border-brand-light/20 bg-muted/30" />
        {days.map((day) => {
          const { dow, md } = formatDayHeader(day);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-r border-brand-light/20 px-2 py-2 text-center last:border-r-0",
                isToday && "bg-brand-light/15",
              )}
            >
              <div className="text-xs text-muted-foreground">{dow}</div>
              <div className={cn("text-sm font-semibold", isToday && "text-brand-navy")}>
                {md}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))]">
        <div className="relative border-r border-brand-light/20 bg-muted/20" style={{ height: gridHeight }}>
          {hours.map((m) => (
            <div
              key={m}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground"
              style={{ top: ((m - startMins) / 60) * HOUR_HEIGHT }}
            >
              {formatMinutesLabel(m)}
            </div>
          ))}
        </div>

        {days.map((day, dayIdx) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "relative border-r border-brand-light/20 last:border-r-0",
                isToday && "bg-brand-light/10",
                onBookSlot && "cursor-pointer",
              )}
              style={{ height: gridHeight }}
              onClick={(e) => handleDayClick(e, day)}
              role={onBookSlot ? "button" : undefined}
              aria-label={onBookSlot ? `Book appointment on ${day.toLocaleDateString()}` : undefined}
            >
              {hours.map((m) => (
                <div
                  key={m}
                  className="pointer-events-none absolute inset-x-0 border-t border-border/60"
                  style={{ top: ((m - startMins) / 60) * HOUR_HEIGHT }}
                />
              ))}

              {byDay.get(dayIdx)?.map((a) => {
                const { top, height } = blockStyle(a);
                const start = new Date(a.startAt);
                const end = new Date(a.endAt);
                const timeRange = `${start.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })} – ${end.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}`;

                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(a.id);
                    }}
                    className={cn(
                      "absolute inset-x-1 z-10 overflow-hidden rounded px-2 py-1 text-left text-white shadow-sm transition",
                      "bg-brand-navy hover:bg-brand-navy/90",
                      selectedId === a.id && "ring-2 ring-brand-light ring-offset-1",
                    )}
                    style={{ top, height }}
                  >
                    <div className="truncate text-[11px] font-semibold leading-tight">
                      {a.customer?.name ?? a.title}
                      {a.vehicle ? `'s ${a.vehicle.label}` : ""}
                    </div>
                    <div className="truncate text-[10px] opacity-90">{timeRange}</div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
