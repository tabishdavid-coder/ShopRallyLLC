"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Plus,
  Loader2,
  UserPlus,
  CalendarClock,
  CalendarDays,
  Clock3,
  Car,
  ClipboardList,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { customerFieldInputClass } from "@/components/customers/customer-form-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { CustomerSearchResults } from "@/components/customers/customer-search-results";
import { AddVehicleDialog } from "@/components/vehicles/add-vehicle-dialog";
import { searchCustomers, getCustomerVehicles } from "@/server/actions/pickers";
import type { CustomerPick, VehiclePick } from "@/lib/picker-types";
import { createAppointment } from "@/server/actions/appointments";
import { searchQueryToCustomerPrefill } from "@/lib/customer-search";
import { customerDisplayName } from "@/lib/format";
import {
  clampDateInputToToday,
  clampStartTimeToNow,
  isStartInPast,
  minTimeInputForDate,
  toDateInputValue,
  todayDateInputValue,
} from "@/lib/appointments";
import { cn } from "@/lib/utils";

const DURATION_PRESETS = [30, 60, 90, 120] as const;

const PAST_START_ERROR =
  "Choose a start time that is today or in the future.";

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

function vehicleLabel(v: VehiclePick) {
  const base = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  return base || "Vehicle";
}

export type AppointmentBookDefaults = {
  date?: string;
  startTime?: string;
  customerId?: string;
  customerName?: string;
  vehicleId?: string | null;
  repairOrderId?: string;
  notes?: string | null;
};

