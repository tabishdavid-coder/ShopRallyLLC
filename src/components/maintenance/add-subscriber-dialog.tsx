"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  Search,
  User,
  UserPlus,
  X,
} from "lucide-react";

import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { CustomerSearchResults } from "@/components/customers/customer-search-results";
import { AddVehicleDialog } from "@/components/vehicles/add-vehicle-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customerDisplayName, formatCents } from "@/lib/format";
import {
  formatPlanPriceOptions,
  resolvePlanPricing,
  VEHICLE_CLASS_LABELS,
  VEHICLE_CLASSES,
} from "@/lib/maintenance-programs";
import { searchQueryToCustomerPrefill } from "@/lib/customer-search";
import type { CustomerPick, VehiclePick } from "@/lib/picker-types";
import type { MaintenanceVehicleClass } from "@/generated/prisma";
import { enrollSubscriberInShop } from "@/server/actions/maintenance-subscriptions";
import { searchCustomers, getCustomerVehicles } from "@/server/actions/pickers";
import { cn } from "@/lib/utils";

export type EnrollPlanOption = {
  id: string;
  name: string;
  tagline: string | null;
  useClassPricing: boolean;
  retailCents: number | null;
  payInFullCents: number | null;
  monthlyCents: number | null;
  annualCents: number | null;
  monthlyTermMonths: number | null;
  classPrices: {
    vehicleClass: MaintenanceVehicleClass;
    payInFullCents: number | null;
    monthlyCents: number | null;
    annualCents: number | null;
    surchargeCents: number | null;
  }[];
};

type Step = "customer" | "vehicle" | "plan" | "payment" | "review" | "done";

const STEPS: Step[] = ["customer", "vehicle", "plan", "payment", "review"];

const STEP_LABELS: Record<Step, string> = {
  customer: "Customer",
  vehicle: "Vehicle",
  plan: "Plan",
  payment: "Payment",
  review: "Review",
  done: "Done",
};

function vehicleLabel(v: VehiclePick) {
  const base = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  const plate = v.plate ? ` · ${v.plate}${v.plateState ? ` ${v.plateState}` : ""}` : "";
  return `${base}${plate}` || "Vehicle";
}

type StaffPaymentMode = "PAY_IN_FULL" | "MONTHLY" | "MANUAL";

