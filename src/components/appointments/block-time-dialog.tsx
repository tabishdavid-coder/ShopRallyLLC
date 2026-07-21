"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock3,
  Loader2,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { customerFieldInputClass } from "@/components/customers/customer-form-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  buildLocalStartAt,
  clampDateInputToToday,
  clampStartTimeToNow,
  isStartInPast,
  minTimeInputForDate,
  toDateInputValue,
  todayDateInputValue,
} from "@/lib/appointments";
import { cn } from "@/lib/utils";
import {
  createCalendarBlock,
  updateCalendarBlock,
} from "@/server/actions/calendar-blocks";
import type { CalendarBlockRow } from "@/server/appointments";

const DURATION_PRESETS = [30, 60, 90, 120] as const;

const PAST_START_ERROR =
  "Choose a start time that is today or in the future.";

const TITLE_PRESETS = ["Lunch", "Training", "Closed bay", "Personal", "Meeting"] as const;

const lightFieldClass = cn(
  customerFieldInputClass,
  "h-10 border-border bg-white shadow-none transition-[border-color,box-shadow]",
  "focus-visible:border-brand-navy/40 focus-visible:ring-2 focus-visible:ring-brand-navy/15",
);

const scheduleFieldClass = cn(
  lightFieldClass,
  "h-11 text-sm font-medium text-foreground",
);

function ScheduleField({
  label,
  required,
  icon: Icon,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        {Icon ? (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-light/30 text-brand-navy">
            <Icon className="size-3.5" aria-hidden />
          </span>
        ) : null}
        <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-navy">
          {label}
          {required ? <span className="text-brand-red"> *</span> : null}
        </label>
      </div>
      {children}
    </div>
  );
}

