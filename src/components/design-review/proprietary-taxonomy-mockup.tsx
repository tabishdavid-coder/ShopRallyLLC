"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Cpu,
  Database,
  Layers,
  PackageSearch,
  Receipt,
  Sparkles,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  TEXARKANA_PRESET,
  billLaborFromResolvedMatrix,
  chassisLaborMultiplier,
  gateOperationKeys,
  resolvePartsPlaceholder,
  scaleLaborHours,
  type ChassisComplexityTier,
  type IntentFitmentResult,
  type InvoiceLaborLine,
  type LaborResolvePath,
} from "@/lib/proprietary-taxonomy";
import { cn } from "@/lib/utils";

const ALLOW_LIST = [
  "BRAKES.FRONT.PADS.R_AND_R",
  "BRAKES.FRONT.ROTORS.R_AND_R",
  "BRAKES.REAR.PADS.R_AND_R",
  "ENGINE.OIL.FILTER.REPLACE",
] as const;

type ScenarioId = "accord-pads-miss" | "civic-exact" | "cold-pending";

type Scenario = {
  id: ScenarioId;
  label: string;
  blurb: string;
  notes: string;
  /** Deterministic stand-in for LLM middleware output (no network). */
  intent: IntentFitmentResult;
  vehicle: {
    label: string;
    taxonomyKey: string;
    chassis: ChassisComplexityTier;
    year: number;
    make: string;
    model: string;
    engine: string;
  };
  seed?: {
    label: string;
    chassis: ChassisComplexityTier;
    factoryHours: number;
  };
  exactHit?: {
    factoryHours: number;
  };
};

const SCENARIOS: Scenario[] = [
  {
    id: "accord-pads-miss",
    label: "Accord pads — L2 inherit",
    blurb: "Cold fitment + chassis scale (I4 open → packed ×1.10)",
    notes:
      "swapped out front pads on a 15 accord 2.4 and check if he needs the premium variant",
    intent: {
      vehicle: {
        year: 2015,
        make: "Honda",
        model: "Accord",
        engineConfiguration: "2.4L",
        trim: null,
        driveType: null,
      },
      targetOperationKeys: ["BRAKES.FRONT.PADS.R_AND_R"],
      partsVariantFlags: ["premium"],
      positionHints: ["FRONT"],
      confidence: 0.91,
      unresolvedTokens: [],
    },
    vehicle: {
      label: "2015 Honda Accord 2.4L",
      taxonomyKey: "2015|honda|accord|2.4l|fwd",
      chassis: "INLINE_4_PACKED",
      year: 2015,
      make: "Honda",
      model: "Accord",
      engine: "2.4L",
    },
    seed: {
      label: "2012 Honda Civic 1.8L I4 (seed)",
      chassis: "INLINE_4_OPEN",
      factoryHours: 1.0,
    },
  },
  {
    id: "civic-exact",
    label: "Civic pads — L0 exact",
    blurb: "Historical matrix hit; no interpolation",
    notes: "front brake pads r&r on 2012 civic 1.8",
    intent: {
      vehicle: {
        year: 2012,
        make: "Honda",
        model: "Civic",
        engineConfiguration: "1.8L I4",
        trim: null,
        driveType: "FWD",
      },
      targetOperationKeys: ["BRAKES.FRONT.PADS.R_AND_R"],
      partsVariantFlags: ["ceramic"],
      positionHints: ["FRONT"],
      confidence: 0.96,
      unresolvedTokens: [],
    },
    vehicle: {
      label: "2012 Honda Civic 1.8L I4",
      taxonomyKey: "2012|honda|civic|1.8l_i4|fwd",
      chassis: "INLINE_4_OPEN",
      year: 2012,
      make: "Honda",
      model: "Civic",
      engine: "1.8L I4",
    },
    exactHit: { factoryHours: 1.0 },
  },
  {
    id: "cold-pending",
    label: "Unknown config — L4 pending",
    blurb: "No seed neighbor → human/catalog queue",
    notes: "rear pads on a 2024 rivian r1t dual motor — need premium ceramic",
    intent: {
      vehicle: {
        year: 2024,
        make: "Rivian",
        model: "R1T",
        engineConfiguration: "Dual Motor",
        trim: null,
        driveType: "AWD",
      },
      targetOperationKeys: ["BRAKES.REAR.PADS.R_AND_R", "FAKE.OP.FROM.MODEL"],
      partsVariantFlags: ["premium", "ceramic"],
      positionHints: ["REAR"],
      confidence: 0.62,
      unresolvedTokens: [],
    },
    vehicle: {
      label: "2024 Rivian R1T Dual Motor",
      taxonomyKey: "2024|rivian|r1t|dual_motor|awd",
      chassis: "EV_SKATEBOARD",
      year: 2024,
      make: "Rivian",
      model: "R1T",
      engine: "Dual Motor",
    },
  },
];