export function AddSubscriberDialog({
  plans,
  trigger,
}: {
  plans: EnrollPlanOption[];
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("customer");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [customer, setCustomer] = useState<CustomerPick | null>(null);
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<CustomerPick[]>([]);
  const [custOpen, setCustOpen] = useState(false);
  const [searching, startSearch] = useTransition();
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);

  const [vehicles, setVehicles] = useState<VehiclePick[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [loadingVehicles, startLoadVehicles] = useTransition();

  const [planId, setPlanId] = useState<string | null>(null);
  const [vehicleClass, setVehicleClass] = useState<MaintenanceVehicleClass>("CAR");
  const [paymentMode, setPaymentMode] = useState<StaffPaymentMode>("PAY_IN_FULL");

  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const selectedPlan = planId ? plans.find((p) => p.id === planId) ?? null : null;
  const selectedVehicle = vehicleId ? vehicles.find((v) => v.id === vehicleId) ?? null : null;

  const pricing = useMemo(
    () =>
      selectedPlan
        ? resolvePlanPricing(
            selectedPlan,
            selectedPlan.useClassPricing ? vehicleClass : null,
          )
        : null,
    [selectedPlan, vehicleClass],
  );

  const stepIndex = STEPS.indexOf(step as (typeof STEPS)[number]);

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

  function reset() {
    setStep("customer");
    setError(null);
    setCustomer(null);
    setCustQuery("");
    setCustResults([]);
    setCustOpen(false);
    setVehicles([]);
    setVehicleId(null);
    setPlanId(null);
    setVehicleClass("CAR");
    setPaymentMode("PAY_IN_FULL");
    setSubscriptionId(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function loadVehicles(customerId: string, selectId?: string) {
    startLoadVehicles(async () => {
      try {
        const list = await getCustomerVehicles(customerId);
        setVehicles(list ?? []);
        if (selectId) setVehicleId(selectId);
        else if (list.length === 1) setVehicleId(list[0]!.id);
        else setVehicleId(null);
      } catch {
        setVehicles([]);
        setVehicleId(null);
        setError("Could not load vehicles. Try again.");
      }
    });
  }

  function selectCustomer(c: CustomerPick) {
    setCustomer(c);
    setCustQuery("");
    setCustResults([]);
    setCustOpen(false);
    setVehicleId(null);
    setVehicles([]);
    loadVehicles(c.id);
  }

  function openAddCustomer() {
    setAddCustomerOpen(true);
  }

  function clearCustomer() {
    setCustomer(null);
    setVehicles([]);
    setVehicleId(null);
  }

  function next() {
    setError(null);
    if (step === "customer") {
      if (!customer) {
        setError("Select or add a customer.");
        return;
      }
      setStep("vehicle");
    } else if (step === "vehicle") {
      if (!vehicleId) {
        setError("Select or add a vehicle.");
        return;
      }
      setStep("plan");
    } else if (step === "plan") {
      if (!planId) {
        setError("Select a maintenance plan.");
        return;
      }
      setStep("payment");
    } else if (step === "payment") {
      setStep("review");
    }
  }

  function back() {
    setError(null);
    if (step === "vehicle") setStep("customer");
    else if (step === "plan") setStep("vehicle");
    else if (step === "payment") setStep("plan");
    else if (step === "review") setStep("payment");
  }

  function enroll() {
    if (!customer || !vehicleId || !planId) return;
    setError(null);
    start(async () => {
      const res = await enrollSubscriberInShop({
        planId,
        customerId: customer.id,
        vehicleId,
        paymentMode,
        vehicleClass: selectedPlan?.useClassPricing ? vehicleClass : undefined,
      });
      if (res.ok) {
        setSubscriptionId(res.subscriptionId ?? null);
        setStep("done");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const amountCents =
    paymentMode === "MONTHLY"
      ? (pricing?.monthlyCents ?? 0)
      : paymentMode === "MANUAL"
        ? 0
        : (pricing?.payInFullCents ?? pricing?.annualCents ?? 0);

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button className="gap-1.5 bg-brand-navy" onClick={() => setOpen(true)}>
          <UserPlus className="size-4" />
          Add subscriber
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll subscriber</DialogTitle>
          </DialogHeader>

          {step !== "done" ? (
            <ol className="flex gap-1 text-[10px] font-medium uppercase tracking-wide">
              {STEPS.map((s, i) => (
                <li
                  key={s}
                  className={cn(
                    "flex-1 rounded-full px-2 py-1 text-center",
                    i <= stepIndex
                      ? "bg-brand-navy text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {STEP_LABELS[s]}
                </li>
              ))}
            </ol>
          ) : null}

          {step === "customer" ? (
            <div className="space-y-3">
              {customer ? (
                <div className="flex items-center justify-between rounded-lg border bg-brand-light/10 px-3 py-2.5">
                  <div>
                    <p className="font-medium">{customerDisplayName(customer)}</p>
                    <p className="text-xs text-on-brand-wash">
                      {[customer.phone, customer.email].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={clearCustomer}>
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="sub-cust-search">Find customer</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="sub-cust-search"
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
                          selectCustomer(custResults[0]);
                        } else if (custQuery.trim().length >= 2) {
                          openAddCustomer();
                        }
                      }}
                      placeholder="Name, phone, email, plate, or VIN"
                      className="pl-9"
                      autoComplete="off"
                    />
                  </div>
                  {custOpen && custQuery.trim().length >= 2 ? (
                    <div className="max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-md">
                      <CustomerSearchResults
                        results={custResults}
                        searching={searching}
                        query={custQuery}
                        onSelect={selectCustomer}
                        onAddNew={openAddCustomer}
                      />
                    </div>
                  ) : null}
                  <AddCustomerDialog
                    prefill={searchQueryToCustomerPrefill(custQuery)}
                    open={addCustomerOpen}
                    onOpenChange={setAddCustomerOpen}
                    onCreated={(id, name) => {
                      selectCustomer({
                        id,
                        firstName: name.split(" ")[0] ?? "",
                        lastName: name.split(" ").slice(1).join(" ") ?? "",
                        company: null,
                        phone: null,
                        email: null,
                        roCount: 0,
                        lastVisitAt: null,
                        vehicleHint: null,
                      });
                    }}
                    trigger={
                      <Button type="button" variant="outline" size="sm" className="gap-1.5">
                        <UserPlus className="size-3.5" />
                        Add new customer
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          ) : null}

          {step === "vehicle" ? (
            <div className="space-y-3">
              <p className="text-xs rounded-md border bg-brand-light/10 px-3 py-2 text-on-brand-wash">
                Maintenance plans are locked to one vehicle. Benefits cannot be transferred — void
                and re-enroll to change vehicles.
              </p>
              {loadingVehicles ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Loading vehicles…
                </p>
              ) : vehicles.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <Car className="mx-auto size-8 mb-2 opacity-40" />
                  No vehicles on file. Add one to continue.
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select vehicle</Label>
                  <Select value={vehicleId ?? ""} onValueChange={setVehicleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {vehicleLabel(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {customer ? (
                <AddVehicleDialog
                  customerId={customer.id}
                  onCreated={(id) => {
                    loadVehicles(customer.id, id);
                  }}
                  trigger={
                    <Button type="button" variant="outline" size="sm" className="gap-1.5">
                      <Car className="size-3.5" />
                      Add vehicle
                    </Button>
                  }
                />
              ) : null}
            </div>
          ) : null}

          {step === "plan" ? (
            <div className="space-y-3">
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active plans. Publish a plan under Maintenance Programs first.
                </p>
              ) : (
                <div className="space-y-2">
                  {plans.map((plan) => {
                    const display = formatPlanPriceOptions(plan);
                    const selected = planId === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setPlanId(plan.id)}
                        className={cn(
                          "w-full rounded-lg border p-3 text-left transition-colors",
                          selected
                            ? "border-brand-navy bg-brand-light/15 ring-1 ring-brand-navy"
                            : "hover:border-brand-navy/40",
                        )}
                      >
                        <p className="font-semibold">{plan.name}</p>
                        {plan.tagline ? (
                          <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
                        ) : null}
                        <p className="text-sm text-brand-navy mt-1">{display.primary}</p>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedPlan?.useClassPricing ? (
                <div className="space-y-2">
                  <Label>Vehicle class</Label>
                  <Select
                    value={vehicleClass}
                    onValueChange={(v) => setVehicleClass(v as MaintenanceVehicleClass)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_CLASSES.map((vc) => (
                        <SelectItem key={vc} value={vc}>
                          {VEHICLE_CLASS_LABELS[vc]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === "payment" ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["PAY_IN_FULL", "Pay in full", "Counter payment — active immediately"],
                  ["MONTHLY", "Monthly", "Bill monthly (no Stripe required in dev)"],
                  ["MANUAL", "Manual / comp", "Cash, check, or complimentary"],
                ] as const
              ).map(([mode, title, desc]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm",
                    paymentMode === mode
                      ? "border-brand-navy bg-brand-light/15 ring-1 ring-brand-navy"
                      : "hover:border-brand-navy/40",
                  )}
                >
                  <CreditCard className="size-4 text-brand-navy mb-1.5" />
                  <p className="font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          ) : null}

          {step === "review" ? (
            <dl className="space-y-2 text-sm rounded-lg border p-4 bg-muted/20">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground flex items-center gap-1">
                  <User className="size-3.5" /> Customer
                </dt>
                <dd className="font-medium text-right">{customer ? customerDisplayName(customer) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground flex items-center gap-1">
                  <Car className="size-3.5" /> Vehicle
                </dt>
                <dd className="font-medium text-right">
                  {selectedVehicle ? vehicleLabel(selectedVehicle) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium text-right">{selectedPlan?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Payment</dt>
                <dd className="font-medium text-right">
                  {paymentMode === "MANUAL"
                    ? "Manual / comp"
                    : paymentMode === "MONTHLY"
                      ? `Monthly — ${formatCents(amountCents)}/mo`
                      : `Pay in full — ${formatCents(amountCents)}`}
                </dd>
              </div>
            </dl>
          ) : null}

          {step === "done" ? (
            <div className="py-4 text-center space-y-3">
              <CheckCircle2 className="mx-auto size-12 text-green-600" />
              <p className="font-semibold">Subscriber enrolled</p>
              <p className="text-sm text-muted-foreground">
                {customer ? customerDisplayName(customer) : "Customer"} is active on{" "}
                {selectedPlan?.name ?? "the plan"}.
              </p>
              {subscriptionId ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/maintenance-programs/subscribers/${subscriptionId}`}>View subscription</Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {step !== "done" ? (
            <DialogFooter className="gap-2 sm:gap-0">
              {stepIndex > 0 ? (
                <Button type="button" variant="outline" onClick={back}>
                  <ChevronLeft className="size-4 mr-1" />
                  Back
                </Button>
              ) : (
                <span />
              )}
              {step === "review" ? (
                <Button
                  type="button"
                  className="bg-brand-navy"
                  disabled={pending}
                  onClick={enroll}
                >
                  {pending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                  Enroll subscriber
                </Button>
              ) : (
                <Button type="button" className="bg-brand-navy" onClick={next}>
                  Next
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              )}
            </DialogFooter>
          ) : (
            <DialogFooter>
              <Button type="button" className="bg-brand-navy" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