function DetailField({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function DetailSectionHeader({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5 border-b border-border pb-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-navy/8 text-brand-navy">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-navy">{title}</h3>
    </div>
  );
}

export type BlockTimeDefaults = {
  date?: string;
  startTime?: string;
};

function initialCreateBlockSchedule(defaults?: BlockTimeDefaults) {
  const date = clampDateInputToToday(defaults?.date ?? toDateInputValue(new Date()));
  const startTime = clampStartTimeToNow(date, defaults?.startTime ?? "12:00");
  return { date, startTime };
}

function sameMinute(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes()
  );
}

export function BlockTimeDialog({
  open,
  onOpenChange,
  defaultDurationMins,
  defaults,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDurationMins: number;
  defaults?: BlockTimeDefaults;
  editing?: CalendarBlockRow | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("Lunch");
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [startTime, setStartTime] = useState("12:00");
  const [durationMins, setDurationMins] = useState(defaultDurationMins);
  const [notes, setNotes] = useState("");
  const wasOpenRef = useRef(false);
  const todayIso = todayDateInputValue();
  /** Create: today+. Edit past block: keep showing existing date (no min), but cannot pick earlier than today when rescheduling forward. */
  const minDate = editing
    ? date < todayIso
      ? undefined
      : todayIso
    : todayIso;
  const minTime =
    editing && date < todayIso ? undefined : minTimeInputForDate(date);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    if (editing) {
      const start = new Date(editing.startAt);
      setTitle(editing.title);
      setDate(toDateInputValue(start));
      setStartTime(
        `${start.getHours().toString().padStart(2, "0")}:${start
          .getMinutes()
          .toString()
          .padStart(2, "0")}`,
      );
      setDurationMins(editing.durationMins);
      setNotes(editing.notes ?? "");
    } else {
      const schedule = initialCreateBlockSchedule(defaults);
      setTitle("Lunch");
      setDate(schedule.date);
      setStartTime(schedule.startTime);
      setDurationMins(defaultDurationMins);
      setNotes("");
    }
    setError(null);
  }, [open, defaults, defaultDurationMins, editing]);

  function handleDateChange(next: string) {
    if (editing) {
      const clamped = next < todayIso ? todayIso : next;
      setDate(clamped || todayIso);
      setStartTime((prev) => clampStartTimeToNow(clamped || todayIso, prev));
      return;
    }
    const clamped = clampDateInputToToday(next);
    setDate(clamped);
    setStartTime((prev) => clampStartTimeToNow(clamped, prev));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Add a label for this block.");
      return;
    }
    const scheduleUnchanged =
      editing &&
      sameMinute(new Date(editing.startAt), buildLocalStartAt(date, startTime));
    if (!scheduleUnchanged && isStartInPast(date, startTime)) {
      setError(PAST_START_ERROR);
      return;
    }
    setError(null);
    startTransition(async () => {
      const payload = {
        title: title.trim(),
        date,
        startTime,
        durationMins,
        notes: notes || null,
      };
      const result = editing
        ? await updateCalendarBlock({ id: editing.id, ...payload })
        : await createCalendarBlock(payload);
      if (!result.ok) setError(result.error);
      else {
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border p-0 shadow-xl shadow-brand-navy/15 sm:max-w-4xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <div className="flex max-h-[min(72vh,580px)] min-h-0 flex-col overflow-hidden lg:flex-row">
            {/* Left: light schedule plane with navy accents (~40%) */}
            <aside className="relative flex shrink-0 flex-col border-b border-border bg-gradient-to-b from-slate-50 via-slate-50/80 to-white px-5 py-5 lg:w-[40%] lg:min-w-[17rem] lg:border-b-0 lg:border-r">
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-brand-navy"
                aria-hidden
              />

              <div className="mb-5 space-y-2 pl-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-navy/10 bg-white px-2.5 py-1 shadow-sm">
                  <span className="flex size-5 items-center justify-center rounded-full bg-brand-light/35 text-brand-navy">
                    <CalendarClock className="size-3" aria-hidden />
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-navy">
                    Schedule
                  </p>
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-brand-navy">When</h2>
                <p className="text-xs leading-snug text-muted-foreground">
                  Shop hours apply on the calendar view.
                </p>
              </div>

              <div className="flex flex-1 flex-col gap-4 pl-1">
                <ScheduleField label="Date" required icon={CalendarDays}>
                  <Input
                    type="date"
                    value={date}
                    min={minDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className={scheduleFieldClass}
                    required
                  />
                </ScheduleField>

                <ScheduleField label="Start time" required icon={Clock3}>
                  <Input
                    type="time"
                    value={startTime}
                    min={minTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={scheduleFieldClass}
                    required
                  />
                </ScheduleField>

                <ScheduleField label="Duration" className="mt-auto pt-2">
                  <div
                    className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-white p-1.5 shadow-sm"
                    role="group"
                    aria-label="Duration presets"
                  >
                    {DURATION_PRESETS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMins(mins)}
                        className={cn(
                          "rounded-md px-2 py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow,border-color]",
                          durationMins === mins
                            ? "border border-brand-navy/15 bg-brand-navy text-white shadow-sm"
                            : "border border-transparent text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 shadow-sm">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Custom
                    </span>
                    <Input
                      type="number"
                      min={15}
                      step={15}
                      value={durationMins}
                      onChange={(e) => setDurationMins(Number(e.target.value))}
                      className={cn(scheduleFieldClass, "h-9 w-[4.5rem] px-2 text-center text-sm")}
                      aria-label="Custom duration in minutes"
                      required
                    />
                    <span className="text-xs font-medium text-muted-foreground">min</span>
                  </div>
                </ScheduleField>
              </div>
            </aside>

            {/* Right: clean white details pane (~60%) */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white">
              <div className="border-b border-border px-5 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-brand-navy">
                  <Ban className="size-4 shrink-0" aria-hidden />
                  {editing ? "Edit blocked time" : "Block time"}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Marks the calendar unavailable — not a customer appointment.
                </p>
              </div>

              <div className="space-y-6 px-5 py-5">
                <section>
                  <DetailSectionHeader icon={Tag} title="Block label" />
                  <DetailField label="Label" required>
                    <div
                      className="mb-3 flex flex-wrap gap-1.5"
                      role="group"
                      aria-label="Label presets"
                    >
                      {TITLE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTitle(preset)}
                          className={cn(
                            "rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-[background-color,color,border-color,box-shadow]",
                            title === preset
                              ? "border-brand-navy/15 bg-brand-navy text-white shadow-sm"
                              : "border-border bg-white text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
                          )}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Lunch, Training…"
                      className={lightFieldClass}
                      required
                    />
                  </DetailField>
                </section>

                <section>
                  <DetailSectionHeader icon={ClipboardList} title="Notes" />
                  <DetailField label="Notes">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Optional detail…"
                      className={cn(
                        customerFieldInputClass,
                        "min-h-[5.5rem] resize-none border-border bg-white shadow-none transition-[border-color,box-shadow]",
                        "focus-visible:border-brand-navy/40 focus-visible:ring-2 focus-visible:ring-brand-navy/15",
                      )}
                    />
                  </DetailField>
                </section>

                {error ? (
                  <p className="rounded-lg border border-brand-red/25 bg-brand-red/10 px-4 py-2.5 text-sm font-medium text-brand-red">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Full-width footer */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/20 px-5 py-3.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-brand-navy shadow-sm hover:bg-brand-navy/90"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : editing ? (
                "Save block"
              ) : (
                "Block time"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
