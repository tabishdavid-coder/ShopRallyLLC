"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Car,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Phone,
  Trash2,
  User,
  Wrench,
} from "lucide-react";

import { CrmFormField } from "@/components/crm/crm-form-field";
import { customerFieldInputClass } from "@/components/customers/customer-form-shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APPOINTMENT_STATUS_META,
  buildLocalStartAt,
  clampStartTimeToNow,
  isStartInPast,
  minTimeInputForDate,
  toDateInputValue,
  todayDateInputValue,
} from "@/lib/appointments";
import { formatPhoneInput } from "@/lib/phone";
import { defaultRoOpenHref } from "@/lib/ro-workspace";
import { cn } from "@/lib/utils";
import type { AppointmentRow } from "@/server/appointments";
import {
  cancelAppointment,
  createRepairOrderFromAppointment,
  updateAppointment,
} from "@/server/actions/appointments";

const PAST_START_ERROR =
  "Choose a start time that is today or in the future.";

function sameMinute(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes()
  );
}

type EditableStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NO_SHOW";

const QUICK_STATUS_CHIPS: {
  status: EditableStatus;
  label: string;
  activeClass: string;
}[] = [
  {
    status: "CONFIRMED",
    label: "Confirm",
    activeClass: "border-brand-navy bg-brand-navy text-white",
  },
  {
    status: "IN_PROGRESS",
    label: "Arrived",
    activeClass: "border-emerald-600 bg-emerald-600 text-white",
  },
  {
    status: "NO_SHOW",
    label: "No show",
    activeClass: "border-brand-red bg-brand-red text-white",
  },
];

function buildStartEndFromForm(date: string, startTime: string, durationMins: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = startTime.split(":").map(Number);
  const startAt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  const endAt = new Date(startAt.getTime() + durationMins * 60_000);
  return { startAt, endAt };
}

function IdentityRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 text-brand-navy">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

