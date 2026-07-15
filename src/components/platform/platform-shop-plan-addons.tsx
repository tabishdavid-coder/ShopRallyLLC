"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Package, Loader2, Sparkles } from "lucide-react";

import { updateShopPlanFeatureOverride } from "@/server/actions/platform";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SMART_RO_ADDON_LABEL } from "@/lib/smart-ro-intake-types";
import { isCorePlan, PLANS, type PlanFeature, type PlanFeatureSet } from "@/lib/plans";
import type { ShopPlan } from "@/generated/prisma";

type AddonRow = {
  feature: PlanFeature;
  name: string;
  priceLabel: string;
  description: string;
};

const TOGGLEABLE_ADDONS: AddonRow[] = [
  {
    feature: "freeformRoIntake",
    name: "Smart AI RO Intake (AI Plus)",
    priceLabel: SMART_RO_ADDON_LABEL,
    description:
      "Core plan add-on — free-form text → Gemini parse → staging review → estimate with labor jobs.",
  },
];

export function PlatformShopPlanAddons({
  shopId,
  shopPlan,
  resolvedFeatures,
}: {
  shopId: string;
  shopPlan: ShopPlan;
  resolvedFeatures: PlanFeatureSet;
}) {
  const router = useRouter();
  const coreOnly = isCorePlan(shopPlan);
  const [pending, startTransition] = useTransition();
  const [busyFeature, setBusyFeature] = useState<PlanFeature | null>(null);
  const [local, setLocal] = useState(resolvedFeatures);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setLocal(resolvedFeatures);
  }, [resolvedFeatures]);

  function onToggle(feature: PlanFeature, next: boolean) {
    setBusyFeature(feature);
    setMessage(null);
    setLocal((prev) => ({ ...prev, [feature]: next }));
    startTransition(async () => {
      const res = await updateShopPlanFeatureOverride(shopId, feature, next);
      setBusyFeature(null);
      if (!res.ok) {
        setLocal(resolvedFeatures);
        setMessage({ kind: "err", text: res.error });
        return;
      }
      setMessage({
        kind: "ok",
        text: next ? "Add-on enabled for this shop" : "Add-on disabled for this shop",
      });
      router.refresh();
    });
  }

  if (!coreOnly) {
    return (
      <section className="rounded-xl border bg-muted/20 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Package className="size-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-navy">Plan add-ons</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              AI Plus (Smart AI RO Intake) is a <strong className="text-foreground">Core-only</strong>{" "}
              add-on ({SMART_RO_ADDON_LABEL}). This shop is on {PLANS[shopPlan].name} — add-ons for
              higher tiers are managed separately when those plans launch.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10">
          <Package className="size-4 text-brand-orange" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-brand-navy">Plan add-ons (Core)</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Billable extras for Core shops. Also enable AI suite under Release flags when turning on
            Smart Intake.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {TOGGLEABLE_ADDONS.map((row) => {
          const on = local[row.feature] ?? false;
          const busy = pending && busyFeature === row.feature;
          return (
            <li
              key={row.feature}
              className="flex items-start gap-3 rounded-lg border bg-muted/20 px-3 py-3"
            >
              <Checkbox
                id={`addon-${row.feature}`}
                checked={on}
                disabled={busy}
                onCheckedChange={(v) => onToggle(row.feature, v === true)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <Label
                  htmlFor={`addon-${row.feature}`}
                  className="flex cursor-pointer items-center gap-1.5 font-medium text-foreground"
                >
                  {row.feature === "freeformRoIntake" ? (
                    <Sparkles className="size-3.5 text-brand-orange" aria-hidden />
                  ) : null}
                  {row.name}
                  <span className="text-xs font-normal text-muted-foreground">
                    · {row.priceLabel}
                  </span>
                  {busy ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">{row.description}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {message ? (
        <p
          className={
            message.kind === "ok"
              ? "mt-3 text-sm text-emerald-700"
              : "mt-3 text-sm text-destructive"
          }
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
