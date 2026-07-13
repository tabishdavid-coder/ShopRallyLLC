"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Car,
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
import { customerDisplayName } from "@/lib/format";
import { cn } from "@/lib/utils";

type Step = "input" | "staging";

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
  const laborRateCents = useMemo(() => defaultLaborRateCents(config.laborRates), [config.laborRates]);
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
  }, []);

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
          "flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0",
          step === "staging" ? "max-w-3xl" : "max-w-xl",
        )}
      >
        <DialogHeader className="border-b px-6 py-4">
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

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error ? (
            <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {step === "input" ? (
            <div className="space-y-3">
              <Label htmlFor="smart-ro-text">Intake notes</Label>
              <Textarea
                id="smart-ro-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='e.g. "Maria 718-555-0199 — 2018 Honda Accord EX, oil change and front brakes grinding, about 62k miles"'
                rows={8}
                className="min-h-[180px] resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Gemini returns labor hours only — shop rate ({laborRateLabel}) is applied on the review
                screen.
              </p>
            </div>
          ) : staging ? (
            <div className="space-y-6">
              {/* Customer */}
              <section className="space-y-3 rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-brand-navy" aria-hidden />
                  <h3 className="font-semibold text-brand-navy">Customer</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <Label htmlFor="cust-name">Name</Label>
                    <Input
                      id="cust-name"
                      value={staging.customer.name ?? ""}
                      onChange={(e) => updateCustomer("name", e.target.value || null)}
                      placeholder="Add customer name"
                      className={nullFieldClass(!staging.customer.name)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cust-phone">Phone</Label>
                    <Input
                      id="cust-phone"
                      value={staging.customer.phone ?? ""}
                      onChange={(e) => updateCustomer("phone", e.target.value || null)}
                      placeholder="Add phone"
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

                <div className="border-t pt-3">
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
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border">
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

              {/* Vehicle */}
              <section
                className={cn(
                  "space-y-3 rounded-xl border p-4",
                  isLowConfidence(staging.vehicle.confidence_score)
                    ? "border-red-300 bg-red-50/40"
                    : "bg-card",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Car className="size-4 text-brand-navy" aria-hidden />
                    <h3 className="font-semibold text-brand-navy">Vehicle</h3>
                  </div>
                  <ConfidenceFlag score={staging.vehicle.confidence_score} label="Verify vehicle" />
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
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
                  <div className="sm:col-span-4">
                    <Label htmlFor="veh-engine">Engine</Label>
                    <Input
                      id="veh-engine"
                      value={staging.vehicle.engine ?? ""}
                      onChange={(e) => updateVehicle("engine", e.target.value || null)}
                      placeholder="Add engine"
                      className={nullFieldClass(!staging.vehicle.engine)}
                    />
                  </div>
                </div>

                {selectedCustomer && vehicles.length > 0 ? (
                  <div className="border-t pt-3">
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

              {/* Labor lines */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wrench className="size-4 text-brand-navy" aria-hidden />
                  <h3 className="font-semibold text-brand-navy">Labor lines</h3>
                  <Badge variant="secondary" className="text-xs">
                    Rate: {laborRateLabel}
                  </Badge>
                </div>
                <ul className="space-y-3">
                  {staging.laborLines.map((line, index) => {
                    const low = isLowConfidence(line.confidence_score);
                    return (
                      <li
                        key={index}
                        className={cn(
                          "rounded-xl border p-4",
                          low ? "border-red-300 bg-red-50/40" : "bg-card",
                        )}
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <ConfidenceFlag score={line.confidence_score} label="Verify labor" />
                          <span className="text-sm font-semibold tabular-nums text-brand-navy">
                            {formatLaborCost(line.estimated_hours, laborRateCents)}
                            <span className="ml-1 font-normal text-muted-foreground">
                              ({line.estimated_hours} hr × {laborRateLabel})
                            </span>
                          </span>
                        </div>
                        <div className="grid gap-3">
                          <div>
                            <Label>Task title</Label>
                            <Input
                              value={line.task_title}
                              onChange={(e) =>
                                updateLaborLine(index, { task_title: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea
                              value={line.description}
                              onChange={(e) =>
                                updateLaborLine(index, { description: e.target.value })
                              }
                              rows={2}
                            />
                          </div>
                          <div className="max-w-[160px]">
                            <Label>Estimated hours</Label>
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
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-end rounded-lg bg-brand-navy/5 px-4 py-3">
                  <p className="text-sm font-semibold text-brand-navy">
                    Estimated labor total:{" "}
                    <span className="tabular-nums">${(totalLaborCents / 100).toFixed(2)}</span>
                  </p>
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t px-6 py-4">
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
