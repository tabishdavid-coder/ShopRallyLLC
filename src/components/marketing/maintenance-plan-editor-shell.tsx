"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ExternalLink,
  Loader2,
} from "lucide-react";

import { CustomPlanServiceDialog } from "@/components/marketing/custom-plan-service-dialog";
import { PlanBuilderDnd } from "@/components/marketing/plan-builder-dnd";
import {
  canvasItemsToEntitlements,
  entitlementsToCanvasItems,
  type PlanCanvasItem,
} from "@/components/marketing/plan-builder-types";
import { planToInput } from "@/components/marketing/maintenance-plan-form";
import { PlanCardPreview } from "@/components/plans/plan-card-preview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import type { CannedJobSummary } from "@/lib/canned-job-types";
import {
  PLAN_SCOPES,
  PLAN_SCOPE_LABELS,
  VEHICLE_CLASSES,
  VEHICLE_CLASS_LABELS,
  applyRetailDiscount,
  computeMonthlyFromPayInFull,
  computeRetailDiscount,
  formatRetailDiscountSummary,
  planHasPricing,
  planStatusLabel,
  type MaintenancePlanDraftInput,
} from "@/lib/maintenance-programs";
import {
  createMaintenancePlan,
  updateMaintenancePlan,
} from "@/server/actions/maintenance-programs";
import type { getMaintenancePlan } from "@/server/maintenance-programs";
import type { MaintenanceProgramService } from "@/generated/prisma";
import type { MaintenanceVehicleClass } from "@/generated/prisma";
import { cn } from "@/lib/utils";

type Plan = NonNullable<Awaited<ReturnType<typeof getMaintenancePlan>>>;

type ProgramService = MaintenanceProgramService & {
  cannedJob?: { id: string; name: string } | null;
};

