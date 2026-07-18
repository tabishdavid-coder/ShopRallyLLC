"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Sparkles,
  Car,
  Wrench,
  User,
  AlertCircle,
  Lock,
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
  commitFreeformRoIntake,
  parseFreeformRoIntake,
} from "@/server/actions/freeform-ro-intake";
import {
  searchCustomers,
  getCustomerVehicles,
} from "@/server/actions/pickers";
import type { CustomerPick, VehiclePick } from "@/lib/picker-types";
import {
  FREEFORM_RO_ADDON_LABEL,
  type FreeformRoDraft,
} from "@/lib/freeform-ro-types";
import { useFreeformRoIntakeEnabled } from "@/lib/shop-capabilities";
import { customerDisplayName } from "@/lib/format";
import { cn } from "@/lib/utils";

type Step = "input" | "preview";

function vehicleLabel(draft: FreeformRoDraft): string {
  const v = draft.vehicle;
  const ymm = [v.year, v.make, v.model].filter(Boolean).join(" ");
  return ymm || "Vehicle not identified — add year, make, model";
}

export function FreeformRoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const entitled = useFreeformRoIntakeEnabled();
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<FreeformRoDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState<CustomerPick[]>([]);
  const [customer, setCustomer] = useState<CustomerPick | null>(null);
  const [vehicles, setVehicles] = useState<VehiclePick[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [createNewVehicle, setCreateNewVehicle] = useState(false);
  const [pending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);

  const reset = useCallback(() => {
    setStep("input");
    setText("");
    setDraft(null);
    setError(null);
    setCustomerQuery("");
    setCustomerHits([]);
    setCustomer(null);
    setVehicles([]);
    setVehicleId(null);
    setCreateNewVehicle(false);
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
    if (!customer) {
      setVehicles([]);
      setVehicleId(null);
      return;
    }
    void getCustomerVehicles(customer.id).then((list) => {
      setVehicles(list);
      const v = draft?.vehicle;
      if (!v) return;
      const match = list.find(
        (veh) =>
          (v.vin && veh.vin?.toUpperCase() === v.vin) ||
          (v.year && veh.year === v.year && veh.make === v.make && veh.model === v.model),
      );
      if (match) {
        setVehicleId(match.id);
        setCreateNewVehicle(false);
      } else if (list.length === 1) {
        setVehicleId(list[0]!.id);
      } else {
        setCreateNewVehicle(true);
        setVehicleId(null);
      }
    });
  }, [customer, draft?.vehicle]);

  function onBuild() {
    setError(null);
    startTransition(async () => {
      const res = await parseFreeformRoIntake({ text });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDraft(res.draft);
      setStep("preview");
      if (res.draft.customerHint) {
        const hint = res.draft.customerHint;
        const q = hint.phone || hint.email || hint.lastName || hint.company || "";
        if (q) setCustomerQuery(q);
      }
    });
  }

  function onCreate() {
    if (!draft || !customer) {
      setError("Select a customer to attach this repair order.");
      return;
    }
    if (!vehicleId && !createNewVehicle) {
      setError("Select a vehicle or create a new one from the parsed details.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await commitFreeformRoIntake({
        customerId: customer.id,
        vehicleId: vehicleId ?? undefined,
        createVehicle: createNewVehicle,
        draft: {
          rawText: draft.rawText,
          vehicle: draft.vehicle,
          concerns: draft.concerns,
          notes: draft.notes,
          jobs: draft.jobs.map((j) => ({
            jobName: j.jobName,
            repairRequest: j.repairRequest,
            laborHours: j.laborHours,
            laborDescription: j.laborDescription,
          })),
        },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onOpenChange(false);
      router.push(`/repair-orders/${res.id}?tab=estimate`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-navy">
            <Sparkles className="size-5 text-brand-orange" aria-hidden />
            Freeform repair order
          </DialogTitle>
          <DialogDescription>
            Describe the vehicle and work in plain English. AI fills vehicle details, concerns, and
            labor hours.
          </DialogDescription>
        </DialogHeader>

        {!entitled ? (
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">Freeform intake is a {FREEFORM_RO_ADDON_LABEL}</p>
              <p className="mt-1 text-amber-900/80">
                Contact your platform admin or upgrade billing to enable AI-powered repair order
                intake. Use <strong>Create manually</strong> for the standard flow.
              </p>
            </div>
          </div>
        ) : null}

        {step === "input" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="freeform-ro-text">What does the customer need?</Label>
              <Textarea
                id="freeform-ro-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. 2014 Honda Accord needs front brakes and oil change, 82k miles"
                rows={4}
                disabled={!entitled || pending}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Include year, make, model, and the requested work for best results.
              </p>
            </div>
            {error ? <ErrorBanner message={error} /> : null}
          </div>
        ) : draft ? (
          <div className="space-y-4">
            <section className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
                <Car className="size-4" aria-hidden />
                {vehicleLabel(draft)}
              </div>
              {draft.vehicle.mileage ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {draft.vehicle.mileage.toLocaleString()} miles
                </p>
              ) : null}
            </section>

            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Jobs & labor
              </p>
              {draft.jobs.map((job, i) => (
                <div key={i} className="rounded-lg border bg-card px-3 py-2.5 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-foreground">{job.jobName}</span>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {job.laborHours.toFixed(2)} hrs
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{job.repairRequest}</p>
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <User className="size-3.5" aria-hidden />
                Customer
              </Label>
              {customer ? (
                <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                  <span className="font-medium">{customerDisplayName(customer)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setCustomer(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Search name, phone, or email"
                    autoComplete="off"
                  />
                  {searching ? (
                    <p className="text-xs text-muted-foreground">Searching…</p>
                  ) : customerHits.length > 0 ? (
                    <CustomerSearchResults
                      results={customerHits}
                      searching={searching}
                      query={customerQuery}
                      onSelect={(c) => {
                        setCustomer(c);
                        setCustomerQuery("");
                        setCustomerHits([]);
                      }}
                    />
                  ) : customerQuery.trim().length >= 2 ? (
                    <p className="text-xs text-muted-foreground">No customers found.</p>
                  ) : null}
                </>
              )}
            </section>

            {customer ? (
              <section className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Wrench className="size-3.5" aria-hidden />
                  Vehicle for this order
                </Label>
                {vehicles.length > 0 && !createNewVehicle ? (
                  <div className="space-y-1">
                    {vehicles.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setVehicleId(v.id);
                          setCreateNewVehicle(false);
                        }}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                          vehicleId === v.id
                            ? "border-brand-navy bg-brand-navy/5"
                            : "hover:bg-muted/50",
                        )}
                      >
                        {[v.year, v.make, v.model].filter(Boolean).join(" ")}
                        {v.plate ? ` · ${v.plate}` : ""}
                      </button>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setCreateNewVehicle(true);
                    setVehicleId(null);
                  }}
                  className={cn(
                    "w-full rounded-lg border border-dashed px-3 py-2 text-left text-sm",
                    createNewVehicle ? "border-brand-navy bg-brand-navy/5" : "hover:bg-muted/50",
                  )}
                >
                  + Create vehicle from AI details ({vehicleLabel(draft)})
                </button>
              </section>
            ) : null}

            {error ? <ErrorBanner message={error} /> : null}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "preview" ? (
            <Button type="button" variant="outline" onClick={() => setStep("input")} disabled={pending}>
              Back
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === "input" ? (
            <Button
              type="button"
              className="bg-brand-orange hover:bg-brand-orange/90"
              onClick={onBuild}
              disabled={!entitled || pending || text.trim().length < 8}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Building…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" aria-hidden />
                  Build with AI
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              className="bg-brand-orange hover:bg-brand-orange/90"
              onClick={onCreate}
              disabled={pending || !customer}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                "New Repair Order"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </div>
  );
}
