"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Plus, Loader2, UserPlus } from "lucide-react";

import { CrmDialogHeaderBar, CrmFormField } from "@/components/crm/crm-form-field";
import { CrmFormSection } from "@/components/crm/crm-form-section";
import { customerFieldInputClass } from "@/components/customers/customer-form-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
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
import { customerDisplayName } from "@/lib/format";
import { toDateInputValue } from "@/lib/appointments";
import { cn } from "@/lib/utils";

const DURATION_PRESETS = [30, 60, 90, 120] as const;

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

  const [date, setDate] = useState(defaults?.date ?? toDateInputValue(new Date()));
  const [startTime, setStartTime] = useState(defaults?.startTime ?? "09:00");
  const [durationMins, setDurationMins] = useState(defaultDurationMins);
  const [notes, setNotes] = useState(defaults?.notes ?? "");
  const [technicianId, setTechnicianId] = useState<string>("none");

  const [customerId, setCustomerId] = useState<string | null>(defaults?.customerId ?? null);
  const [customerName, setCustomerName] = useState(defaults?.customerName ?? "");
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<CustomerPick[]>([]);
  const [custOpen, setCustOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [vehicles, setVehicles] = useState<VehiclePick[]>([]);
  const [vehicleId, setVehicleId] = useState<string>(defaults?.vehicleId ?? "none");
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    setDate(defaults?.date ?? toDateInputValue(new Date()));
    setStartTime(defaults?.startTime ?? "09:00");
    setDurationMins(defaultDurationMins);
    setNotes(defaults?.notes ?? "");
    setTechnicianId("none");
    setCustomerId(defaults?.customerId ?? null);
    setCustomerName(defaults?.customerName ?? "");
    setCustQuery("");
    setCustResults([]);
    setCustOpen(false);
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("Select a customer.");
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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <CrmDialogHeaderBar
          title="Book appointment"
          description="Schedule drop-off, inspection, or follow-up work."
        />

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="grid gap-4 p-5 md:grid-cols-2 md:items-start">
            <CrmFormSection
              title="When"
              description="Shop hours apply on the calendar view"
              accent="navy"
              className="p-4 shadow-none [&>div:first-child]:mb-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <CrmFormField label="Date" required>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={customerFieldInputClass}
                    required
                  />
                </CrmFormField>
                <CrmFormField label="Start time" required>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={customerFieldInputClass}
                    required
                  />
                </CrmFormField>
              </div>
              <CrmFormField label="Duration" className="mt-3">
                <div className="flex flex-wrap items-center gap-2">
                  {DURATION_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMins(mins)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        durationMins === mins
                          ? "border-brand-navy bg-brand-navy/10 text-brand-navy"
                          : "border-brand-light/50 text-muted-foreground hover:bg-brand-light/10",
                      )}
                    >
                      {mins} min
                    </button>
                  ))}
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={durationMins}
                    onChange={(e) => setDurationMins(Number(e.target.value))}
                    className={cn(customerFieldInputClass, "h-8 w-[4.5rem] shrink-0")}
                    required
                  />
                </div>
              </CrmFormField>
            </CrmFormSection>

            <CrmFormSection
              title="Customer & vehicle"
              accent="light"
              className="p-4 shadow-none [&>div:first-child]:mb-3"
            >
              <CrmFormField label="Customer" required>
                {customerId ? (
                  <div className="flex items-center justify-between rounded-lg border border-brand-light/50 bg-brand-light/5 px-3 py-2 text-sm">
                    <span className="font-medium text-brand-navy">{customerName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerId(null);
                        setCustomerName("");
                      }}
                      aria-label="Clear customer"
                    >
                      <X className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                      {searching ? (
                        <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
                      ) : null}
                      <Input
                        value={custQuery}
                        onChange={(e) => {
                          setCustQuery(e.target.value);
                          setCustOpen(true);
                        }}
                        onFocus={() => setCustOpen(true)}
                        placeholder="Name, phone, plate, VIN, or email"
                        className={cn(customerFieldInputClass, "pl-8")}
                      />
                      {custOpen && custQuery.trim().length >= 2 ? (
                        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover shadow-md">
                          <CustomerSearchResults
                            results={custResults}
                            searching={searching}
                            query={custQuery}
                            onSelect={(c) => selectCustomer(c.id, customerDisplayName(c))}
                          />
                        </div>
                      ) : null}
                    </div>
                    <AddCustomerDialog
                      onCreated={(id, name) => selectCustomer(id, name)}
                      trigger={
                        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1 border-brand-light/50">
                          <UserPlus className="size-4" /> Add
                        </Button>
                      }
                    />
                  </div>
                )}
              </CrmFormField>

              {customerId ? (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium text-foreground">Vehicle</label>
                    <AddVehicleDialog
                      customerId={customerId}
                      onCreated={(id) => {
                        getCustomerVehicles(customerId).then((v) => {
                          setVehicles(v);
                          setVehicleId(id);
                        });
                      }}
                      trigger={
                        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                          <Plus className="size-3.5" /> Add vehicle
                        </Button>
                      }
                    />
                  </div>
                  {loadingVehicles ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Loading…
                    </div>
                  ) : (
                    <Select value={vehicleId} onValueChange={setVehicleId}>
                      <SelectTrigger className={customerFieldInputClass}>
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
              ) : null}
            </CrmFormSection>

            <CrmFormSection
              title="Assignment & notes"
              className="p-4 shadow-none md:col-span-2 [&>div:first-child]:mb-3"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <CrmFormField label="Assign employee">
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
                <CrmFormField label="Notes / purpose of visit">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Inspection, oil change, customer concerns…"
                    className={cn(customerFieldInputClass, "min-h-[4.5rem] resize-none")}
                  />
                </CrmFormField>
              </div>
            </CrmFormSection>

            {error ? <p className="text-sm text-brand-red md:col-span-2">{error}</p> : null}
          </div>

          <DialogFooter className="border-t border-brand-light/30 px-5 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="bg-brand-navy hover:bg-brand-navy/90">
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Create appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