type Props = {
  canEdit: boolean;
  plan?: Plan;
  programServices?: ProgramService[] | null;
  cannedJobs?: CannedJobSummary[] | null;
  defaultTerms?: string | null;
  plansPublicUrl?: string;
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

type SectionId = "basics" | "services" | "pricing" | "publish";
type DiscountMode = "amount" | "percent";

export function MaintenancePlanEditorShell({
  canEdit,
  plan,
  programServices,
  cannedJobs,
  defaultTerms,
  plansPublicUrl,
}: Props) {
  const safeProgramServices = Array.isArray(programServices) ? programServices : [];
  const safeCannedJobs = Array.isArray(cannedJobs) ? cannedJobs : [];
  const router = useRouter();
  const isNew = !plan;
  const initial = plan ? planToInput(plan) : undefined;

  const [openSection, setOpenSection] = useState<SectionId>("basics");
  const [name, setName] = useState(initial?.name ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [idealFor, setIdealFor] = useState(initial?.idealFor ?? "");
  const [scope, setScope] = useState<MaintenancePlanDraftInput["scope"]>(initial?.scope ?? "PER_VEHICLE");
  const [maxVehicles, setMaxVehicles] = useState(
    initial?.maxVehicles != null ? String(initial.maxVehicles) : "",
  );
  const [termMonths, setTermMonths] = useState(String(initial?.termMonths ?? 12));
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [active, setActive] = useState(initial?.active ?? false);
  const [terms, setTerms] = useState(initial?.terms ?? defaultTerms ?? "");
  const [useClassPricing, setUseClassPricing] = useState(initial?.useClassPricing ?? false);
  const [classPrices, setClassPrices] = useState(
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
  const initialRetailDiscount = computeRetailDiscount(
    initial?.retailCents,
    initial?.payInFullCents ?? initial?.annualCents,
  );
  const [retail, setRetail] = useState(dollarsFromCents(initial?.retailCents));
  const [payInFull, setPayInFull] = useState(
    dollarsFromCents(initial?.payInFullCents ?? initial?.annualCents),
  );
  const [discountMode, setDiscountMode] = useState<DiscountMode>("percent");
  const [discountValue, setDiscountValue] = useState(() => {
    if (!initialRetailDiscount) return "";
    return String(initialRetailDiscount.savingsPercent);
  });
  const [monthly, setMonthly] = useState(dollarsFromCents(initial?.monthlyCents));
  const [monthlyManual, setMonthlyManual] = useState(false);
  const [monthlyTerm, setMonthlyTerm] = useState(String(initial?.monthlyTermMonths ?? 12));
  const [canvasItems, setCanvasItems] = useState<PlanCanvasItem[]>(() =>
    initial?.entitlements?.length ? entitlementsToCanvasItems(initial.entitlements) : [],
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const monthlyPricingTerm = parseInt(monthlyTerm, 10) || 12;
  const payInFullCentsPreview = centsFromDollars(payInFull);

  const autoMonthlyCents = useMemo(() => {
    if (payInFullCentsPreview == null || payInFullCentsPreview <= 0) return null;
    return computeMonthlyFromPayInFull(payInFullCentsPreview, monthlyPricingTerm);
  }, [payInFullCentsPreview, monthlyPricingTerm]);

  function syncDiscountFromPrices(retailCents: number | null, payInFullCents: number | null) {
    const discount = computeRetailDiscount(retailCents, payInFullCents);
    if (!discount) {
      setDiscountValue("");
      return;
    }
    if (discountMode === "amount") {
      setDiscountValue((discount.savingsCents / 100).toFixed(2));
    } else {
      setDiscountValue(String(discount.savingsPercent));
    }
  }

  function applyDiscountToPayInFull(retailCents: number, rawDiscount: string, mode: DiscountMode) {
    const parsed = parseFloat(rawDiscount.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const payInFullCents = applyRetailDiscount(retailCents, mode, parsed);
    setPayInFull(dollarsFromCents(payInFullCents));
    if (!monthlyManual) {
      setMonthly(dollarsFromCents(computeMonthlyFromPayInFull(payInFullCents, monthlyPricingTerm)));
    }
  }

  function handleRetailChange(value: string) {
    setRetail(value);
    const retailCents = centsFromDollars(value);
    if (retailCents == null || retailCents <= 0) return;

    if (discountValue.trim()) {
      applyDiscountToPayInFull(retailCents, discountValue, discountMode);
      return;
    }

    const payInFullCents = centsFromDollars(payInFull);
    if (payInFullCents != null && payInFullCents > 0) {
      syncDiscountFromPrices(retailCents, payInFullCents);
    }
  }

  function handleDiscountChange(value: string) {
    setDiscountValue(value);
    const retailCents = centsFromDollars(retail);
    if (retailCents == null || retailCents <= 0) return;
    applyDiscountToPayInFull(retailCents, value, discountMode);
  }

  function handleDiscountModeChange(mode: DiscountMode) {
    setDiscountMode(mode);
    const retailCents = centsFromDollars(retail);
    const payInFullCents = centsFromDollars(payInFull);
    if (retailCents != null && payInFullCents != null) {
      syncDiscountFromPrices(retailCents, payInFullCents);
    } else if (retailCents != null && discountValue.trim()) {
      applyDiscountToPayInFull(retailCents, discountValue, mode);
    }
  }

  function handlePayInFullChange(value: string) {
    setPayInFull(value);
    const retailCents = centsFromDollars(retail);
    const payInFullCents = centsFromDollars(value);
    if (retailCents != null && payInFullCents != null) {
      syncDiscountFromPrices(retailCents, payInFullCents);
    }
    if (!monthlyManual) {
      if (payInFullCents != null && payInFullCents > 0) {
        setMonthly(dollarsFromCents(computeMonthlyFromPayInFull(payInFullCents, monthlyPricingTerm)));
      }
    }
  }

  function handleMonthlyTermChange(value: string) {
    setMonthlyTerm(value);
    if (!monthlyManual && payInFullCentsPreview != null && payInFullCentsPreview > 0) {
      const term = parseInt(value, 10) || 12;
      setMonthly(dollarsFromCents(computeMonthlyFromPayInFull(payInFullCentsPreview, term)));
    }
  }

  function recalculateMonthly() {
    if (autoMonthlyCents != null) {
      setMonthly(dollarsFromCents(autoMonthlyCents));
      setMonthlyManual(false);
    }
  }

  const previewPricing = useMemo(
    () => ({
      retailCents: centsFromDollars(retail),
      payInFullCents: centsFromDollars(payInFull),
      monthlyCents: centsFromDollars(monthly),
      monthlyTermMonths: monthly.trim() ? parseInt(monthlyTerm, 10) || 12 : null,
    }),
    [retail, payInFull, monthly, monthlyTerm],
  );

  const retailDiscountPreview = computeRetailDiscount(
    previewPricing.retailCents,
    previewPricing.payInFullCents,
  );
  const discountSummary = retailDiscountPreview
    ? formatRetailDiscountSummary(retailDiscountPreview)
    : null;

  const previewPlan = {
    name: name || "Plan name",
    tagline,
    idealFor,
    featured,
    ...previewPricing,
    entitlements: canvasItemsToEntitlements(canvasItems).filter((e) => e.label.trim()),
  };

  const status = planStatusLabel({
    active,
    payInFullCents: previewPricing.payInFullCents,
    monthlyCents: previewPricing.monthlyCents,
    annualCents: null,
  });

  function buildPayload(): MaintenancePlanDraftInput {
    const pricingFields = {
      retailCents: centsFromDollars(retail),
      payInFullCents: centsFromDollars(payInFull),
      monthlyCents: centsFromDollars(monthly),
      monthlyTermMonths: monthly.trim() ? parseInt(monthlyTerm, 10) || 12 : null,
    };
    const priced = planHasPricing({
      payInFullCents: pricingFields.payInFullCents,
      monthlyCents: pricingFields.monthlyCents,
    });
    return {
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      description: initial?.description?.trim() || undefined,
      idealFor: idealFor.trim() || undefined,
      archetype: initial?.archetype ?? "BUNDLE",
      scope,
      maxVehicles: maxVehicles.trim() ? parseInt(maxVehicles, 10) : null,
      termMonths: parseInt(termMonths, 10) || 12,
      autoRenew: initial?.autoRenew ?? false,
      allowRollover: initial?.allowRollover ?? false,
      transferable: initial?.transferable ?? false,
      useClassPricing,
      ...pricingFields,
      featured,
      active: priced ? active : false,
      terms: terms.trim() || undefined,
      entitlements: canvasItemsToEntitlements(canvasItems),
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
    setSaved(false);
    if (!name.trim()) {
      setError("Enter a plan name.");
      setOpenSection("basics");
      return;
    }
    if (canvasItems.length === 0) {
      setError("Add at least one service to the plan.");
      setOpenSection("services");
      return;
    }
    const payload = buildPayload();
    if (active && !planHasPricing({
      payInFullCents: payload.payInFullCents ?? null,
      monthlyCents: payload.monthlyCents ?? null,
    })) {
      setError("Set at least one customer price before publishing.");
      setOpenSection("pricing");
      return;
    }
    start(async () => {
      const res = isNew
        ? await createMaintenancePlan(payload)
        : await updateMaintenancePlan(plan!.id, payload);
      if (res.ok) {
        setSaved(true);
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

  function updateClassSurcharge(vehicleClass: MaintenanceVehicleClass, dollars: string) {
    setClassPrices((rows) =>
      rows.map((r) =>
        r.vehicleClass === vehicleClass
          ? { ...r, surchargeCents: centsFromDollars(dollars) }
          : r,
      ),
    );
  }

  function toggleSection(id: SectionId) {
    setOpenSection((prev) => (prev === id ? prev : id));
  }

  const sections: { id: SectionId; title: string; subtitle: string }[] = [
    { id: "basics", title: "Basics", subtitle: "Name, tagline, billing term, featured" },
    { id: "services", title: "Services", subtitle: "Drag-and-drop service builder" },
    { id: "pricing", title: "Pricing", subtitle: "Regular price, discount, pay in full" },
    { id: "publish", title: "Publish", subtitle: "Active on public page" },
  ];

  return (
    <div className="space-y-4 pb-20">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h3 className="font-semibold truncate">{name || "New plan"}</h3>
          <span
            className={cn(
              "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
              status === "live" && "bg-green-100 text-green-800",
              status === "ready" && "bg-amber-100 text-amber-900",
              status === "draft" && "bg-muted text-muted-foreground",
            )}
          >
            {status === "live" ? "Live" : status === "ready" ? "Ready" : "Draft"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {plansPublicUrl && !isNew ? (
            <Button variant="outline" size="sm" asChild>
              <a href={`${plansPublicUrl}#plan-${plan!.id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 size-4" />
                Preview public card
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        {/* Left: accordion sections */}
        <div className="space-y-2">
          {sections.map((section) => (
            <Collapsible
              key={section.id}
              open={openSection === section.id}
              onOpenChange={(open) => open && setOpenSection(section.id)}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30",
                    openSection === section.id && "border-brand-navy/40 ring-1 ring-brand-navy/20",
                  )}
                >
                  <div>
                    <span className="font-medium">{section.title}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{section.subtitle}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      openSection === section.id && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 pb-1 px-1">
                {section.id === "basics" ? (
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Plan name</Label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Gold Maintenance Club"
                          className={inputCls}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Tagline</Label>
                        <Input
                          value={tagline}
                          onChange={(e) => setTagline(e.target.value)}
                          placeholder="Proactive care, predictable pricing"
                          className={inputCls}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Ideal for</Label>
                        <Input
                          value={idealFor}
                          onChange={(e) => setIdealFor(e.target.value)}
                          placeholder="Daily drivers who want hassle-free oil changes"
                          className={inputCls}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Billing term (months)</Label>
                        <Input
                          value={termMonths}
                          onChange={(e) => setTermMonths(e.target.value)}
                          className={inputCls}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Coverage</Label>
                        <Select
                          value={scope}
                          onValueChange={(v) => setScope(v as typeof scope)}
                          disabled={!canEdit}
                        >
                          <SelectTrigger className={inputCls}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_SCOPES.map((k) => (
                              <SelectItem key={k} value={k}>
                                {PLAN_SCOPE_LABELS[k]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {scope === "PER_HOUSEHOLD" ? (
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Max vehicles (blank = unlimited)</Label>
                          <Input
                            value={maxVehicles}
                            onChange={(e) => setMaxVehicles(e.target.value)}
                            className={inputCls}
                            disabled={!canEdit}
                          />
                        </div>
                      ) : null}
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={featured}
                        onCheckedChange={(v) => setFeatured(v === true)}
                        disabled={!canEdit}
                      />
                      Featured plan (highlighted on public page)
                    </label>
                  </div>
                ) : null}

                {section.id === "services" ? (
                  <div className="space-y-3">
                    <PlanBuilderDnd
                      canEdit={canEdit}
                      items={canvasItems}
                      onChange={setCanvasItems}
                      programServices={safeProgramServices}
                      cannedJobs={safeCannedJobs}
                      onAddCustom={() => setCustomOpen(true)}
                    />
                    <div className="rounded-lg border bg-card p-4 space-y-2">
                      <Label>Terms & conditions (optional)</Label>
                      <Textarea
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        rows={3}
                        className={inputCls}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                ) : null}

                {section.id === "pricing" ? (
                  <div className="rounded-lg border bg-card p-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Set a regular price and discount to show savings on the public plan card, or enter
                      pay-in-full directly. Monthly subscribers pay 15% more over the term (separate from
                      your plan discount).
                    </p>

                    {discountSummary ? (
                      <div className="rounded-lg border border-brand-navy/25 bg-brand-navy/5 px-4 py-3 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy">
                          Plan discount preview
                        </p>
                        <p className="text-base font-semibold tabular-nums">
                          <span className="text-muted-foreground line-through">{discountSummary.was}</span>
                          <span className="mx-2 text-muted-foreground">→</span>
                          <span className="text-brand-navy">{discountSummary.now}</span>
                        </p>
                        <span className="inline-flex rounded-full bg-brand-red/10 px-2.5 py-0.5 text-xs font-semibold text-brand-red">
                          {discountSummary.badge}
                        </span>
                      </div>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Regular price / compare-at ($)</Label>
                        <Input
                          value={retail}
                          onChange={(e) => handleRetailChange(e.target.value)}
                          disabled={!canEdit}
                          placeholder="e.g. 375.00 — shown struck through on the plan card"
                          className={inputCls}
                        />
                        <p className="text-xs text-muted-foreground">
                          The undiscounted price customers see crossed out. Enter this first, then set a
                          discount below or type pay-in-full directly.
                        </p>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Plan discount</Label>
                        <div className="flex flex-wrap gap-2">
                          <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
                            <button
                              type="button"
                              className={cn(
                                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                                discountMode === "percent"
                                  ? "bg-brand-navy text-white"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                              onClick={() => handleDiscountModeChange("percent")}
                              disabled={!canEdit}
                            >
                              % off
                            </button>
                            <button
                              type="button"
                              className={cn(
                                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                                discountMode === "amount"
                                  ? "bg-brand-navy text-white"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                              onClick={() => handleDiscountModeChange("amount")}
                              disabled={!canEdit}
                            >
                              $ off
                            </button>
                          </div>
                          <Input
                            value={discountValue}
                            onChange={(e) => handleDiscountChange(e.target.value)}
                            disabled={!canEdit || !retail.trim()}
                            placeholder={discountMode === "percent" ? "e.g. 15" : "e.g. 56.00"}
                            className={cn(inputCls, "max-w-[160px]")}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {retail.trim()
                            ? discountMode === "percent"
                              ? "Percent off regular price — auto-calculates pay-in-full below."
                              : "Dollar amount off regular price — auto-calculates pay-in-full below."
                            : "Enter a regular price above to enable discount entry."}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Customer pays — pay in full ($)</Label>
                        <Input
                          value={payInFull}
                          onChange={(e) => handlePayInFullChange(e.target.value)}
                          disabled={!canEdit}
                          className={inputCls}
                        />
                        <p className="text-xs text-muted-foreground">
                          Actual selling price. Editable directly — discount fields sync from this vs regular
                          price. Customers also save 15% vs monthly when paying upfront.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Monthly ($)</Label>
                        <Input
                          value={monthly}
                          onChange={(e) => {
                            setMonthly(e.target.value);
                            setMonthlyManual(true);
                          }}
                          disabled={!canEdit}
                          className={inputCls}
                        />
                        {autoMonthlyCents != null ? (
                          <p className="text-xs text-muted-foreground">
                            {monthlyManual ? (
                              <>
                                Auto: ${(autoMonthlyCents / 100).toFixed(2)}/mo (15% premium vs pay in full).{" "}
                                {canEdit ? (
                                  <button
                                    type="button"
                                    className="text-brand-navy underline"
                                    onClick={recalculateMonthly}
                                  >
                                    Recalculate from pay in full
                                  </button>
                                ) : null}
                              </>
                            ) : (
                              <>Auto-calculated from pay in full.</>
                            )}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Monthly term (months)</Label>
                        <Input
                          value={monthlyTerm}
                          onChange={(e) => handleMonthlyTermChange(e.target.value)}
                          disabled={!canEdit}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={useClassPricing}
                        onCheckedChange={(v) => setUseClassPricing(v === true)}
                        disabled={!canEdit}
                      />
                      Vehicle-class surcharges (SUV, heavy duty, etc.)
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
                                      updateClassSurcharge(row.vehicleClass, e.target.value)
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
                  </div>
                ) : null}

                {section.id === "publish" ? (
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <label className="flex items-start gap-2 text-sm rounded-md border border-green-200 bg-green-50/80 p-3">
                      <Checkbox
                        checked={active}
                        onCheckedChange={(v) => setActive(v === true)}
                        disabled={!canEdit}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium">Active on public plans page</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          Requires at least one customer price in the Pricing section.
                        </span>
                      </span>
                    </label>
                    {plansPublicUrl && !isNew ? (
                      <p className="text-sm text-muted-foreground">
                        Public URL:{" "}
                        <a
                          href={`${plansPublicUrl}#plan-${plan!.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-navy underline"
                        >
                          {plansPublicUrl}#plan-{plan!.id}
                        </a>
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </CollapsibleContent>
            </Collapsible>
          ))}

          {error ? <p className="text-sm text-destructive px-1">{error}</p> : null}
          {saved ? <p className="text-sm text-green-700 px-1">Plan saved.</p> : null}
        </div>

        {/* Right: live preview */}
        <aside className="xl:sticky xl:top-4 xl:self-start space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Live preview
          </p>
          <PlanCardPreview plan={previewPlan} signupDisabled />
        </aside>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Button variant="outline" asChild>
            <Link href="/marketing/maintenance-programs">Back to hub</Link>
          </Button>
          <div className="flex gap-2">
            {canEdit ? (
              <Button className="bg-brand-navy min-w-[120px]" onClick={save} disabled={pending}>
                {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                Save plan
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <CustomPlanServiceDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        cannedJobs={safeCannedJobs}
        onAdd={(item) =>
          setCanvasItems((prev) => [...prev, { ...item, sortOrder: prev.length }])
        }
      />
    </div>
  );
}