function CopyPhoneButton({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(phone.replace(/\D/g, ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="size-7 shrink-0 text-muted-foreground hover:text-brand-navy"
      aria-label={copied ? "Copied" : "Copy phone number"}
      onClick={onCopy}
    >
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

export function AppointmentDetailSheet({
  appointment,
  employees,
  open,
  onOpenChange,
}: {
  appointment: AppointmentRow | null;
  employees: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMins, setDurationMins] = useState(60);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<EditableStatus>("SCHEDULED");
  const [technicianId, setTechnicianId] = useState("none");

  useEffect(() => {
    if (!appointment) return;
    const start = new Date(appointment.startAt);
    setDate(toDateInputValue(start));
    setStartTime(
      `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`,
    );
    setDurationMins(appointment.durationMins);
    setNotes(appointment.notes ?? "");
    setStatus(
      appointment.status === "CANCELED" ? "SCHEDULED" : appointment.status,
    );
    setTechnicianId(appointment.technician?.id ?? "none");
    setError(null);
  }, [appointment]);

  const schedulePreview = useMemo(() => {
    if (!date || !startTime) return null;
    const { startAt, endAt } = buildStartEndFromForm(date, startTime, durationMins);
    return { startAt, endAt };
  }, [date, startTime, durationMins]);

  if (!appointment) return null;

  const persistedStart = new Date(appointment.startAt);
  const persistedEnd = new Date(appointment.endAt);
  const displayStart = schedulePreview?.startAt ?? persistedStart;
  const displayEnd = schedulePreview?.endAt ?? persistedEnd;
  const statusMeta = APPOINTMENT_STATUS_META[appointment.status];
  const currentStatusMeta = APPOINTMENT_STATUS_META[status];
  const customerName = appointment.customer?.name ?? "Walk-in";
  const serviceLabel =
    appointment.serviceName?.trim() ||
    appointment.title.replace(/\s*appointment\s*$/i, "").trim() ||
    "Appointment";
  const phoneDigits = appointment.customer?.phone?.replace(/\D/g, "") ?? "";
  const phoneDisplay = appointment.customer?.phone
    ? formatPhoneInput(appointment.customer.phone)
    : null;
  const assignedName =
    technicianId === "none"
      ? null
      : employees.find((e) => e.id === technicianId)?.name ??
        appointment.technician?.name ??
        null;

  const todayIso = todayDateInputValue();
  const minDate = date < todayIso ? undefined : todayIso;
  const minTime = date < todayIso ? undefined : minTimeInputForDate(date);

  function handleDateChange(next: string) {
    const clamped = next < todayIso ? todayIso : next;
    setDate(clamped || todayIso);
    setStartTime((prev) => clampStartTimeToNow(clamped || todayIso, prev));
  }

  function saveChanges() {
    const scheduleUnchanged = sameMinute(
      new Date(appointment!.startAt),
      buildLocalStartAt(date, startTime),
    );
    if (!scheduleUnchanged && isStartInPast(date, startTime)) {
      setError(PAST_START_ERROR);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateAppointment({
        id: appointment!.id,
        date,
        startTime,
        durationMins,
        notes: notes || null,
        technicianId: technicianId === "none" ? null : technicianId,
        status,
      });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function handleCancel() {
    if (!confirm("Cancel this appointment?")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelAppointment(appointment!.id);
      if (!result.ok) setError(result.error);
      else {
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  function handleCreateRo() {
    setError(null);
    startTransition(async () => {
      const result = await createRepairOrderFromAppointment(appointment!.id);
      if (!result.ok) setError(result.error);
      else if (result.roId) {
        router.push(`/repair-orders/${result.roId}/estimate`);
        onOpenChange(false);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-border p-0 sm:max-w-md [&_[data-slot=sheet-close]]:text-white [&_[data-slot=sheet-close]]:hover:bg-white/10"
      >
        <SheetHeader className="shrink-0 space-y-3 border-b border-brand-navy/20 bg-brand-navy px-5 py-4 pr-12 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                statusMeta.className,
              )}
            >
              {statusMeta.label}
            </span>
            {appointment.repairOrderNumber && appointment.repairOrderId ? (
              <Link
                href={defaultRoOpenHref(appointment.repairOrderId)}
                className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white hover:bg-white/20"
              >
                RO #{appointment.repairOrderNumber}
                <ExternalLink className="size-3" />
              </Link>
            ) : null}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-light">
              Appointment
            </p>
            <SheetTitle className="mt-1 text-lg font-bold leading-snug text-white">
              {customerName}
            </SheetTitle>
            <SheetDescription className="mt-1 text-sm text-white/80">
              {serviceLabel}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          <section className="border-b border-border px-5 py-4">
            <div className="divide-y divide-border/70">
              {phoneDisplay ? (
                <IdentityRow icon={Phone} label="Phone">
                  <div className="flex items-center gap-1">
                    <a
                      href={`tel:${phoneDigits}`}
                      className="font-medium text-brand-navy hover:underline"
                    >
                      {phoneDisplay}
                    </a>
                    <CopyPhoneButton phone={appointment.customer!.phone!} />
                  </div>
                </IdentityRow>
              ) : null}
              {appointment.vehicle ? (
                <IdentityRow icon={Car} label="Vehicle">
                  {appointment.vehicle.label}
                </IdentityRow>
              ) : null}
              <IdentityRow icon={User} label="Assigned">
                {assignedName ?? (
                  <span className="font-normal text-muted-foreground">Unassigned</span>
                )}
              </IdentityRow>
            </div>
          </section>

          <section className="border-b border-border px-5 py-4">
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                  <CalendarClock className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Scheduled
                  </p>
                  <p className="mt-1 text-base font-semibold text-brand-navy">
                    {displayStart.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">
                    {displayStart.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {displayEnd.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    <span className="text-muted-foreground">
                      {" "}
                      · {durationMins} min
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3 border-b border-border px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-navy">
                Quick status
              </p>
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                  currentStatusMeta.className,
                )}
              >
                {currentStatusMeta.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_STATUS_CHIPS.map((chip) => {
                const active = status === chip.status;
                return (
                  <button
                    key={chip.status}
                    type="button"
                    disabled={pending}
                    onClick={() => setStatus(chip.status)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      active
                        ? chip.activeClass
                        : "border-border bg-background text-foreground hover:border-brand-navy/30 hover:bg-muted/40",
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4 border-b border-border px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-navy">
              Reschedule & details
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <CrmFormField label="Date" required>
                  <Input
                    type="date"
                    value={date}
                    min={minDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className={customerFieldInputClass}
                    required
                  />
                </CrmFormField>
                <CrmFormField label="Start time" required>
                  <Input
                    type="time"
                    value={startTime}
                    min={minTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={customerFieldInputClass}
                    required
                  />
                </CrmFormField>
              </div>
              <CrmFormField label="Duration (mins)">
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className={customerFieldInputClass}
                  required
                />
              </CrmFormField>
              <CrmFormField label="Status">
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as EditableStatus)}
                >
                  <SelectTrigger className={customerFieldInputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "SCHEDULED",
                        "CONFIRMED",
                        "IN_PROGRESS",
                        "COMPLETED",
                        "NO_SHOW",
                      ] as const
                    ).map((s) => (
                      <SelectItem key={s} value={s}>
                        {APPOINTMENT_STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CrmFormField>
              <CrmFormField label="Employee">
                <Select value={technicianId} onValueChange={setTechnicianId}>
                  <SelectTrigger className={customerFieldInputClass}>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CrmFormField>
              <CrmFormField label="Notes">
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={customerFieldInputClass}
                  placeholder="Internal notes for this appointment…"
                />
              </CrmFormField>
            </div>
          </section>

          {error ? (
            <p className="px-5 py-3 text-sm text-brand-red">{error}</p>
          ) : null}
        </div>

        <SheetFooter className="shrink-0 gap-3 border-t border-border bg-muted/20 px-5 py-4">
          <Button
            type="button"
            disabled={pending}
            onClick={saveChanges}
            className="w-full bg-brand-navy hover:bg-brand-navy/90"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
          <div className="flex w-full flex-wrap gap-2">
            {appointment.repairOrderId ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="min-w-0 flex-1 gap-1.5 border-border text-brand-navy"
              >
                <Link href={defaultRoOpenHref(appointment.repairOrderId)}>
                  <ExternalLink className="size-4" /> Open RO
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="min-w-0 flex-1 gap-1.5 border-brand-navy/30 text-brand-navy hover:bg-brand-navy/5"
                onClick={handleCreateRo}
                disabled={pending || !appointment.vehicle}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wrench className="size-4" />
                )}
                New Repair Order
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="min-w-0 flex-1 gap-1.5 border-brand-red/40 text-brand-red hover:bg-brand-red/5 hover:text-brand-red"
              onClick={handleCancel}
              disabled={pending}
            >
              <Trash2 className="size-4" /> Cancel appointment
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
