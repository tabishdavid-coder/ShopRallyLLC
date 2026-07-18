"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Car,
  Check,
  ChevronDown,
  Flag,
  Loader2,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerSearchResults } from "@/components/customers/customer-search-results";
import {
  commitSmartRoIntake,
  parseSmartRoIntake,
} from "@/server/actions/smart-ro-intake";
import {
  searchCustomers,
  getCustomerVehicles,
} from "@/server/actions/pickers";
import type { CustomerPick, VehiclePick } from "@/lib/picker-types";
import type { RoIntakeConfig } from "@/lib/ro-intake-types";
import {
  defaultLaborRateCents,
  formatLaborCost,
  isLowConfidence,
  type SmartRoLaborLine,
  type SmartRoStagingState,
} from "@/lib/smart-ro-intake-types";
import { formatPhoneInput } from "@/lib/phone";
import { customerDisplayName } from "@/lib/format";
import { cn } from "@/lib/utils";

type Step = "input" | "staging";

/** Same common options as create-vehicle / Add Vehicle flows. */
const TRANSMISSION_OPTIONS = ["Automatic", "Manual", "CVT", "Dual-Clutch", "Other"] as const;

function nullFieldClass(isNull: boolean): string {
  return isNull
    ? "border-amber-400 bg-amber-50/80 ring-1 ring-amber-300/60 focus-visible:ring-amber-500"
    : "";
}

function ConfidenceFlag({ score, label }: { score: number; label?: string }) {
  if (!isLowConfidence(score)) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
      title={`Confidence ${score}% — verify before submitting`}
    >
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
      {label ?? `Verify (${score}%)`}
    </span>
  );
}

function laborLineFlagged(line: SmartRoLaborLine): boolean {
  return line.flagged ?? isLowConfidence(line.confidence_score);
}

