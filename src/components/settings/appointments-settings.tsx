"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Clock, Loader2, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateAppointments } from "@/server/actions/shop";
import { SettingsHero } from "@/components/settings/settings-hero";
import {
  BOOKING_DAYS,
  BOOKING_DAY_LABELS,
  apptHoursForToday,
  type ApptWeeklyHours,
  type BookingDayKey,
} from "@/lib/appt-hours";

const inputCls =
  "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function AppointmentsSettings({
  initial,
  timezone,
}: {
  initial: {
    weeklyHours: ApptWeeklyHours;
    apptDefaultDurationMins: number;
  };
  timezone: string;
}) {
  const [weekly, setWeekly] = useState<ApptWeeklyHours>(initial.weeklyHours);
  const [duration, setDuration] = useState(initial.apptDefaultDurationMins);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const todayHours = useMemo(
    () => apptHoursForToday(weekly, timezone),
    [weekly, timezone],
  );

  function patchDay(key: BookingDayKey, patch: Partial<ApptWeeklyHours[BookingDayKey]>) {
    setWeekly((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function applyToWeekdays() {
    const mon = weekly.mon;
    setWeekly((prev) => {
      const next = { ...prev };
      for (const key of ["tue", "wed", "thu", "fri"] as BookingDayKey[]) {
        next[key] = { ...mon };
      }
      return next;
    });
  }

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateAppointments({
        weeklyHours: weekly,
        apptDefaultDurationMins: duration,
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <SettingsHero
        icon={Clock}
        title="Appointments"
        description="Set your shop hours by day of the week and the default length for new appointments. These drive the scheduling grid."
      />

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Today&apos;s hours
            </h2>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  Open
                </dt>
                <dd
                  className={cn(
                    "mt-0.5 text-sm font-medium",
                    !todayHours && "italic text-muted-foreground",
                  )}
                >
                  {todayHours
                    ? `${formatTime(todayHours.start)} – ${formatTime(todayHours.end)}`
                    : "Closed today"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  Default appointment length
                </dt>
                <dd className="mt-0.5 text-sm font-medium">{duration} minutes</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  Timezone
                </dt>
                <dd
                  className="mt-0.5 font-mono text-[13px] text-muted-foreground"
                  title="Detected from your shop address"
                >
                  {timezone}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Default duration
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Used when booking a new appointment from the calendar.
            </p>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium">Minutes</label>
              <input
                type="number"
                min={5}
                step={5}
                className={cn(inputCls, "w-full")}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-lg border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy/8 text-brand-navy">
                <Timer className="size-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-base font-semibold">Weekly shop hours</h3>
                <p className="text-sm text-muted-foreground">
                  Toggle each day open or closed, then set start and end times.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={applyToWeekdays}>
              Copy Mon → Fri
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="hidden grid-cols-[7rem_4.5rem_1fr_1fr] gap-3 border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <span>Day</span>
              <span>Status</span>
              <span>Opens</span>
              <span>Closes</span>
            </div>
            <ul className="divide-y">
              {BOOKING_DAYS.map((key) => {
                const day = weekly[key];
                return (
                  <li
                    key={key}
                    className={cn(
                      "grid grid-cols-1 items-center gap-2 px-3 py-2.5 sm:grid-cols-[7rem_4.5rem_1fr_1fr] sm:gap-3",
                      !day.enabled && "bg-muted/20",
                    )}
                  >
                    <span className="text-sm font-medium">{BOOKING_DAY_LABELS[key]}</span>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={day.enabled}
                        onChange={(e) => patchDay(key, { enabled: e.target.checked })}
                        className="size-4 accent-primary"
                      />
                      <span className={day.enabled ? "text-foreground" : "text-muted-foreground"}>
                        {day.enabled ? "Open" : "Closed"}
                      </span>
                    </label>
                    <input
                      type="time"
                      className={inputCls}
                      value={day.start}
                      disabled={!day.enabled}
                      onChange={(e) => patchDay(key, { start: e.target.value })}
                      aria-label={`${BOOKING_DAY_LABELS[key]} opens`}
                    />
                    <input
                      type="time"
                      className={inputCls}
                      value={day.end}
                      disabled={!day.enabled}
                      onChange={(e) => patchDay(key, { end: e.target.value })}
                      aria-label={`${BOOKING_DAY_LABELS[key]} closes`}
                    />
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3 border-t pt-4">
            {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
            {saved ? (
              <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600">
                <Check className="size-3.5" /> Saved
              </span>
            ) : null}
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
