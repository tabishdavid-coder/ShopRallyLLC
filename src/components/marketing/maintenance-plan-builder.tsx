"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";

import { CustomPlanServiceDialog } from "@/components/marketing/custom-plan-service-dialog";
import { PlanBuilderDnd } from "@/components/marketing/plan-builder-dnd";
import {
  canvasItemsToEntitlements,
  entitlementsToCanvasItems,
  type PlanCanvasItem,
} from "@/components/marketing/plan-builder-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlanPreviewCard } from "@/components/plans/plan-preview-card";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import {
  PLAN_SCOPES,
  PLAN_SCOPE_LABELS,
  VEHICLE_CLASSES,
  VEHICLE_CLASS_LABELS,
  type MaintenancePlanDraftInput,
  type MaintenancePlanInput,
} from "@/lib/maintenance-programs";
import {
  createMaintenancePlan,
  updateMaintenancePlan,
} from "@/server/actions/maintenance-programs";
import type { MaintenanceProgramService } from "@/generated/prisma";
import type { MaintenanceVehicleClass } from "@/generated/prisma";
import { cn } from "@/lib/utils";

type ProgramService = MaintenanceProgramService & {
  cannedJob?: { id: string; name: string } | null;
};

type Props = {
  canEdit: boolean;
  programServices?: ProgramService[] | null;
  cannedJobs?: CannedJobSummary[] | null;
  defaultTerms?: string | null;
  /** Edit mode */
  planId?: string;
  initial?: MaintenancePlanInput;
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

export function MaintenancePlanBuilder({
  canEdit,
  programServices,
  cannedJobs,
  defaultTerms,
  planId,
  initial,
}: Props) {
  const safeProgramServices = Array.isArray(programServices) ? programServices : [];
  const safeCannedJobs = Array.isArray(cannedJobs) ? cannedJobs : [];
  const router = useRouter();
  const isNew = !planId;

  const [name, setName] = useState(initial?.name ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [scope, setScope] = useState<MaintenancePlanDraftInput["scope"]>(initial?.scope ?? "PER_VEHICLE");
  const [maxVehicles, setMaxVehicles] = useState(
    initial?.maxVehicles != null ? String(initial.maxVehicles) : "",
  );
  const [termMonths, setTermMonths] = useState(String(initial?.termMonths ?? 12));
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
  const [pricingOpen, setPricingOpen] = useState(false);
  const [canvasItems, setCanvasItems] = useState<PlanCanvasItem[]>(() =>
    initial?.entitlements?.length
      ? entitlementsToCanvasItems(initial.entitlements)
      : [],
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const previewPlan = {
    name: name || "Plan name",
    tagline,
    featured: initial?.featured ?? false,
    retailCents: initial?.retailCents ?? null,
    payInFullCents: initial?.payInFullCents ?? null,
    monthlyCents: initial?.monthlyCents ?? null,
    monthlyTermMonths: initial?.monthlyTermMonths ?? 12,
    entitlements: canvasItemsToEntitlements(canvasItems).filter((e) => e.label.trim()),
  };

  function buildPayload(): MaintenancePlanDraftInput {
    return {
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      description: initial?.description?.trim() || undefined,
      archetype: initial?.archetype ?? "BUNDLE",
      scope,
      maxVehicles: maxVehicles.trim() ? parseInt(maxVehicles, 10) : null,
      termMonths: parseInt(termMonths, 10) || 12,
      autoRenew: initial?.autoRenew ?? false,
      allowRollover: initial?.allowRollover ?? false,
      transferable: initial?.transferable ?? false,
      useClassPricing,
      retailCents: initial?.retailCents ?? null,
      payInFullCents: initial?.payInFullCents ?? null,
      monthlyCents: initial?.monthlyCents ?? null,
      monthlyTermMonths: initial?.monthlyTermMonths ?? null,
      annualCents: initial?.annualCents ?? null,
      featured: initial?.featured ?? false,
      active,
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
    if (!name.trim()) {
      setError("Enter a plan name.");
      return;
    }
    if (canvasItems.length === 0) {
      setError("Add at least one service to the plan.");
      return;
    }
    start(async () => {
      const payload = buildPayload();
      const res = isNew
        ? await createMaintenancePlan(payload)
        : await updateMaintenancePlan(planId!, payload);
      if (res.ok) {
        if (isNew && res.id) {
          router.push(`/marketing/maintenance-programs/plans/${res.id}?tab=pricing`);
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

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        {/* Plan header */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
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
              <Label>Description / tagline</Label>
              <Input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Proactive care, predictable pricing"
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

          {!isNew ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={active}
                onCheckedChange={(v) => setActive(v === true)}
                disabled={!canEdit}
              />
              Active on public page
            </label>
          ) : null}

          <Collapsible open={pricingOpen} onOpenChange={setPricingOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/50"
              >
                Vehicle class pricing
                <ChevronDown
                  className={cn("size-4 transition-transform", pricingOpen && "rotate-180")}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={useClassPricing}
                  onCheckedChange={(v) => setUseClassPricing(v === true)}
                  disabled={!canEdit}
                />
                Enable vehicle-class surcharges
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
            </CollapsibleContent>
          </Collapsible>
        </section>

        {/* Drag-and-drop canvas */}
        <PlanBuilderDnd
          canEdit={canEdit}
          items={canvasItems}
          onChange={setCanvasItems}
          programServices={safeProgramServices}
          cannedJobs={safeCannedJobs}
          onAddCustom={() => setCustomOpen(true)}
        />

        <section className="rounded-lg border bg-card p-4 space-y-2">
          <Label>Terms & conditions (optional)</Label>
          <Textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={3}
            className={inputCls}
            disabled={!canEdit}
          />
        </section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button className="bg-brand-navy" onClick={save} disabled={!canEdit || pending}>
            {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            {isNew ? "Save draft — add pricing next" : "Save plan"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/marketing/maintenance-programs">Cancel</Link>
          </Button>
        </div>
      </div>

      <aside className="xl:sticky xl:top-4 xl:self-start space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Live preview
        </p>
        <PlanPreviewCard plan={previewPlan} signupDisabled />
      </aside>

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

export { entitlementsToCanvasItems };