export function SmartRoIntakeDialog({
  open,
  onOpenChange,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: RoIntakeConfig;
}) {
  const router = useRouter();
  const defaultRateCents = useMemo(
    () => defaultLaborRateCents(config.laborRates),
    [config.laborRates],
  );
  const [laborRateCents, setLaborRateCents] = useState(defaultRateCents);
  const [customRateDollars, setCustomRateDollars] = useState("");
  const [rateMenuOpen, setRateMenuOpen] = useState(false);
  const laborRateLabel = `$${(laborRateCents / 100).toFixed(2)}/hr`;

  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [staging, setStaging] = useState<SmartRoStagingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState<CustomerPick[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPick | null>(null);
  const [vehicles, setVehicles] = useState<VehiclePick[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [createNewVehicle, setCreateNewVehicle] = useState(true);
  const [pending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);

  const transmissionOptions = useMemo(() => {
    const decoded = staging?.vehicle.transmission?.trim();
    const opts = [...TRANSMISSION_OPTIONS] as string[];
    if (decoded && !opts.includes(decoded)) opts.unshift(decoded);
    return opts;
  }, [staging?.vehicle.transmission]);

  const reset = useCallback(() => {
    setStep("input");
    setText("");
    setStaging(null);
    setError(null);
    setCustomerQuery("");
    setCustomerHits([]);
    setSelectedCustomer(null);
    setVehicles([]);
    setVehicleId(null);
    setCreateNewVehicle(true);
    setLaborRateCents(defaultRateCents);
    setCustomRateDollars("");
    setRateMenuOpen(false);
  }, [defaultRateCents]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!customerQuery.trim() || customerQuery.trim().length < 2) {
      setCustomerHits([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      void searchCustomers(customerQuery).then((hits) => {
        setCustomerHits(hits);
        setSearching(false);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [customerQuery]);

  useEffect(() => {
    if (!selectedCustomer) {
      setVehicles([]);
      setVehicleId(null);
      return;
    }
    void getCustomerVehicles(selectedCustomer.id).then((list) => {
      setVehicles(list);
      if (!staging?.vehicle) return;
      const v = staging.vehicle;
      const match = list.find(
        (veh) =>
          (v.year && veh.year === v.year && veh.make === v.make && veh.model === v.model),
      );
      if (match) {
        setVehicleId(match.id);
        setCreateNewVehicle(false);
      } else {
        setCreateNewVehicle(true);
        setVehicleId(null);
      }
    });
  }, [selectedCustomer, staging?.vehicle]);

  function updateCustomer<K extends keyof SmartRoStagingState["customer"]>(
    key: K,
    value: SmartRoStagingState["customer"][K],
  ) {
    setStaging((prev) =>
      prev ? { ...prev, customer: { ...prev.customer, [key]: value } } : prev,
    );
  }

  function updateVehicle<K extends keyof SmartRoStagingState["vehicle"]>(
    key: K,
    value: SmartRoStagingState["vehicle"][K],
  ) {
    setStaging((prev) =>
      prev ? { ...prev, vehicle: { ...prev.vehicle, [key]: value } } : prev,
    );
  }

  function updateLaborLine(index: number, patch: Partial<SmartRoLaborLine>) {
    setStaging((prev) => {
      if (!prev) return prev;
      const laborLines = prev.laborLines.map((line, i) =>
        i === index ? { ...line, ...patch } : line,
      );
      return { ...prev, laborLines };
    });
  }

  function onParse() {
    setError(null);
    startTransition(async () => {
      const res = await parseSmartRoIntake({ text });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStaging(res.staging);
      setLaborRateCents(defaultRateCents);
      setCustomRateDollars((defaultRateCents / 100).toFixed(2));
      setStep("staging");
      const c = res.staging.customer;
      const q = c.phone || c.email || c.name || "";
      if (q) setCustomerQuery(q);
    });
  }

  function onGenerateEstimate() {
    if (!staging) return;
    const v = staging.vehicle;
    if (!v.year || !v.make?.trim() || !v.model?.trim()) {
      setError("Complete vehicle year, make, and model before generating the estimate.");
      return;
    }
    if (!staging.customer.name?.trim() && !staging.customer.phone?.trim() && !staging.customer.email?.trim() && !selectedCustomer) {
      setError("Add customer name, phone, or email — or select an existing customer.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await commitSmartRoIntake({
        rawText: staging.rawText,
        customer: staging.customer,
        vehicle: staging.vehicle,
        laborLines: staging.laborLines,
        laborRateCents,
        customerId: selectedCustomer?.id,
        vehicleId: vehicleId ?? undefined,
        createVehicle: createNewVehicle || !vehicleId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onOpenChange(false);
      router.push(`/repair-orders/${res.id}/estimate`);
      router.refresh();
    });
  }

  const totalLaborCents = staging
    ? staging.laborLines.reduce(
        (sum, line) => sum + Math.round(line.estimated_hours * laborRateCents),
        0,
      )
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[92vh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0",
          step === "staging" ? "sm:max-w-5xl lg:max-w-6xl" : "sm:max-w-xl",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border/80 bg-white px-5 py-3.5 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-brand-navy">
            <Sparkles className="size-5 text-brand-orange" aria-hidden />
            Smart AI Intake
          </DialogTitle>
          <DialogDescription>
            {step === "input"
              ? "Describe the customer, vehicle, and requested work in plain language."
              : "Review and correct AI-extracted data. Highlighted fields need your attention."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F9FC] px-5 py-4 sm:px-6">
          {error ? (
            <p className="mb-4 break-words rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {step === "input" ? (
            <div className="space-y-3 rounded-xl border border-border/80 bg-white p-4">
              <Label htmlFor="smart-ro-text">Intake notes</Label>
              <Textarea
                id="smart-ro-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='e.g. "Maria 718-555-0199 — 2018 Honda Accord EX, oil change and front brakes grinding, about 62k miles"'
                rows={8}
                className="min-h-[180px] resize-y bg-white"
              />
              <p className="text-xs text-muted-foreground">
                VINs are decoded via free NHTSA for car details and more accurate labor hours. Gemini
                returns hours only — shop rate ({laborRateLabel}) is applied on the review screen.
              </p>
            </div>
          ) : staging ? (
            <div className="space-y-4">
              {/* Customer + Vehicle — side by side on wide screens */}
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="space-y-3 rounded-xl border border-border/80 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-brand-navy" aria-hidden />
                    <h3 className="font-semibold text-brand-navy">Customer</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      <Label htmlFor="cust-name">Name</Label>
                      <Input
                        id="cust-name"
                        value={staging.customer.name ?? ""}
                        onChange={(e) => updateCustomer("name", e.target.value || null)}
                        placeholder="Add customer name"
                        className={nullFieldClass(!staging.customer.name)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="cust-phone">Phone</Label>
                      <Input
                        id="cust-phone"
                        inputMode="tel"
                        value={staging.customer.phone ?? ""}
                        onChange={(e) =>
                          updateCustomer("phone", formatPhoneInput(e.target.value) || null)
                        }
                        placeholder="518-555-0199"
                        className={nullFieldClass(!staging.customer.phone)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="cust-email">Email</Label>
                      <Input
                        id="cust-email"
                        type="email"
                        value={staging.customer.email ?? ""}
                        onChange={(e) => updateCustomer("email", e.target.value || null)}
                        placeholder="Add email"
                        className={nullFieldClass(!staging.customer.email)}
                      />
                    </div>
                  </div>

                  <div className="border-t border-border/70 pt-3">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Match existing customer (optional)
                    </Label>
                    <Input
                      className="mt-1.5"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      placeholder="Search by name, phone, or email"
                    />
                    {searching ? (
                      <p className="mt-2 text-xs text-muted-foreground">Searching…</p>
                    ) : customerHits.length > 0 ? (
                      <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border">
                        <CustomerSearchResults
                          results={customerHits}
                          searching={searching}
                          query={customerQuery}
                          onSelect={(c) => {
                            setSelectedCustomer(c);
                            setCustomerQuery(customerDisplayName(c));
                          }}
                        />
                      </div>
                    ) : null}
                    {selectedCustomer ? (
                      <p className="mt-2 text-sm text-emerald-800">
                        Using existing: <strong>{customerDisplayName(selectedCustomer)}</strong>
                        <Button
                          type="button"
                          variant="link"
                          className="ml-2 h-auto p-0 text-xs"
                          onClick={() => setSelectedCustomer(null)}
                        >
                          Clear
                        </Button>
                      </p>
                    ) : staging.suggestedCustomerIds.length > 0 ? (
                      <p className="mt-2 text-xs text-amber-800">
                        Possible duplicate — search and select a matching profile to avoid creating a
                        new customer.
                      </p>
                    ) : null}
                  </div>
                </section>

                <section
                  className={cn(
                    "space-y-3 rounded-xl border p-4 shadow-sm",
                    isLowConfidence(staging.vehicle.confidence_score)
                      ? "border-red-300 bg-red-50/40"
                      : "border-border/80 bg-white",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Car className="size-4 text-brand-navy" aria-hidden />
                      <h3 className="font-semibold text-brand-navy">Vehicle</h3>
                    </div>
                    <ConfidenceFlag score={staging.vehicle.confidence_score} label="Verify vehicle" />
                  </div>
                  {staging.vehicle.vinDecoded ? (
                    <p className="text-xs text-emerald-800">
                      VIN decoded via NHTSA — year/make/model applied for car details and labor
                      estimates.
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="col-span-2 sm:col-span-3">
                      <Label htmlFor="veh-vin">VIN</Label>
                      <Input
                        id="veh-vin"
                        value={staging.vehicle.vin ?? ""}
                        onChange={(e) =>
                          updateVehicle("vin", e.target.value.trim().toUpperCase() || null)
                        }
                        placeholder="17-character VIN"
                        maxLength={17}
                        className={cn(
                          "font-mono tracking-wide",
                          nullFieldClass(!staging.vehicle.vin),
                        )}
                      />
                    </div>
                    <div>
                      <Label htmlFor="veh-year">Year</Label>
                      <Input
                        id="veh-year"
                        type="number"
                        value={staging.vehicle.year ?? ""}
                        onChange={(e) =>
                          updateVehicle(
                            "year",
                            e.target.value ? parseInt(e.target.value, 10) : null,
                          )
                        }
                        placeholder="Year"
                        className={nullFieldClass(staging.vehicle.year == null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="veh-make">Make</Label>
                      <Input
                        id="veh-make"
                        value={staging.vehicle.make ?? ""}
                        onChange={(e) => updateVehicle("make", e.target.value || null)}
                        placeholder="Make"
                        className={nullFieldClass(!staging.vehicle.make)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="veh-model">Model</Label>
                      <Input
                        id="veh-model"
                        value={staging.vehicle.model ?? ""}
                        onChange={(e) => updateVehicle("model", e.target.value || null)}
                        placeholder="Model"
                        className={nullFieldClass(!staging.vehicle.model)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="veh-trim">Trim</Label>
                      <Input
                        id="veh-trim"
                        value={staging.vehicle.trim ?? ""}
                        onChange={(e) => updateVehicle("trim", e.target.value || null)}
                        placeholder="Add trim"
                        className={nullFieldClass(!staging.vehicle.trim)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="veh-engine">Engine</Label>
                      <Input
                        id="veh-engine"
                        value={staging.vehicle.engine ?? ""}
                        onChange={(e) => updateVehicle("engine", e.target.value || null)}
                        placeholder="Add engine"
                        className={nullFieldClass(!staging.vehicle.engine)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="veh-trans">Transmission</Label>
                      <Select
                        value={staging.vehicle.transmission?.trim() || "__none__"}
                        onValueChange={(v) =>
                          updateVehicle("transmission", v === "__none__" ? null : v)
                        }
                      >
                        <SelectTrigger
                          id="veh-trans"
                          className={nullFieldClass(!staging.vehicle.transmission)}
                        >
                          <SelectValue placeholder="Select transmission" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Not set</SelectItem>
                          {transmissionOptions.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedCustomer && vehicles.length > 0 ? (
                    <div className="border-t border-border/70 pt-3">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Customer vehicles
                      </Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {vehicles.map((veh) => (
                          <Button
                            key={veh.id}
                            type="button"
                            size="sm"
                            variant={vehicleId === veh.id && !createNewVehicle ? "default" : "outline"}
                            onClick={() => {
                              setVehicleId(veh.id);
                              setCreateNewVehicle(false);
                            }}
                          >
                            {[veh.year, veh.make, veh.model].filter(Boolean).join(" ")}
                          </Button>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant={createNewVehicle ? "default" : "outline"}
                          onClick={() => {
                            setCreateNewVehicle(true);
                            setVehicleId(null);
                          }}
                        >
                          + New from parsed data
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>

              {/* Labor lines — horizontal grid rows */}
              <section className="overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="size-4 text-brand-navy" aria-hidden />
                    <h3 className="font-semibold text-brand-navy">Labor lines</h3>
                    <DropdownMenu open={rateMenuOpen} onOpenChange={setRateMenuOpen}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40"
                          title="Change labor rate"
                        >
                          <Badge
                            variant="secondary"
                            className="inline-flex cursor-pointer items-center text-xs hover:bg-secondary/80"
                          >
                            Rate: {laborRateLabel}
                            <ChevronDown className="ml-1 size-3 opacity-70" aria-hidden />
                          </Badge>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel>Shop labor rates</DropdownMenuLabel>
                        {config.laborRates.map((r, i) => (
                          <DropdownMenuItem
                            key={`${r.name}-${r.rateCents}-${i}`}
                            onClick={() => {
                              setLaborRateCents(r.rateCents);
                              setCustomRateDollars((r.rateCents / 100).toFixed(2));
                            }}
                          >
                            <Check
                              className={cn(
                                "size-3.5 shrink-0",
                                laborRateCents === r.rateCents ? "opacity-100" : "opacity-0",
                              )}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {r.name}
                              {r.isDefault ? " (default)" : ""}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              ${(r.rateCents / 100).toFixed(2)}/hr
                            </span>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5" onKeyDown={(e) => e.stopPropagation()}>
                          <Label htmlFor="smart-custom-rate" className="text-xs text-muted-foreground">
                            Custom $/hr
                          </Label>
                          <div className="mt-1 flex items-center gap-2">
                            <Input
                              id="smart-custom-rate"
                              type="number"
                              min={1}
                              step={0.01}
                              value={customRateDollars}
                              onChange={(e) => setCustomRateDollars(e.target.value)}
                              className="h-8"
                              placeholder="125.00"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 shrink-0 bg-brand-navy"
                              onClick={() => {
                                const dollars = parseFloat(customRateDollars);
                                if (!Number.isFinite(dollars) || dollars <= 0) return;
                                const cents = Math.round(dollars * 100);
                                setLaborRateCents(cents);
                                setCustomRateDollars((cents / 100).toFixed(2));
                                setRateMenuOpen(false);
                              }}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-brand-navy">
                    Est. total ${(totalLaborCents / 100).toFixed(2)}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <div
                    className="grid min-w-[720px] gap-x-3 border-b border-border/60 bg-[#F0F3F8] px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1.8fr) 5.5rem 7.5rem 6.5rem" }}
                  >
                    <span>Task</span>
                    <span>Description</span>
                    <span className="text-right">Hours</span>
                    <span className="text-right">Amount</span>
                    <span className="text-center">Flag</span>
                  </div>
                  <ul>
                    {staging.laborLines.map((line, index) => {
                      const flagged = laborLineFlagged(line);
                      const aiLow = isLowConfidence(line.confidence_score);
                      return (
                        <li
                          key={index}
                          className={cn(
                            "grid min-w-[720px] items-start gap-x-3 border-b border-dashed border-border/60 px-4 py-2.5 last:border-b-0",
                            flagged ? "bg-amber-50/70" : "bg-white",
                          )}
                          style={{
                            gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1.8fr) 5.5rem 7.5rem 6.5rem",
                          }}
                        >
                          <div className="min-w-0">
                            <Label className="sr-only">Task title</Label>
                            <Input
                              value={line.task_title}
                              onChange={(e) =>
                                updateLaborLine(index, { task_title: e.target.value })
                              }
                              className="h-9"
                            />
                          </div>
                          <div className="min-w-0">
                            <Label className="sr-only">Description</Label>
                            <Textarea
                              value={line.description}
                              onChange={(e) =>
                                updateLaborLine(index, { description: e.target.value })
                              }
                              rows={2}
                              className="min-h-9 resize-y py-2 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="sr-only">Estimated hours</Label>
                            <Input
                              type="number"
                              min={0.1}
                              step={0.1}
                              value={line.estimated_hours}
                              onChange={(e) =>
                                updateLaborLine(index, {
                                  estimated_hours: parseFloat(e.target.value) || 0.1,
                                })
                              }
                              className="h-9 text-right tabular-nums"
                            />
                          </div>
                          <div className="flex h-9 items-center justify-end">
                            <span className="text-sm font-semibold tabular-nums text-brand-navy">
                              {formatLaborCost(line.estimated_hours, laborRateCents)}
                            </span>
                          </div>
                          <div className="flex h-9 flex-col items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateLaborLine(index, { flagged: !flagged })
                              }
                              className={cn(
                                "inline-flex h-8 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors",
                                flagged
                                  ? "border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200/80"
                                  : "border-border bg-white text-muted-foreground hover:border-brand-navy/30 hover:text-brand-navy",
                              )}
                              title={
                                flagged
                                  ? aiLow
                                    ? `Clear review flag (AI confidence ${line.confidence_score}%)`
                                    : "Clear review flag"
                                  : "Flag this line for review"
                              }
                              aria-pressed={flagged}
                              aria-label={flagged ? "Clear flag" : "Flag for review"}
                            >
                              <Flag
                                className={cn("size-3.5", flagged && "fill-current")}
                                aria-hidden
                              />
                              {flagged ? "Flagged" : "Flag"}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t bg-white px-5 py-3.5 sm:px-6">
          {step === "input" ? (
            <>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-brand-navy"
                disabled={pending || text.trim().length < 8}
                onClick={onParse}
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Parsing…
                  </>
                ) : (
                  "Parse with AI"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => setStep("input")} disabled={pending}>
                Back
              </Button>
              <Button
                type="button"
                className="bg-brand-navy"
                disabled={pending}
                onClick={onGenerateEstimate}
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Creating…
                  </>
                ) : (
                  "Generate estimate"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
