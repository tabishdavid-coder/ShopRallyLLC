"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";

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
import { PlanPreviewCard } from "@/components/plans/plan-preview-card";
import {
  ENTITLEMENT_KINDS,
  ENTITLEMENT_KIND_LABELS,
  PLAN_ARCHETYPES,
  PLAN_ARCHETYPE_LABELS,
  PLAN_SCOPES,
  PLAN_SCOPE_LABELS,
  VEHICLE_CLASSES,
  VEHICLE_CLASS_LABELS,
  type MaintenancePlanInput,
} from "@/lib/maintenance-programs";
import type { EntitlementKind, MaintenanceVehicleClass } from "@/generated/prisma";
import {
  createMaintenancePlan,
  updateMaintenancePlan,
} from "@/server/actions/maintenance-programs";

type EntitlementRow = MaintenancePlanInput["entitlements"][number];

type Props = {
  canEdit: boolean;
  planId?: string;
  initial?: MaintenancePlanInput;
  defaultTerms?: string | null;
  hidePricing?: boolean;
};

const EMPTY_ENTITLEMENT: EntitlementRow = {
  kind: "COUNTED",
  label: "",
  quantity: 1,
  sortOrder: 0,
};

const inputCls =
  "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

function dollarsFromCents(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function centsFromDollars(raw: string): number | null {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function MaintenancePlanForm({ canEdit, planId, initial, defaultTerms, hidePricing = false }: Props) {
  const router = useRouter();
  const isNew = !planId;

  const [name, setName] = useState(initial?.name ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [idealFor, setIdealFor] = useState(initial?.idealFor ?? "");
  const [archetype, setArchetype] = useState(initial?.archetype ?? "BUNDLE");
  const [scope, setScope] = useState(initial?.scope ?? "PER_VEHICLE");
  const [maxVehicles, setMaxVehicles] = useState(
    initial?.maxVehicles != null ? String(initial.maxVehicles) : "",
  );
  const [termMonths, setTermMonths] = useState(String(initial?.termMonths ?? 12));
  const [autoRenew, setAutoRenew] = useState(initial?.autoRenew ?? true);
  const [allowRollover, setAllowRollover] = useState(initial?.allowRollover ?? false);
  const [transferable, setTransferable] = useState(initial?.transferable ?? false);
  const [useClassPricing, setUseClassPricing] = useState(initial?.useClassPricing ?? false);
  const [retail, setRetail] = useState(dollarsFromCents(initial?.retailCents));
  const [payInFull, setPayInFull] = useState(
    dollarsFromCents(initial?.payInFullCents ?? initial?.annualCents),
  );
  const [monthly, setMonthly] = useState(dollarsFromCents(initial?.monthlyCents));
  const [monthlyTerm, setMonthlyTerm] = useState(String(initial?.monthlyTermMonths ?? 12));
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [active, setActive] = useState(initial?.active ?? true);
  const [terms, setTerms] = useState(initial?.terms ?? defaultTerms ?? "");
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>(
    initial?.entitlements?.length ? initial.entitlements : [{ ...EMPTY_ENTITLEMENT }],
  );
  const [classPrices, setClassPrices] = useState<MaintenancePlanInput["classPrices"]>(
    initial?.classPrices?.length
      ? initial.classPrices
      : VEHICLE_CLASSES.map((vehicleClass) => ({
          vehicleClass,
          payInFullCents: null,
          monthlyCents: null,
          annualCents: null,
          surchargeCents: null,
        })),
  );

  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const previewPlan = useMemo(
    () => ({
      name: name || "Plan name",
      tagline,
      idealFor,
      featured,
      retailCents: centsFromDollars(retail),
      payInFullCents: centsFromDollars(payInFull),
      monthlyCents: centsFromDollars(monthly),
      monthlyTermMonths: parseInt(monthlyTerm, 10) || 12,
      entitlements: entitlements.filter((e) => e.label.trim()),
    }),
    [name, tagline, idealFor, featured, retail, payInFull, monthly, monthlyTerm, entitlements],
  );

  function buildPayload(): MaintenancePlanInput {
    return {
      name,
      tagline: tagline || undefined,
      description: description || undefined,
      idealFor: idealFor || undefined,
      archetype,
      scope,
      maxVehicles: maxVehicles.trim() ? parseInt(maxVehicles, 10) : null,
      termMonths: parseInt(termMonths, 10) || 12,
      autoRenew,
      allowRollover,
      transferable,
      useClassPricing,
      retailCents: centsFromDollars(retail),
      payInFullCents: centsFromDollars(payInFull),
      monthlyCents: centsFromDollars(monthly),
      monthlyTermMonths: monthly.trim() ? parseInt(monthlyTerm, 10) || 12 : null,
      featured,
      active,
      terms: terms || undefined,
      entitlements: entitlements
        .filter((e) => e.label.trim())
        .map((e, i) => ({
          ...e,
          programServiceId: e.programServiceId,
          sortOrder: i,
        })),
      classPrices: useClassPricing
        ? classPrices.map((c) => ({
            vehicleClass: c.vehicleClass,
            payInFullCents: c.payInFullCents ?? null,
            monthlyCents: c.monthlyCents ?? null,
            annualCents: c.annualCents ?? null,
            surchargeCents: c.surchargeCents ?? null,
          }))
        : [],
    };
  }

  function save() {
    if (!canEdit) return;
    setError(null);
    start(async () => {
      const payload = buildPayload();
      const res = isNew
        ? await createMaintenancePlan(payload)
        : await updateMaintenancePlan(planId!, payload);
      if (res.ok) {
        if (isNew && res.id) {
          router.push(`/marketing/maintenance-programs/plans/${res.id}`);
        } else {
          router.refresh();
        }
      } else {
        setError(res.error);
      }
    });
  }

  function updateEntitlement(index: number, patch: Partial<EntitlementRow>) {
    setEntitlements((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updateClassPrice(
    vehicleClass: MaintenanceVehicleClass,
    field: "surchargeCents",
    dollars: string,
  ) {
    setClassPrices((rows) =>
      rows.map((r) =>
        r.vehicleClass === vehicleClass
          ? { ...r, [field]: centsFromDollars(dollars) }
          : r,
      ),
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Plan name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Tagline</Label>
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label>Archetype</Label>
              <Select value={archetype} onValueChange={(v) => setArchetype(v as typeof archetype)} disabled={!canEdit}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_ARCHETYPES.map((k) => (
                    <SelectItem key={k} value={k}>{PLAN_ARCHETYPE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)} disabled={!canEdit}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_SCOPES.map((k) => (
                    <SelectItem key={k} value={k}>{PLAN_SCOPE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {scope === "PER_HOUSEHOLD" ? (
              <div className="space-y-1.5">
                <Label>Max vehicles (blank = unlimited)</Label>
                <Input
                  value={maxVehicles}
                  onChange={(e) => setMaxVehicles(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Unlimited"
                  className={inputCls}
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Term (months)</Label>
              <Input value={termMonths} onChange={(e) => setTermMonths(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Ideal for</Label>
            <Input value={idealFor} onChange={(e) => setIdealFor(e.target.value)} disabled={!canEdit} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={3} className={inputCls} />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={featured} onCheckedChange={(v) => setFeatured(v === true)} disabled={!canEdit} />
              Featured plan
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} disabled={!canEdit} />
              Active on public page
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={autoRenew} onCheckedChange={(v) => setAutoRenew(v === true)} disabled={!canEdit} />
              Auto-renew
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={allowRollover} onCheckedChange={(v) => setAllowRollover(v === true)} disabled={!canEdit} />
              Allow rollover
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={transferable} onCheckedChange={(v) => setTransferable(v === true)} disabled={!canEdit} />
              Transferable
            </label>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Included services & perks</h2>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEntitlements((r) => [...r, { ...EMPTY_ENTITLEMENT }])}
              >
                <Plus className="mr-1 size-4" /> Add row
              </Button>
            ) : null}
          </div>
          <div className="space-y-3">
            {entitlements.map((row, i) => (
              <div key={i} className="flex flex-wrap gap-2 rounded-md border p-3">
                <GripVertical className="size-4 text-muted-foreground mt-2 shrink-0 hidden sm:block" />
                <div className="grid flex-1 gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-3">
                    <Select
                      value={row.kind}
                      onValueChange={(v) => updateEntitlement(i, { kind: v as EntitlementKind })}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ENTITLEMENT_KINDS.map((k) => (
                          <SelectItem key={k} value={k}>{ENTITLEMENT_KIND_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-5">
                    <Input
                      placeholder="Label (e.g. Semi-synthetic oil change)"
                      value={row.label}
                      onChange={(e) => updateEntitlement(i, { label: e.target.value })}
                      disabled={!canEdit}
                      className={inputCls}
                    />
                  </div>
                  {(row.kind === "COUNTED" || row.kind === "COUPON" || row.kind === "ACCESS") && (
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={row.quantity ?? ""}
                        onChange={(e) =>
                          updateEntitlement(i, { quantity: parseInt(e.target.value, 10) || 1 })
                        }
                        disabled={!canEdit}
                        className={inputCls}
                      />
                    </div>
                  )}
                  {(row.kind === "INTERVAL" || row.kind === "UNLIMITED") && (
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Min days"
                        value={row.intervalDays ?? ""}
                        onChange={(e) =>
                          updateEntitlement(i, { intervalDays: parseInt(e.target.value, 10) || 90 })
                        }
                        disabled={!canEdit}
                        className={inputCls}
                      />
                    </div>
                  )}
                  {row.kind === "DISCOUNT" && (
                    <>
                      <div className="sm:col-span-2">
                        <Input
                          type="number"
                          placeholder="% off"
                          value={row.discountBps != null ? row.discountBps / 100 : ""}
                          onChange={(e) =>
                            updateEntitlement(i, {
                              discountBps: Math.round(parseFloat(e.target.value || "0") * 100),
                            })
                          }
                          disabled={!canEdit}
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Input
                          placeholder="Cap $"
                          value={dollarsFromCents(row.discountCapCents)}
                          onChange={(e) =>
                            updateEntitlement(i, { discountCapCents: centsFromDollars(e.target.value) })
                          }
                          disabled={!canEdit}
                          className={inputCls}
                        />
                      </div>
                    </>
                  )}
                </div>
                {canEdit && entitlements.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setEntitlements((r) => r.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {!hidePricing ? (
        <section className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Compare-at / retail ($)</Label>
              <Input value={retail} onChange={(e) => setRetail(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label>Pay in full ($)</Label>
              <Input value={payInFull} onChange={(e) => setPayInFull(e.target.value)} disabled={!canEdit} className={inputCls} />
              <p className="text-xs text-muted-foreground">
                Full plan price upfront — customers save 15% vs monthly.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Monthly ($)</Label>
              <Input value={monthly} onChange={(e) => setMonthly(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly term (months)</Label>
              <Input value={monthlyTerm} onChange={(e) => setMonthlyTerm(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={useClassPricing}
              onCheckedChange={(v) => setUseClassPricing(v === true)}
              disabled={!canEdit}
            />
            Vehicle-class pricing overrides
          </label>
          {useClassPricing ? (
            <div className="rounded-md border overflow-hidden text-sm">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Class</th>
                    <th className="px-3 py-2 text-left font-medium">Surcharge ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {classPrices.map((row) => (
                    <tr key={row.vehicleClass} className="border-t">
                      <td className="px-3 py-2">{VEHICLE_CLASS_LABELS[row.vehicleClass]}</td>
                      <td className="px-3 py-2">
                        <Input
                          value={dollarsFromCents(row.surchargeCents)}
                          onChange={(e) =>
                            updateClassPrice(row.vehicleClass, "surchargeCents", e.target.value)
                          }
                          disabled={!canEdit}
                          className={inputCls}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
        ) : null}

        <section className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Terms</h2>
          <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} disabled={!canEdit} rows={6} className={inputCls} />
        </section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={!canEdit || pending}>
            {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            {isNew ? "Create plan" : "Save plan"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/marketing/maintenance-programs">Back</Link>
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live preview</p>
        <PlanPreviewCard plan={previewPlan} signupDisabled />
      </aside>
    </div>
  );
}

function planToInput(plan: {
  name: string;
  tagline: string | null;
  description: string | null;
  idealFor: string | null;
  archetype: MaintenancePlanInput["archetype"];
  scope: MaintenancePlanInput["scope"];
  maxVehicles: number | null;
  termMonths: number;
  autoRenew: boolean;
  allowRollover: boolean;
  transferable: boolean;
  useClassPricing: boolean;
  retailCents: number | null;
  payInFullCents: number | null;
  monthlyCents: number | null;
  monthlyTermMonths: number | null;
  annualCents: number | null;
  featured: boolean;
  active: boolean;
  terms: string | null;
  entitlements: {
    kind: EntitlementKind;
    label: string;
    programServiceId?: string | null;
    quantity: number | null;
    intervalDays: number | null;
    discountBps: number | null;
    discountCapCents: number | null;
    creditCents: number | null;
    sortOrder: number;
  }[];
  classPrices: {
    vehicleClass: MaintenanceVehicleClass;
    payInFullCents: number | null;
    monthlyCents: number | null;
    annualCents: number | null;
    surchargeCents: number | null;
  }[];
}): MaintenancePlanInput {
  return {
    name: plan.name,
    tagline: plan.tagline ?? undefined,
    description: plan.description ?? undefined,
    idealFor: plan.idealFor ?? undefined,
    archetype: plan.archetype,
    scope: plan.scope,
    maxVehicles: plan.maxVehicles,
    termMonths: plan.termMonths,
    autoRenew: plan.autoRenew,
    allowRollover: plan.allowRollover,
    transferable: plan.transferable,
    useClassPricing: plan.useClassPricing,
    retailCents: plan.retailCents,
    payInFullCents: plan.payInFullCents,
    monthlyCents: plan.monthlyCents,
    monthlyTermMonths: plan.monthlyTermMonths,
    annualCents: plan.annualCents,
    featured: plan.featured,
    active: plan.active,
    terms: plan.terms ?? undefined,
    entitlements: (plan.entitlements ?? []).map((e) => ({
      programServiceId: e.programServiceId ?? undefined,
      kind: e.kind,
      label: e.label,
      quantity: e.quantity,
      intervalDays: e.intervalDays,
      discountBps: e.discountBps,
      discountCapCents: e.discountCapCents,
      creditCents: e.creditCents,
      sortOrder: e.sortOrder,
    })),
    classPrices: (plan.classPrices ?? []).map((c) => ({
      vehicleClass: c.vehicleClass,
      payInFullCents: c.payInFullCents,
      monthlyCents: c.monthlyCents,
      annualCents: c.annualCents,
      surchargeCents: c.surchargeCents,
    })),
  };
}

export { planToInput };
