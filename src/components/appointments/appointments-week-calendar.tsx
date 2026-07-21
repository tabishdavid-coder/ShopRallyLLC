"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AppointmentEventChip } from "@/components/appointments/appointment-event-chip";
import { CalendarBlockChip } from "@/components/appointments/calendar-block-chip";
import { cn } from "@/lib/utils";
import {
  addDays,
  formatDayHeader,
  formatMinutesLabel,
  isSameDay,
  minutesToTimeInput,
  parseDateInput,
  parseTimeToMinutes,
  toDateInputValue,
} from "@/lib/appointments";
import { dateToBookingDayKey, type ApptWeeklyHours } from "@/lib/appt-hours";
import {
  calendarChipInsetStyle,
  layoutCalendarDayEvents,
} from "@/lib/calendar-overlap-layout";
import type { AppointmentRow, CalendarBlockRow } from "@/server/appointments";

/** Floor so short viewports still get readable lanes (then scroll). */
const MIN_HOUR_HEIGHT = 56;
const SLOT_MINUTES = 15;
/** Visual padding above open / below close (clamped to midnight). */
const HOUR_BUFFER_MINS = 60;
const DAY_MINS = 24 * 60;

function useFillHourHeight(hourCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [hourHeight, setHourHeight] = useState(MIN_HOUR_HEIGHT);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || hourCount <= 0) return;

    const update = () => {
      const headerH = headerRef.current?.offsetHeight ?? 0;
      const available = container.clientHeight - headerH;
      if (available <= 0) return;
      const next = Math.max(MIN_HOUR_HEIGHT, available / hourCount);
      setHourHeight((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [hourCount]);

  return { containerRef, headerRef, hourHeight };
}

/** Extend shop hours by ±buffer for display; never cross midnight. */
function gridRangeFromShopHours(shopStartMins: number, shopEndMins: number) {
  const open = Math.min(shopStartMins, shopEndMins);
  const close = Math.max(shopStartMins, shopEndMins);
  const gridStartMins = Math.max(0, open - HOUR_BUFFER_MINS);
  const gridEndMins = Math.min(DAY_MINS, close + HOUR_BUFFER_MINS);
  const totalMins = Math.max(gridEndMins - gridStartMins, 60);
  return { gridStartMins, gridEndMins, totalMins, shopStartMins: open, shopEndMins: close };
}

export function AppointmentsWeekCalendar({
  weekStartIso,
  dayCount = 7,
  dayStart,
  dayEnd,
  weeklyHours,
  defaultDurationMins,
  appointments,
  blocks,
  selectedId,
  selectedBlockId,
  onSelect,
  onSelectBlock,
  onBookSlot,
  onBlockSlot,
}: {
  /** First visible day (YYYY-MM-DD). For week view this is Sunday (local). */
  weekStartIso: string;
  /** 1 = day view, 7 = week view. */
  dayCount?: number;
  dayStart: string;
  dayEnd: string;
  weeklyHours?: ApptWeeklyHours;
  defaultDurationMins: number;
  appointments: AppointmentRow[];
  blocks: CalendarBlockRow[];
  selectedId: string | null;
  selectedBlockId?: string | null;
  onSelect: (id: string) => void;
  onSelectBlock?: (id: string) => void;
  onBookSlot?: (date: string, startTime: string) => void;
  /** Alt/Option+click empty slot → block time instead of book. */
  onBlockSlot?: (date: string, startTime: string) => void;
}) {
  const cols = Math.max(1, Math.min(dayCount, 7));
  /** Local midnight — never `new Date(iso)` (UTC parse shifts the weekday). */
  const rangeStart = useMemo(() => parseDateInput(weekStartIso), [weekStartIso]);
  const shopStartRaw = parseTimeToMinutes(dayStart);
  const shopEndRaw = parseTimeToMinutes(dayEnd);
  const { gridStartMins, gridEndMins, totalMins, shopStartMins, shopEndMins } = useMemo(
    () => gridRangeFromShopHours(shopStartRaw, shopEndRaw),
    [shopStartRaw, shopEndRaw],
  );
  const hourCount = totalMins / 60;
  const { containerRef, headerRef, hourHeight } = useFillHourHeight(hourCount);
  const gridHeight = hourCount * hourHeight;
  const gridCols =
    cols === 1
      ? "grid-cols-[4rem_minmax(0,1fr)]"
      : "grid-cols-[4rem_repeat(7,minmax(0,1fr))]";

  const days = useMemo(
    () => Array.from({ length: cols }, (_, i) => addDays(rangeStart, i)),
    [rangeStart, cols],
  );

  /** Hour-start ticks across the buffered grid (not only shop hours). */
  const hourStarts = useMemo(() => {
    const list: number[] = [];
    for (let m = gridStartMins; m < gridEndMins; m += 60) list.push(m);
    return list;
  }, [gridStartMins, gridEndMins]);

  /** Labels include grid end so close-of-range (e.g. 7:00 PM) shows at the bottom. */
  const hourLabels = useMemo(() => {
    if (gridEndMins <= gridStartMins) return hourStarts;
    if (hourStarts.length > 0 && hourStarts[hourStarts.length - 1] === gridEndMins) {
      return hourStarts;
    }
    return [...hourStarts, gridEndMins];
  }, [hourStarts, gridStartMins, gridEndMins]);

  const today = new Date();

  const byDay = useMemo(() => {
    const map = new Map<number, AppointmentRow[]>();
    for (let i = 0; i < cols; i++) map.set(i, []);
    for (const a of appointments) {
      const start = new Date(a.startAt);
      for (let i = 0; i < cols; i++) {
        if (isSameDay(start, days[i]!)) {
          map.get(i)!.push(a);
          break;
        }
      }
    }
    return map;
  }, [appointments, days, cols]);

  const blocksByDay = useMemo(() => {
    const map = new Map<number, CalendarBlockRow[]>();
    for (let i = 0; i < cols; i++) map.set(i, []);
    for (const b of blocks) {
      const start = new Date(b.startAt);
      for (let i = 0; i < cols; i++) {
        if (isSameDay(start, days[i]!)) {
          map.get(i)!.push(b);
          break;
        }
      }
    }
    return map;
  }, [blocks, days, cols]);

  function dayOpen(day: Date): boolean {
    if (!weeklyHours) return true;
    return weeklyHours[dateToBookingDayKey(day)]?.enabled ?? true;
  }

  const layoutByDay = useMemo(() => {
    const map = new Map<number, ReturnType<typeof layoutCalendarDayEvents>>();
    for (let dayIdx = 0; dayIdx < cols; dayIdx++) {
      const dayAppointments = byDay.get(dayIdx) ?? [];
      const dayBlocks = blocksByDay.get(dayIdx) ?? [];
      const combined = [
        ...dayAppointments.map((a) => ({
          id: `appt:${a.id}`,
          startAt: a.startAt,
          endAt: a.endAt,
        })),
        ...dayBlocks.map((b) => ({
          id: `block:${b.id}`,
          startAt: b.startAt,
          endAt: b.endAt,
        })),
      ];
      map.set(dayIdx, layoutCalendarDayEvents(combined, gridStartMins, hourHeight));
    }
    return map;
  }, [byDay, blocksByDay, gridStartMins, cols, hourHeight]);

  function chipLayout(dayIdx: number, key: string) {
    const layout = layoutByDay.get(dayIdx)?.find((slot) => slot.id === key);
    if (!layout) return undefined;
    const inset = calendarChipInsetStyle(layout.column, layout.colSpan, layout.totalColumns);
    return {
      top: layout.top,
      height: layout.height,
      left: inset.left,
      right: inset.right,
      totalColumns: layout.totalColumns,
    };
  }

  function minsFromY(y: number) {
    const ratio = Math.min(Math.max(y / gridHeight, 0), 1);
    return gridStartMins + ratio * totalMins;
  }

  function handleDayClick(event: React.MouseEvent<HTMLDivElement>, day: Date) {
    if (!dayOpen(day)) return;
    const wantBlock = event.altKey && onBlockSlot;
    if (!wantBlock && !onBookSlot) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const clickedMins = minsFromY(y);
    /** Buffer lanes are display-only — booking stays inside shop hours. */
    if (clickedMins < shopStartMins || clickedMins >= shopEndMins) return;
    const snapped = Math.round(clickedMins / SLOT_MINUTES) * SLOT_MINUTES;
    const clamped = Math.min(Math.max(snapped, shopStartMins), shopEndMins - SLOT_MINUTES);
    if (clamped < shopStartMins || clamped >= shopEndMins) return;
    const date = toDateInputValue(day);
    const startTime = minutesToTimeInput(clamped);
    if (wantBlock) onBlockSlot!(date, startTime);
    else onBookSlot!(date, startTime);
  }

  const preOpenHeight =
    shopStartMins > gridStartMins
      ? ((shopStartMins - gridStartMins) / 60) * hourHeight
      : 0;
  const postCloseTop =
    shopEndMins < gridEndMins ? ((shopEndMins - gridStartMins) / 60) * hourHeight : null;

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 flex-col overflow-auto rounded-lg border border-border bg-white shadow-sm"
    >
      <div
        ref={headerRef}
        className={cn("sticky top-0 z-20 grid shrink-0 border-b border-border bg-white", gridCols)}
      >
        <div className="border-r border-border bg-muted/30" />
        {days.map((day) => {
          const { dow, md } = formatDayHeader(day);
          const isToday = isSameDay(day, today);
          const open = dayOpen(day);
          return (
            <div
              key={toDateInputValue(day)}
              className={cn(
                "border-r border-border px-2 py-2 text-center last:border-r-0",
                isToday && open && "bg-brand-navy/[0.04]",
                !open && "bg-muted/50",
              )}
            >
              <div className="text-xs text-muted-foreground">{dow}</div>
              <div
                className={cn(
                  "text-sm font-semibold",
                  isToday && open && "text-brand-navy",
                  !open && "text-muted-foreground",
                )}
              >
                {md}
              </div>
              {!open ? <div className="text-[10px] text-muted-foreground">Closed</div> : null}
            </div>
          );
        })}
      </div>

      <div className={cn("grid shrink-0", gridCols)}>
        <div className="relative border-r border-border bg-muted/20" style={{ height: gridHeight }}>
          {hourLabels.map((m) => {
            const isFirst = m === gridStartMins;
            const isLast = m === gridEndMins;
            const outsideShop = m < shopStartMins || m > shopEndMins;
            return (
              <div
                key={m}
                className={cn(
                  "absolute right-2 text-[10px]",
                  outsideShop ? "text-muted-foreground/70" : "text-muted-foreground",
                  isFirst && "translate-y-0",
                  isLast && "-translate-y-full",
                  !isFirst && !isLast && "-translate-y-1/2",
                )}
                style={{ top: ((m - gridStartMins) / 60) * hourHeight }}
              >
                {formatMinutesLabel(m)}
              </div>
            );
          })}
        </div>

        {days.map((day, dayIdx) => {
          const isToday = isSameDay(day, today);
          const open = dayOpen(day);
          return (
            <div
              key={toDateInputValue(day)}
              className={cn(
                "group/day relative border-r border-border bg-white last:border-r-0",
                isToday && open && "bg-brand-navy/[0.02]",
                !open && "bg-muted/40",
                onBookSlot && open && "cursor-pointer hover:bg-muted/20",
              )}
              style={{ height: gridHeight }}
              onClick={(e) => handleDayClick(e, day)}
              role={onBookSlot && open ? "button" : undefined}
              aria-label={
                onBookSlot && open
                  ? `Book appointment on ${day.toLocaleDateString()}`
                  : !open
                    ? `Closed ${day.toLocaleDateString()}`
                    : undefined
              }
            >
              {open && preOpenHeight > 0 ? (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 bg-muted/35"
                  style={{ height: preOpenHeight }}
                  aria-hidden
                />
              ) : null}
              {open && postCloseTop != null ? (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-muted/35"
                  style={{ top: postCloseTop }}
                  aria-hidden
                />
              ) : null}

              {hourStarts.map((m) => (
                <div
                  key={m}
                  className={cn(
                    "pointer-events-none absolute inset-x-0 border-t",
                    m === shopStartMins || m === shopEndMins
                      ? "border-border"
                      : "border-border/70",
                  )}
                  style={{ top: ((m - gridStartMins) / 60) * hourHeight }}
                />
              ))}

              {open && onBookSlot ? (
                <div
                  className="pointer-events-none absolute inset-x-0 flex items-center justify-center opacity-0 transition-opacity group-hover/day:opacity-100"
                  style={{
                    top: preOpenHeight,
                    height: ((shopEndMins - shopStartMins) / 60) * hourHeight,
                  }}
                  aria-hidden
                >
                  <span className="rounded-md bg-brand-navy/90 px-2 py-1 text-[10px] font-medium text-white shadow-sm">
                    + Book {defaultDurationMins} min
                  </span>
                </div>
              ) : null}

              {blocksByDay.get(dayIdx)?.map((b) => {
                const layout = chipLayout(dayIdx, `block:${b.id}`);
                return (
                  <CalendarBlockChip
                    key={b.id}
                    block={b}
                    selected={selectedBlockId === b.id}
                    onClick={() => onSelectBlock?.(b.id)}
                    style={
                      layout
                        ? {
                            top: layout.top,
                            height: layout.height,
                            left: layout.left,
                            right: layout.right,
                          }
                        : undefined
                    }
                    compact={(layout?.totalColumns ?? 1) > 1}
                  />
                );
              })}

              {byDay.get(dayIdx)?.map((a) => {
                const layout = chipLayout(dayIdx, `appt:${a.id}`);
                return (
                  <AppointmentEventChip
                    key={a.id}
                    appointment={a}
                    selected={selectedId === a.id}
                    onClick={() => onSelect(a.id)}
                    style={
                      layout
                        ? {
                            top: layout.top,
                            height: layout.height,
                            left: layout.left,
                            right: layout.right,
                          }
                        : undefined
                    }
                    compact={(layout?.totalColumns ?? 1) > 1}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