function initialBookSchedule(defaults?: AppointmentBookDefaults) {
  const date = clampDateInputToToday(defaults?.date ?? toDateInputValue(new Date()));
  const startTime = clampStartTimeToNow(date, defaults?.startTime ?? "09:00");
  return { date, startTime };
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  defaultDurationMins,
  employees,
  defaults,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDurationMins: number;
  employees: { id: string; name: string }[];
  defaults?: AppointmentBookDefaults;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initial = initialBookSchedule(defaults);
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [durationMins, setDurationMins] = useState(defaultDurationMins);
  const [notes, setNotes] = useState(defaults?.notes ?? "");
  const [technicianId, setTechnicianId] = useState<string>("none");

  const [customerId, setCustomerId] = useState<string | null>(defaults?.customerId ?? null);
  const [customerName, setCustomerName] = useState(defaults?.customerName ?? "");
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<CustomerPick[]>([]);
  const [custOpen, setCustOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);

  const [vehicles, setVehicles] = useState<VehiclePick[]>([]);
  const [vehicleId, setVehicleId] = useState<string>(defaults?.vehicleId ?? "none");
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const wasOpenRef = useRef(false);
  const minDate = todayDateInputValue();
  const minTime = minTimeInputForDate(date);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    const schedule = initialBookSchedule(defaults);
    setDate(schedule.date);
    setStartTime(schedule.startTime);
    setDurationMins(defaultDurationMins);
    setNotes(defaults?.notes ?? "");
    setTechnicianId("none");
    setCustomerId(defaults?.customerId ?? null);
    setCustomerName(defaults?.customerName ?? "");
    setCustQuery("");
    setCustResults([]);
    setCustOpen(false);
    setAddCustomerOpen(false);
    setVehicles([]);
    setVehicleId(defaults?.vehicleId ?? "none");
    setLoadingVehicles(Boolean(defaults?.customerId));
    setError(null);
  }, [open, defaultDurationMins, defaults]);

  useEffect(() => {
    const term = custQuery.trim();
    if (term.length < 2) {
      setCustResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchCustomers(term)
        .then(setCustResults)
        .catch(() => setCustResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [custQuery]);

  useEffect(() => {
    if (!customerId) {
      setVehicles([]);
      setVehicleId("none");
      setLoadingVehicles(false);
      return;
    }
    setVehicles([]);
    setVehicleId("none");
    setLoadingVehicles(true);
    getCustomerVehicles(customerId)
      .then((v) => {
        setVehicles(v);
        const preferred = defaults?.vehicleId;
        if (preferred && v.some((x) => x.id === preferred)) {
          setVehicleId(preferred);
        } else {
          setVehicleId(v.length === 1 ? v[0]!.id : "none");
        }
      })
      .finally(() => setLoadingVehicles(false));
  }, [customerId, defaults?.vehicleId]);

  function selectCustomer(id: string, name: string) {
    setCustomerId(id);
    setCustomerName(name);
    setCustQuery("");
    setCustOpen(false);
  }

  function openAddCustomer() {
    setAddCustomerOpen(true);
  }

  function handleDateChange(next: string) {
    const clamped = clampDateInputToToday(next);
    setDate(clamped);
    setStartTime((prev) => clampStartTimeToNow(clamped, prev));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("Select a customer.");
      return;
    }
    if (isStartInPast(date, startTime)) {
      setError(PAST_START_ERROR);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createAppointment({
        customerId,
        vehicleId: vehicleId === "none" ? null : vehicleId,
        repairOrderId: defaults?.repairOrderId ?? null,
        date,
        startTime,
        durationMins,
        notes: notes || null,
        technicianId: technicianId === "none" ? null : technicianId,
        title: customerName ? `${customerName} appointment` : undefined,
      });
      if (!result.ok) setError(result.error);
      else {
        onOpenChange(false);
        onCreated?.();
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border p-0 shadow-xl shadow-brand-navy/15 sm:max-w-4xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <div className="flex max-h-[min(78vh,640px)] min-h-0 flex-col overflow-hidden lg:flex-row">
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

                <ScheduleField label="Duration">
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

                <ScheduleField label="Assign employee" icon={UserRound} className="mt-auto pt-2">
                  <Select value={technicianId} onValueChange={setTechnicianId}>
                    <SelectTrigger className={scheduleFieldClass}>
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
                </ScheduleField>
              </div>
            </aside>

            {/* Right: clean white details pane (~60%) */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-lg font-semibold tracking-tight text-brand-navy">
                  Book appointment
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Schedule drop-off, inspection, or follow-up work.
                </p>
              </div>

              <div className="space-y-6 px-5 py-5">
                <section>
                  <DetailSectionHeader icon={Car} title="Customer & vehicle" />
                  <DetailField label="Customer" required>
                    {customerId ? (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <UserRound className="size-4 shrink-0 text-brand-navy" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                          {customerName}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerId(null);
                            setCustomerName("");
                          }}
                          className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                          aria-label="Clear customer"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative min-w-0 flex-1">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          {searching ? (
                            <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                          ) : null}
                          <Input
                            value={custQuery}
                            onChange={(e) => {
                              setCustQuery(e.target.value);
                              setCustOpen(true);
                            }}
                            onFocus={() => setCustOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              if (custResults[0]) {
                                selectCustomer(
                                  custResults[0].id,
                                  customerDisplayName(custResults[0]),
                                );
                              } else if (custQuery.trim().length >= 2) {
                                openAddCustomer();
                              }
                            }}
                            placeholder="Name, phone, plate, VIN, or email"
                            className={cn(lightFieldClass, "pl-8")}
                          />
                          {custOpen && custQuery.trim().length >= 2 ? (
                            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                              <CustomerSearchResults
                                results={custResults}
                                searching={searching}
                                query={custQuery}
                                onSelect={(c) => selectCustomer(c.id, customerDisplayName(c))}
                                onAddNew={openAddCustomer}
                              />
                            </div>
                          ) : null}
                        </div>
                        <AddCustomerDialog
                          prefill={searchQueryToCustomerPrefill(custQuery)}
                          open={addCustomerOpen}
                          onOpenChange={setAddCustomerOpen}
                          onCreated={(id, name) => selectCustomer(id, name)}
                          trigger={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 shrink-0 gap-1 px-3"
                            >
                              <UserPlus className="size-4" /> Add
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </DetailField>

                  {customerId ? (
                    <DetailField label="Vehicle" className="mt-3">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          {loadingVehicles ? (
                            <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 text-sm text-muted-foreground">
                              <Loader2 className="size-4 animate-spin" /> Loading vehicles…
                            </div>
                          ) : (
                            <Select value={vehicleId} onValueChange={setVehicleId}>
                              <SelectTrigger className={lightFieldClass}>
                                <SelectValue placeholder="Select vehicle" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No vehicle</SelectItem>
                                {vehicles.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>
                                    {vehicleLabel(v)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <AddVehicleDialog
                          customerId={customerId}
                          onCreated={(id) => {
                            getCustomerVehicles(customerId).then((v) => {
                              setVehicles(v);
                              setVehicleId(id);
                            });
                          }}
                          trigger={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 shrink-0 gap-1 px-3"
                            >
                              <Plus className="size-3.5" /> Add
                            </Button>
                          }
                        />
                      </div>
                    </DetailField>
                  ) : null}
                </section>

                <section>
                  <DetailSectionHeader icon={ClipboardList} title="Purpose of visit" />
                  <DetailField label="Notes">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={8}
                      placeholder="Inspection, oil change, customer concerns, drop-off instructions…"
                      className={cn(
                        customerFieldInputClass,
                        "min-h-[12rem] w-full resize-y border-border bg-white text-sm leading-relaxed shadow-none transition-[border-color,box-shadow]",
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
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Create appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