type ResolveDemo = {
  path: LaborResolvePath;
  hours: number | null;
  multiplier: number | null;
  seedLabel: string | null;
  line: InvoiceLaborLine | null;
  partsCategory: string | null;
  partsStatus: "HIT" | "PLACEHOLDER_ENQUEUED" | "PENDING_REVIEW";
  rejectedKeys: string[];
  steps: Array<{ id: string; label: string; state: "pass" | "skip" | "fail" | "active" }>;
};

function runResolve(scenario: Scenario, notesOverride: string): {
  intent: IntentFitmentResult;
  resolve: ResolveDemo;
  notes: string;
} {
  const { kept, rejected } = gateOperationKeys(
    scenario.intent.targetOperationKeys,
    ALLOW_LIST,
  );
  const intent: IntentFitmentResult = {
    ...scenario.intent,
    targetOperationKeys: kept,
    unresolvedTokens: [...scenario.intent.unresolvedTokens, ...rejected],
  };

  const steps: ResolveDemo["steps"] = [
    { id: "L0", label: "L0 Exact matrix", state: "skip" },
    { id: "L1", label: "L1 Vector neighbor", state: "skip" },
    { id: "L2", label: "L2 Chassis scale", state: "skip" },
    { id: "L4", label: "L4 Pending review", state: "skip" },
  ];

  let path: LaborResolvePath = "L4_PENDING";
  let hours: number | null = null;
  let multiplier: number | null = null;
  let seedLabel: string | null = null;
  let line: InvoiceLaborLine | null = null;

  if (scenario.exactHit) {
    steps[0]!.state = "pass";
    path = "L0_EXACT";
    hours = scenario.exactHit.factoryHours;
    multiplier = 1;
    seedLabel = scenario.vehicle.label;
  } else if (scenario.seed) {
    steps[0]!.state = "fail";
    steps[1]!.state = "fail";
    const m = chassisLaborMultiplier(scenario.seed.chassis, scenario.vehicle.chassis);
    if (m != null) {
      steps[2]!.state = "pass";
      path = "L2_CHASSIS";
      multiplier = m;
      hours = scaleLaborHours(scenario.seed.factoryHours, m);
      seedLabel = scenario.seed.label;
    } else {
      steps[2]!.state = "fail";
      steps[3]!.state = "active";
    }
  } else {
    steps[0]!.state = "fail";
    steps[1]!.state = "fail";
    steps[2]!.state = "fail";
    steps[3]!.state = "active";
  }

  if (hours != null && kept[0]) {
    line = billLaborFromResolvedMatrix({
      matrixRow: {
        id: "demo",
        vehicleTaxonomyId: "demo_vt",
        serviceOperationId: "demo_op",
        factoryHours: hours,
        standardHours: hours,
        telemetryScore: null,
        chassisMultiplierApplied: multiplier ?? 1,
        confidence: intent.confidence,
        inheritedFromId: null,
        lastTelemetrySource: path === "L0_EXACT" ? "FACTORY_SEED" : "CHASSIS_INTERPOLATED",
      },
      shopRate: TEXARKANA_PRESET,
      resolvePath: path,
      operationKey: kept[0],
    });
  }

  const opKey = kept[0] ?? scenario.intent.targetOperationKeys[0] ?? "";
  const placeholder = opKey
    ? resolvePartsPlaceholder(opKey, intent.partsVariantFlags, intent.positionHints)
    : null;

  let partsStatus: ResolveDemo["partsStatus"] = "PENDING_REVIEW";
  if (scenario.id === "civic-exact") partsStatus = "HIT";
  else if (placeholder && path !== "L4_PENDING") partsStatus = "PLACEHOLDER_ENQUEUED";

  return {
    notes: notesOverride,
    intent,
    resolve: {
      path,
      hours,
      multiplier,
      seedLabel,
      line,
      partsCategory: placeholder?.genericCategoryKey ?? null,
      partsStatus,
      rejectedKeys: rejected,
      steps,
    },
  };
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function StepRail({ steps }: { steps: ResolveDemo["steps"] }) {
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step, i) => (
        <li key={step.id} className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-[11px] font-bold",
              step.state === "pass" && "bg-emerald-600 text-white",
              step.state === "fail" && "bg-muted text-muted-foreground line-through",
              step.state === "skip" && "bg-muted/60 text-muted-foreground",
              step.state === "active" && "bg-brand-red text-white",
            )}
          >
            {step.id}
          </span>
          <span
            className={cn(
              "font-medium",
              step.state === "pass" && "text-emerald-800",
              step.state === "active" && "text-brand-red",
              (step.state === "fail" || step.state === "skip") && "text-muted-foreground",
            )}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <ArrowRight className="ml-auto size-3.5 text-muted-foreground/50" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
}

