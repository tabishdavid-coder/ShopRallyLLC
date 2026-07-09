"use client";

import { useMemo, useState } from "react";

import { PlansPageShell } from "@/components/plans/templates/plans-page-shell";
import { PlansSignupWizard } from "@/components/plans/plans-signup-wizard";
import { resolvePlanPricing } from "@/lib/maintenance-programs";
import {
  publicFeaturedHighlight,
  publicHeroSubtitle,
} from "@/lib/maintenance-public-page";
import type { PlansThemeConfig } from "@/lib/plans-page-theme";
import { parseThemeConfig, resolvePlansPageTheme } from "@/lib/plans-page-theme";
import type { MaintenanceVehicleClass, PlansPageTemplate } from "@/generated/prisma";
import type { PublicPlansPayload } from "@/server/maintenance-programs";

type Props = {
  shop: PublicPlansPayload["shop"];
  settings: PublicPlansPayload["settings"];
  plans: PublicPlansPayload["plans"];
  stripeCheckoutAvailable?: boolean;
  previewOverrides?: {
    template?: PlansPageTemplate;
    themeConfig?: PlansThemeConfig;
  };
};

export function PlansCatalog({
  shop,
  settings,
  plans,
  stripeCheckoutAvailable = false,
  previewOverrides,
}: Props) {
  const safePlans = Array.isArray(plans) ? plans : [];
  const [vehicleClass, setVehicleClass] = useState<MaintenanceVehicleClass>("CAR");
  const [termsOpen, setTermsOpen] = useState(false);
  const [signupPlanId, setSignupPlanId] = useState<string | null>(null);

  const usesClassPricing = safePlans.some((p) => p.useClassPricing);

  const heroTitle = settings.heroTitle ?? "Maintenance plans that fit your drive";
  const heroSubtitle =
    publicHeroSubtitle(settings.heroSubtitle) ||
    "Prepaid packages and monthly memberships — proactive care, predictable pricing.";
  const featuredHighlight = publicFeaturedHighlight(settings.heroSubtitle);

  const theme = useMemo(() => {
    const template = previewOverrides?.template ?? settings.pageTemplate ?? "CLASSIC";
    const savedConfig = parseThemeConfig(settings.themeConfig);
    const mergedConfig = { ...savedConfig, ...previewOverrides?.themeConfig };
    return resolvePlansPageTheme(template, mergedConfig);
  }, [settings.pageTemplate, settings.themeConfig, previewOverrides]);

  const cardPlans = useMemo(
    () =>
      safePlans.map((plan) => {
        const resolved = resolvePlanPricing(plan, usesClassPricing ? vehicleClass : null);
        return {
          id: plan.id,
          name: plan.name,
          tagline: plan.tagline,
          idealFor: plan.idealFor,
          featured: plan.featured,
          retailCents: plan.retailCents,
          payInFullCents: resolved.payInFullCents,
          monthlyCents: resolved.monthlyCents,
          monthlyTermMonths: plan.monthlyTermMonths,
          terms: plan.terms,
          entitlements: (plan.entitlements ?? []).map((e) => ({
            kind: e.kind,
            label: e.label,
            quantity: e.quantity,
          })),
        };
      }),
    [safePlans, usesClassPricing, vehicleClass],
  );

  const signupPlan = signupPlanId ? safePlans.find((p) => p.id === signupPlanId) : null;
  const termsText =
    [settings.termsDefault, signupPlan?.terms].filter(Boolean).join("\n\n") || "";

  if (signupPlan) {
    return (
      <div className="min-h-dvh bg-muted/30 py-8 px-4">
        <PlansSignupWizard
          shopSlug={settings.plansSlug ?? ""}
          shopName={shop.name}
          plan={signupPlan}
          vehicleClass={vehicleClass}
          termsText={termsText}
          stripeCheckoutAvailable={stripeCheckoutAvailable}
          onBack={() => setSignupPlanId(null)}
        />
      </div>
    );
  }

  return (
    <PlansPageShell
      shop={shop}
      settings={settings}
      plans={cardPlans}
      theme={theme}
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      featuredHighlight={featuredHighlight}
      usesClassPricing={usesClassPricing}
      vehicleClass={vehicleClass}
      onVehicleClassChange={setVehicleClass}
      onSelectPlan={setSignupPlanId}
      termsOpen={termsOpen}
      onTermsToggle={() => setTermsOpen((o) => !o)}
    />
  );
}
