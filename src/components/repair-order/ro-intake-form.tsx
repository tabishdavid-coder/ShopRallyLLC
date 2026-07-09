"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Plus,
  Loader2,
  Info,
  Car,
  ClipboardList,
  Trash2,
  Gauge,
  Percent,
  Users,
  Settings,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Save,
} from "lucide-react";

import { CRM_HOME_HREF } from "@/lib/crm-nav";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { CustomerSearchResults } from "@/components/customers/customer-search-results";
import { AddVehicleDialog } from "@/components/vehicles/add-vehicle-dialog";
import { searchCustomers, getCustomerVehicles, getCustomerPick } from "@/server/actions/pickers";
import type { CustomerPick, VehiclePick } from "@/lib/picker-types";
import { createRepairOrder } from "@/server/actions/repair-orders";
import { saveLaborRates } from "@/server/actions/ro-settings";
import { customerDisplayName, formatCents } from "@/lib/format";
import { looksLikePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { type CustomerPrefill } from "@/components/customers/add-customer-dialog";
import { APPOINTMENT_OPTIONS } from "@/lib/options";
import type { RoIntakeConfig, RoIntakeLaborRate } from "@/lib/ro-intake-types";
import type { QuickLaborVehicle } from "@/lib/quick-labor";
import { quickLaborVehicleLabel } from "@/lib/quick-labor";
import {
  clearQuickLaborRoPrefill,
  quickLaborVehicleDetailLine,
  quickLaborVehicleLookupKey,
  readQuickLaborRoPrefill,
} from "@/lib/quick-labor-ro-prefill";

function searchToPrefill(q: string): CustomerPrefill | undefined {
  const s = q.trim();
  if (!s) return undefined;
  if (s.includes("@")) return { email: s };
  if (looksLikePhone(s)) return { phone: s };
  const parts = s.split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function vehicleLabel(v: VehiclePick) {
  const base = [v.year, v.make, v.model, v.trim, v.engine].filter(Boolean).join(" ");
  const plate = v.plate ? ` · ${v.plate}${v.plateState ? ` ${v.plateState}` : ""}` : "";
  return `${base}${plate}` || "Vehicle";
}

/** Compact label for the closed select trigger (avoids overflow). */
function vehicleShortLabel(v: VehiclePick) {
  const ymm = [v.year, v.make, v.model].filter(Boolean).join(" ");
  if (ymm && v.trim) return `${ymm} ${v.trim}`;
  return ymm || "Vehicle";
}

function vehiclePlateLine(v: VehiclePick) {
  if (v.plate) return `${v.plate}${v.plateState ? ` ${v.plateState}` : ""}`;
  return "N/A";
}

const INTAKE_INPUT_CLASS =
  "h-10 rounded-none border-[#d0d5dd] bg-white shadow-none focus-visible:border-brand-light/60 focus-visible:ring-brand-light/25";

const INTAKE_CARD_CLASS = "rounded-none border border-[#eaecf0] bg-white shadow-sm";

function IntakeSectionCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(INTAKE_CARD_CLASS, "p-5")}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-brand-navy text-sm font-semibold text-white">
          {step}
        </div>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function matchVehicleFromQuickLaborPrefill(
  list: VehiclePick[],
  prefill: QuickLaborVehicle,
): VehiclePick | null {
  const key = quickLaborVehicleLookupKey(prefill).toLowerCase().replace(/[\s-]/g, "");
  if (!key) return null;
  return (
    list.find((v) => {
      const plateKey = [v.plate, v.plateState]
        .filter(Boolean)
        .join("")
        .toLowerCase()
        .replace(/[\s-]/g, "");
      const vinKey = v.vin?.toLowerCase().replace(/[\s-]/g, "") ?? "";
      return (
        (plateKey && plateKey.includes(key)) ||
        (vinKey && (vinKey.includes(key) || vinKey.endsWith(key.slice(-8))))
      );
    }) ?? null
  );
}

export function RoIntakeForm({
  config,
  mode = "page",
  initialCustomerId,
  initialVehicleId,
  fromQuickLabor = false,
  onCreated,
  onCancel,
}: {
  config: RoIntakeConfig;
  mode?: "page" | "dialog";
  initialCustomerId?: string;
  initialVehicleId?: string;
  fromQuickLabor?: boolean;
  /** Sheet mode: called after RO is created (before navigation). */
  onCreated?: (roId: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const { leadSources, customerTags, defaultMarketingOptIn, advanced } = config;

  const [laborRates, setLaborRates] = useState<RoIntakeLaborRate[]>(config.laborRates);
  const defaultRateIdx = Math.max(0, laborRates.findIndex((r) => r.isDefault));
  const [laborRateIdx, setLaborRateIdx] = useState<number>(defaultRateIdx);
  const laborRateCents = laborRates[laborRateIdx]?.rateCents ?? laborRates[0]?.rateCents ?? 0;

  const [addRateOpen, setAddRateOpen] = useState(false);
  const [newRateName, setNewRateName] = useState("");
  const [newRateAmount, setNewRateAmount] = useState("");
  const [rateError, setRateError] = useState<string | null>(null);
  const [savingRate, startSaveRate] = useTransition();
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [addVehiclePrefill, setAddVehiclePrefill] = useState("");
  const [vehicleLookupQuery, setVehicleLookupQuery] = useState("");
  const [vehicleLookupState, setVehicleLookupState] = useState("NY");
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<CustomerPick[]>([]);
  const [custOpen, setCustOpen] = useState(false);
  const [searching, startSearch] = useTransition();

  const [vehicles, setVehicles] = useState<VehiclePick[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [loadingVehicles, startLoadVehicles] = useTransition();

  const [mileageIn, setMileageIn] = useState("");
  const [odometerNotWorking, setOdometerNotWorking] = useState(false);
  const [appointmentOption, setAppointmentOption] = useState<string>(APPOINTMENT_OPTIONS[0]);
  const [marketingSource, setMarketingSource] = useState<string>(leadSources[0] ?? "No Source");
  const [concernInput, setConcernInput] = useState("");
  const [concerns, setConcerns] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [laborGuideCarPrefill, setLaborGuideCarPrefill] = useState<QuickLaborVehicle | null>(null);
  const [intakeDetailsOpen, setIntakeDetailsOpen] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();

  const isDialog = mode === "dialog";

  const selectedVehicle = vehicleId
    ? vehicles.find((v) => v.id === vehicleId) ?? null
    : null;

  useEffect(() => {
    if (customer || custQuery.trim().length < 2) {
      setCustResults([]);
      return;
    }
    const t = setTimeout(() => {
      startSearch(async () => {
        try {
          setCustResults(await searchCustomers(custQuery));
        } catch {
          setCustResults([]);
        }
      });
    }, 300);
    return () => clearTimeout(t);
  }, [custQuery, customer]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key === "Enter") {
        e.preventDefault();
        document.getElementById("ro-intake-submit")?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!fromQuickLabor) return;
    const prefill = readQuickLaborRoPrefill();
    if (!prefill) return;
    const lookup = quickLaborVehicleLookupKey(prefill.vehicle);
    if (lookup) setVehicleLookupQuery(lookup);
    if (prefill.vehicle.plateState) setVehicleLookupState(prefill.vehicle.plateState);
    if (prefill.concern) setConcerns([prefill.concern]);
    setLaborGuideCarPrefill(prefill.vehicle);
    clearQuickLaborRoPrefill();
  }, [fromQuickLabor]);

  function loadVehicles(customerId: string, selectId?: string) {
    startLoadVehicles(async () => {
      const list = await getCustomerVehicles(customerId);
      setVehicles(list);
      if (selectId) {
        setVehicleId(selectId);
      } else if (laborGuideCarPrefill) {
        const match = matchVehicleFromQuickLaborPrefill(list, laborGuideCarPrefill);
        if (match) {
          setVehicleId(match.id);
        } else {
          setVehicleId(null);
        }
      } else if (list.length === 1) {
        setVehicleId(list[0]!.id);
      } else {
        setVehicleId(null);
      }
    });
  }

  function selectCustomer(id: string, name: string) {
    setCustomer({ id, name });
    setCustQuery("");
    setCustResults([]);
    setCustOpen(false);
    setVehicleId(null);
    setVehicles([]);
    loadVehicles(id);
  }

  function clearCustomer() {
    setCustomer(null);
    setVehicles([]);
    setVehicleId(null);
  }

  useEffect(() => {
    if (!initialCustomerId || customer) return;
    let cancelled = false;
    void getCustomerPick(initialCustomerId).then((pick) => {
      if (cancelled || !pick) return;
      setCustomer({ id: pick.id, name: customerDisplayName(pick) });
      setCustQuery("");
      setCustResults([]);
      setCustOpen(false);
      startLoadVehicles(async () => {
        const list = await getCustomerVehicles(pick.id);
        if (cancelled) return;
        setVehicles(list);
        if (initialVehicleId && list.some((v) => v.id === initialVehicleId)) {
          setVehicleId(initialVehicleId);
        } else if (laborGuideCarPrefill) {
          const match = matchVehicleFromQuickLaborPrefill(list, laborGuideCarPrefill);
          if (match) setVehicleId(match.id);
          else setVehicleId(null);
        } else if (list.length === 1) {
          setVehicleId(list[0]!.id);
        } else {
          setVehicleId(null);
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [initialCustomerId, initialVehicleId, customer, laborGuideCarPrefill, startLoadVehicles]);

  function selectVehicle(id: string) {
    setVehicleId(id);
  }

  function clearVehicle() {
    setVehicleId(null);
  }

  function onVehicleCreated(id: string) {
    if (!customer) return;
    loadVehicles(customer.id, id);
    setAddVehicleOpen(false);
    setVehicleLookupQuery("");
  }

  function openAddCustomer() {
    setAddCustomerOpen(true);
  }

  function openAddVehicle(raw: string) {
    setAddVehiclePrefill(raw);
    setAddVehicleOpen(true);
  }

  function handleAddVehicleOpenChange(open: boolean) {
    setAddVehicleOpen(open);
    if (!open) setAddVehiclePrefill("");
  }

  const customerPrefill = searchToPrefill(custQuery);

  function addConcern() {
    const c = concernInput.trim().slice(0, 300);
    if (!c) return;
    setConcerns((p) => [...p, c]);
    setConcernInput("");
  }

  function clearAll() {
    setCustomer(null);
    setVehicles([]);
    setVehicleId(null);
    setCustQuery("");
    setCustResults([]);
    setCustOpen(false);
    setMileageIn("");
    setOdometerNotWorking(false);
    setAppointmentOption(APPOINTMENT_OPTIONS[0]);
    setMarketingSource(leadSources[0] ?? "No Source");
    setConcernInput("");
    setConcerns([]);
    setNotes("");
    setError(null);
  }

  function openAddRate() {
    setRateError(null);
    setNewRateName("");
    setNewRateAmount("");
    setAddRateOpen(true);
  }

  function saveNewLaborRate() {
    setRateError(null);
    const name = newRateName.trim();
    if (!name) return setRateError("Enter a name for the rate.");
    if (!newRateAmount.trim()) return setRateError("Enter a valid hourly rate.");
    const amount = Number(newRateAmount);
    if (!Number.isFinite(amount) || amount < 0) return setRateError("Enter a valid hourly rate.");

    const nextRows = [
      ...laborRates.map((r) => ({ name: r.name, rate: r.rateCents / 100, isDefault: r.isDefault })),
      { name, rate: amount, isDefault: laborRates.length === 0 },
    ];
    startSaveRate(async () => {
      const res = await saveLaborRates(nextRows);
      if (!res.ok) return setRateError(res.error);
      const newIndex = nextRows.length - 1;
      setLaborRates(nextRows.map((r) => ({ name: r.name, rateCents: Math.round(r.rate * 100), isDefault: r.isDefault })));
      setLaborRateIdx(newIndex);
      setAddRateOpen(false);
    });
  }

  function submit() {
    setError(null);
    if (!customer) return setError("Select or add a customer.");
    if (!vehicleId) return setError("Select or add a vehicle.");
    if (advanced?.reqOdometer && !odometerNotWorking && !mileageIn.trim()) {
      return setError("Odometer in is required.");
    }
    if (advanced?.reqMarketingSource && !marketingSource.trim()) {
      return setError("Marketing source is required.");
    }
    startCreate(async () => {
      const res = await createRepairOrder({
        customerId: customer.id,
        vehicleId,
        mileageIn: odometerNotWorking ? null : (mileageIn ? Number(mileageIn) : null),
        odometerNotWorking,
        appointmentOption,
        laborRateCents,
        marketingSource,
        concerns,
        notes: notes.trim() || null,
      });
      if (res.ok) {
        onCreated?.(res.id);
        router.push(`/repair-orders/${res.id}/estimate`);
      } else {
        setError(res.error);
      }
    });
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(CRM_HOME_HREF);
  }

  const addVehicleTrigger = (
    <Button
      type="button"
      variant="outline"
      className="h-10 shrink-0 gap-1.5 rounded-none border-[#d0d5dd] text-brand-orange hover:bg-brand-orange/5 hover:text-brand-orange"
      disabled={!customer}
    >
      <Plus className="size-4" /> Add new vehicle
    </Button>
  );

  const sharedAddVehicleDialog = customer ? (
    <AddVehicleDialog
      customerId={customer.id}
      customerName={customer.name}
      onCreated={(id) => onVehicleCreated(id)}
      open={addVehicleOpen}
      onOpenChange={handleAddVehicleOpenChange}
      initialLookup={addVehiclePrefill}
      initialPlateState={vehicleLookupState}
      trigger={addVehicleTrigger}
    />
  ) : (
    addVehicleTrigger
  );

  const selectedLaborRate = laborRates[laborRateIdx];

  const intakeMetaFields = (
    <>
      <div className="space-y-2">
        <Label>Visit type</Label>
        <Select value={appointmentOption} onValueChange={setAppointmentOption}>
          <SelectTrigger className={INTAKE_INPUT_CLASS}>
            <span className="flex items-center gap-2 truncate">
              <Car className="size-4 shrink-0 text-muted-foreground" />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {APPOINTMENT_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Labor rate</Label>
        <Select
          value={String(laborRateIdx)}
          onValueChange={(v) => {
            if (v === "__add__") return openAddRate();
            setLaborRateIdx(Number(v));
          }}
        >
          <SelectTrigger className={INTAKE_INPUT_CLASS}>
            <span className="flex items-center gap-2 truncate">
              <Percent className="size-4 shrink-0 text-muted-foreground" />
              <SelectValue>
                {selectedLaborRate
                  ? `${selectedLaborRate.name} — ${formatCents(selectedLaborRate.rateCents)} /hr`
                  : "Select labor rate"}
              </SelectValue>
            </span>
          </SelectTrigger>
          <SelectContent>
            {laborRates.map((r, i) => (
              <SelectItem key={i} value={String(i)}>
                {r.name} — {formatCents(r.rateCents)} /hr
              </SelectItem>
            ))}
            <SelectItem value="__add__" className="text-brand-orange">
              <span className="flex items-center gap-1.5">
                <Plus className="size-3.5" /> Add new rate…
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>
          Lead source
          {advanced?.reqMarketingSource ? <span className="text-brand-red"> *</span> : null}
        </Label>
        <Select value={marketingSource} onValueChange={setMarketingSource}>
          <SelectTrigger className={INTAKE_INPUT_CLASS}>
            <span className="flex items-center gap-2 truncate">
              <Users className="size-4 shrink-0 text-muted-foreground" />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {leadSources.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <TooltipProvider>
      <div
        data-planned-change="INTAKE-03"
        className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f9fafb]"
      >
        <header className="shrink-0 border-b border-brand-navy/10 bg-gradient-to-r from-brand-navy/[0.06] via-white to-brand-light/[0.08] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-none bg-brand-navy">
                <ClipboardList className="size-5 text-brand-light" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-brand-navy">New repair order</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Find or add a customer and vehicle, capture concerns, then open the estimate.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" disabled className="hidden h-9 rounded-none border-[#d0d5dd] sm:inline-flex">
                <Save className="mr-1.5 size-4" />
                Save draft
              </Button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex size-9 items-center justify-center rounded-none border border-[#d0d5dd] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-stretch">
            <div className="min-w-0 flex-1 space-y-5">
              <IntakeSectionCard
                step={1}
                title="Customer"
                subtitle="Search by name, phone, email, plate, or VIN"
              >
                {customer ? (
                  <div className="flex items-center justify-between rounded-none border border-brand-light/40 bg-brand-light/10 px-3 py-2.5 text-sm">
                    <span className="font-medium text-brand-navy">{customer.name}</span>
                    <button type="button" onClick={clearCustomer} aria-label="Clear customer">
                      <X className="size-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      {searching ? (
                        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                      ) : null}
                      <Input
                        value={custQuery}
                        onChange={(e) => {
                          setCustQuery(e.target.value);
                          setCustOpen(true);
                        }}
                        onFocus={() => setCustOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (custResults[0]) {
                              selectCustomer(custResults[0].id, customerDisplayName(custResults[0]));
                            } else if (custQuery.trim().length >= 2) {
                              openAddCustomer();
                            }
                          }
                        }}
                        placeholder="Search customers…"
                        className={cn(INTAKE_INPUT_CLASS, "pl-9")}
                        autoFocus={isDialog}
                      />
                      {custOpen && custQuery.trim().length >= 2 ? (
                        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-none border border-[#eaecf0] bg-popover shadow-md">
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
                      availableTags={customerTags}
                      defaultMarketingOptIn={defaultMarketingOptIn}
                      prefill={customerPrefill}
                      open={addCustomerOpen}
                      onOpenChange={setAddCustomerOpen}
                      onCreated={(id, name) => selectCustomer(id, name)}
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 shrink-0 gap-1.5 rounded-none border-[#d0d5dd] text-brand-orange hover:bg-brand-orange/5 hover:text-brand-orange"
                        >
                          <Plus className="size-4" /> Add new customer
                        </Button>
                      }
                    />
                  </div>
                )}
              </IntakeSectionCard>

              <IntakeSectionCard
                step={2}
                title="Vehicle"
                subtitle="Select from garage or add with plate/VIN lookup"
              >
                <div className="space-y-3">
                  {laborGuideCarPrefill ? (
                    <div className="rounded-none border border-brand-orange/25 bg-brand-orange/5 px-3 py-2.5 text-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-orange/80">
                        From Labor Book
                      </p>
                      <p className="font-medium text-foreground">{quickLaborVehicleLabel(laborGuideCarPrefill)}</p>
                      {quickLaborVehicleDetailLine(laborGuideCarPrefill) ? (
                        <p className="text-xs text-muted-foreground">
                          {quickLaborVehicleDetailLine(laborGuideCarPrefill)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {loadingVehicles ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Loading vehicles…
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                      <Select
                        value={vehicleId ?? ""}
                        onValueChange={selectVehicle}
                        disabled={!customer || vehicles.length === 0}
                      >
                        <SelectTrigger
                          className={cn(
                            INTAKE_INPUT_CLASS,
                            "w-full min-w-0 flex-1 overflow-hidden whitespace-nowrap [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:truncate",
                          )}
                        >
                          <Car className="size-4 shrink-0 text-muted-foreground" />
                          <SelectValue
                            placeholder={
                              !customer
                                ? "Select a customer first"
                                : vehicles.length === 0
                                  ? "No vehicles — add one"
                                  : "Select a vehicle"
                            }
                          >
                            {selectedVehicle ? vehicleShortLabel(selectedVehicle) : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-w-[min(100vw-2rem,28rem)]">
                          {vehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id} className="whitespace-normal">
                              <span className="line-clamp-2">{vehicleLabel(v)}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {sharedAddVehicleDialog}
                    </div>
                  )}

                  {customer && vehicles.length === 0 && !loadingVehicles ? (
                    <p className="text-xs text-muted-foreground">
                      No vehicles on file — use Add new vehicle or search plate/VIN in the add dialog.
                    </p>
                  ) : null}
                </div>
              </IntakeSectionCard>

              <IntakeSectionCard
                step={3}
                title="Customer concerns"
                subtitle="Add symptoms and requested work"
              >
                <div className="space-y-3">
                  <Textarea
                    value={concernInput}
                    onChange={(e) => setConcernInput(e.target.value.slice(0, 1000))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        addConcern();
                      }
                    }}
                    placeholder="Describe the concern or requested work and press Enter to add"
                    className="min-h-[88px] resize-y rounded-none border-[#d0d5dd] bg-white text-sm shadow-none focus-visible:border-brand-light/60 focus-visible:ring-brand-light/25"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addConcern}
                    className="h-9 gap-1.5 rounded-none border-[#d0d5dd] text-brand-orange hover:bg-brand-orange/5 hover:text-brand-orange"
                  >
                    <Plus className="size-4" /> Add another concern
                  </Button>
                  {concerns.length > 0 ? (
                    <ul className="space-y-1.5">
                      {concerns.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-start justify-between gap-2 rounded-none border border-[#eaecf0] bg-white px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 flex-1">{c}</span>
                          <button
                            type="button"
                            onClick={() => setConcerns((p) => p.filter((_, j) => j !== i))}
                            className="shrink-0 text-muted-foreground hover:text-brand-red"
                            aria-label={`Remove concern ${i + 1}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </IntakeSectionCard>
            </div>

            <aside className="flex w-full shrink-0 lg:w-[320px]">
              <section className={cn(INTAKE_CARD_CLASS, "flex w-full flex-col overflow-hidden border-brand-navy/10")}>
                <button
                  type="button"
                  onClick={() => setIntakeDetailsOpen((v) => !v)}
                  className="flex w-full shrink-0 items-center justify-between gap-2 border-b border-brand-navy/10 bg-brand-navy/[0.04] px-5 py-4 text-left"
                >
                  <span className="flex items-center gap-2 text-base font-semibold text-brand-navy">
                    <Settings className="size-4 text-brand-light" />
                    Intake details
                  </span>
                  {intakeDetailsOpen ? (
                    <ChevronUp className="size-4 text-brand-navy/50" />
                  ) : (
                    <ChevronDown className="size-4 text-brand-navy/50" />
                  )}
                </button>
                {intakeDetailsOpen ? (
                  <div className="flex min-h-0 flex-1 flex-col space-y-4 bg-[#f9fafb] px-5 py-4">
                    <div className="space-y-2">
                      <Label>
                        Odometer in
                        {advanced?.reqOdometer && !odometerNotWorking ? (
                          <span className="text-brand-red"> *</span>
                        ) : null}
                      </Label>
                      <div className="relative">
                        <Gauge className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={mileageIn}
                          onChange={(e) => setMileageIn(e.target.value.replace(/\D/g, ""))}
                          placeholder="Miles at drop-off"
                          inputMode="numeric"
                          disabled={odometerNotWorking}
                          className={cn(INTAKE_INPUT_CLASS, "pl-9 pr-10", odometerNotWorking && "bg-muted/40")}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          mi
                        </span>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id="odometer-not-working"
                          checked={odometerNotWorking}
                          onCheckedChange={(v) => {
                            setOdometerNotWorking(!!v);
                            if (v) setMileageIn("");
                          }}
                          className="border-[#d0d5dd] data-[state=checked]:border-brand-orange data-[state=checked]:bg-brand-orange"
                        />
                        <span>Odometer not working</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <Info className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Skip when gauge is broken or unreadable.</TooltipContent>
                        </Tooltip>
                      </label>
                    </div>

                    {intakeMetaFields}

                    <div className="flex min-h-0 flex-1 flex-col space-y-2">
                      <Label htmlFor="intake-notes">Notes (optional)</Label>
                      <Textarea
                        id="intake-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                        placeholder="Add any notes about this visit…"
                        className="min-h-[72px] flex-1 resize-y rounded-none border-[#d0d5dd] bg-white text-sm shadow-none focus-visible:border-brand-light/60 focus-visible:ring-brand-light/25"
                      />
                      <p className="text-xs text-muted-foreground">
                        Internal notes are not visible to the customer.
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>
            </aside>
          </div>
        </div>

        <footer className="shrink-0 border-t border-[#eaecf0] bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-navy/70 transition-colors hover:text-brand-navy"
            >
              <RotateCcw className="size-4" />
              Clear all
            </button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              {error ? <p className="text-sm text-brand-red sm:mr-2">{error}</p> : null}
              <Button variant="outline" onClick={handleCancel} disabled={creating} className="h-10 rounded-none">
                Cancel
              </Button>
              <Button
                id="ro-intake-submit"
                className="h-10 gap-2 rounded-none bg-brand-orange px-5 text-white hover:bg-brand-orange/90"
                onClick={submit}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ClipboardList className="size-4" />
                )}
                Create repair order
              </Button>
            </div>
          </div>
        </footer>
      </div>
      <Dialog open={addRateOpen} onOpenChange={setAddRateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add labor rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-rate-name">Rate name</Label>
              <Input
                id="new-rate-name"
                placeholder="e.g. Diagnostic, Fleet, Premium"
                value={newRateName}
                onChange={(e) => setNewRateName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-rate-amount">Hourly rate</Label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  id="new-rate-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="150.00"
                  value={newRateAmount}
                  onChange={(e) => setNewRateAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveNewLaborRate();
                  }}
                />
              </div>
            </div>
            {rateError ? <p className="text-sm text-destructive">{rateError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRateOpen(false)} disabled={savingRate}>
              Cancel
            </Button>
            <Button onClick={saveNewLaborRate} disabled={savingRate} className="bg-brand-orange hover:bg-brand-orange/90">
              {savingRate ? <Loader2 className="size-4 animate-spin" /> : null}
              Save rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