export function ProprietaryTaxonomyMockup() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("accord-pads-miss");
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]!;
  const [notes, setNotes] = useState(scenario.notes);
  const [result, setResult] = useState(() => runResolve(scenario, scenario.notes));
  const [pending, startTransition] = useTransition();

  const shopRateLabel = useMemo(
    () =>
      `${TEXARKANA_PRESET.regionKey} · $${TEXARKANA_PRESET.hourlyRateDollars.toFixed(2)}/hr (${TEXARKANA_PRESET.hourlyRateDollars * 100}¢)`,
    [],
  );

  function selectScenario(id: ScenarioId) {
    const next = SCENARIOS.find((s) => s.id === id)!;
    setScenarioId(id);
    setNotes(next.notes);
    startTransition(() => setResult(runResolve(next, next.notes)));
  }

  function onResolve() {
    startTransition(() => setResult(runResolve(scenario, notes)));
  }

  const { intent, resolve } = result;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => selectScenario(s.id)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left transition-colors",
              scenarioId === s.id
                ? "border-brand-navy bg-brand-navy text-white shadow-sm"
                : "border-border bg-card text-foreground hover:border-brand-navy/40",
            )}
          >
            <p className="text-xs font-semibold">{s.label}</p>
            <p
              className={cn(
                "mt-0.5 text-[11px]",
                scenarioId === s.id ? "text-white/80" : "text-muted-foreground",
              )}
            >
              {s.blurb}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Left — tech notes + trust boundary */}
        <section className="flex flex-col rounded-xl border bg-card xl:col-span-4">
          <header className="flex items-center gap-2 border-b bg-brand-navy px-4 py-2.5 text-white">
            <Wrench className="size-4 opacity-90" />
            <div>
              <p className="text-sm font-semibold">Technician notes</p>
              <p className="text-[11px] text-white/70">Unstructured input → LLM intent only</p>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="min-h-[140px] resize-none font-mono text-xs leading-relaxed"
            />
            <div className="rounded-lg border border-dashed border-brand-light/70 bg-brand-light/10 px-3 py-2 text-[11px] text-brand-navy">
              <p className="font-semibold">Trust boundary</p>
              <p className="mt-0.5 text-muted-foreground">
                Parser may emit vehicle + allow-listed operation keys + variant flags. It cannot set
                hours, rates, or invoice totals.
              </p>
            </div>
            <Button
              type="button"
              onClick={onResolve}
              disabled={pending}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              <Sparkles className="size-4" />
              Parse intent & resolve quote
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Mock uses a deterministic intent fixture (no live LLM call). Resolution + billing run
              through the real TS engine.
            </p>
          </div>
        </section>

        {/* Center — intent JSON + vehicle/ops */}
        <section className="flex flex-col rounded-xl border bg-card xl:col-span-4">
          <header className="flex items-center gap-2 border-b bg-slate-800 px-4 py-2.5 text-white">
            <Cpu className="size-4 opacity-90" />
            <div>
              <p className="text-sm font-semibold">Intent middleware output</p>
              <p className="text-[11px] text-white/70">Structured JSON only — confidence{" "}
                {(intent.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </header>
          <div className="grid flex-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Vehicle
              </p>
              <p className="mt-1 text-sm font-semibold text-brand-navy">
                {intent.vehicle.year} {intent.vehicle.make} {intent.vehicle.model}
              </p>
              <p className="text-xs text-muted-foreground">
                {intent.vehicle.engineConfiguration ?? "—"} · chassis{" "}
                <span className="font-mono text-[11px] text-foreground">
                  {scenario.vehicle.chassis}
                </span>
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Target operations
              </p>
              <ul className="mt-1 space-y-1">
                {intent.targetOperationKeys.length === 0 && (
                  <li className="text-xs text-muted-foreground">None after allow-list gate</li>
                )}
                {intent.targetOperationKeys.map((k) => (
                  <li key={k} className="font-mono text-[11px] text-foreground">
                    {k}
                  </li>
                ))}
              </ul>
              {resolve.rejectedKeys.length > 0 && (
                <p className="mt-2 text-[11px] text-brand-red">
                  Rejected: {resolve.rejectedKeys.join(", ")}
                </p>
              )}
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 sm:col-span-2 xl:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Variant / position flags
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {intent.partsVariantFlags.map((f) => (
                  <Badge
                    key={f}
                    variant="outline"
                    className="border-brand-navy/30 bg-brand-navy/5 font-mono text-[10px] text-brand-navy"
                  >
                    {f}
                  </Badge>
                ))}
                {intent.positionHints.map((p) => (
                  <Badge
                    key={p}
                    variant="outline"
                    className="border-brand-red/35 bg-brand-red/5 font-mono text-[10px] text-brand-red"
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
            <pre className="max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-emerald-300 sm:col-span-2 xl:col-span-1">
              {JSON.stringify(
                {
                  vehicle: intent.vehicle,
                  target_operation_keys: intent.targetOperationKeys,
                  parts_variant_flags: intent.partsVariantFlags,
                  position_hints: intent.positionHints,
                  confidence: intent.confidence,
                  unresolved_tokens: intent.unresolvedTokens,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </section>

        {/* Right — resolve path + billing + parts */}
        <section className="flex flex-col gap-4 xl:col-span-4">
          <div className="rounded-xl border bg-card">
            <header className="flex items-center gap-2 border-b bg-brand-navy/95 px-4 py-2.5 text-white">
              <Layers className="size-4 opacity-90" />
              <div>
                <p className="text-sm font-semibold">Dynamic resolution</p>
                <p className="text-[11px] text-white/70">Lookup chain provenance</p>
              </div>
              <Badge className="ml-auto bg-white/15 text-[10px] text-white hover:bg-white/20">
                {resolve.path}
              </Badge>
            </header>
            <div className="space-y-3 p-4">
              <StepRail steps={resolve.steps} />
              {resolve.seedLabel && (
                <p className="rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  Seed: <span className="font-medium text-foreground">{resolve.seedLabel}</span>
                  {resolve.multiplier != null && resolve.multiplier !== 1 && (
                    <>
                      {" "}
                      → ×{resolve.multiplier.toFixed(2)} →{" "}
                      <span className="font-semibold text-brand-navy">
                        {resolve.hours?.toFixed(3)} hr
                      </span>
                    </>
                  )}
                </p>
              )}
              {resolve.path === "L4_PENDING" && (
                <p className="flex items-start gap-2 rounded-md border border-brand-red/30 bg-brand-red/5 px-2.5 py-2 text-[11px] text-brand-red">
                  <CircleDashed className="mt-0.5 size-3.5 shrink-0" />
                  No vector neighbor or chassis multiplier seed — queued for catalog curation. Billing
                  blocked.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card">
            <header className="flex items-center gap-2 border-b border-emerald-800/20 bg-emerald-700 px-4 py-2.5 text-white">
              <Receipt className="size-4 opacity-90" />
              <div>
                <p className="text-sm font-semibold">Unalterable labor total</p>
                <p className="text-[11px] text-white/80">{shopRateLabel}</p>
              </div>
            </header>
            <div className="p-4">
              {resolve.line ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/40 px-2 py-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Hours</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-brand-navy">
                      {resolve.line.hours.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-2 py-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Rate</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-brand-navy">
                      {money(resolve.line.rateCentsPerHour)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-brand-navy px-2 py-3 text-white">
                    <p className="text-[10px] font-bold uppercase text-white/70">Total</p>
                    <p className="mt-1 font-mono text-lg font-semibold">
                      {money(resolve.line.laborTotalCents)}
                    </p>
                    <p className="text-[10px] text-white/60">{resolve.line.laborTotalCents}¢</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No billable line — resolution pending.</p>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Database className="size-3.5" />
                Hours from labor_time_matrix · rate from shop preset · never from LLM
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card">
            <header className="flex items-center gap-2 border-b px-4 py-2.5">
              <PackageSearch className="size-4 text-brand-navy" />
              <div>
                <p className="text-sm font-semibold text-brand-navy">Parts fitment</p>
                <p className="text-[11px] text-muted-foreground">P0 hit → P1 placeholder → scrape</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "ml-auto text-[10px]",
                  resolve.partsStatus === "HIT" && "border-emerald-600 text-emerald-700",
                  resolve.partsStatus === "PLACEHOLDER_ENQUEUED" &&
                    "border-amber-600 text-amber-700",
                  resolve.partsStatus === "PENDING_REVIEW" && "border-brand-red/50 text-brand-red",
                )}
              >
                {resolve.partsStatus}
              </Badge>
            </header>
            <div className="space-y-2 p-4 text-sm">
              {resolve.partsStatus === "HIT" && (
                <p className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="size-4" />
                  Cached SKU on vehicle_part_fitment (demo axle set)
                </p>
              )}
              {resolve.partsStatus === "PLACEHOLDER_ENQUEUED" && (
                <>
                  <p className="text-amber-800">
                    No fitment row — enqueued low-cost supplier sweep
                  </p>
                  <p className="rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-[11px]">
                    {resolve.partsCategory}
                  </p>
                </>
              )}
              {resolve.partsStatus === "PENDING_REVIEW" && (
                <p className="text-muted-foreground">
                  Parts resolution held until labor seed exists or curator maps category.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
