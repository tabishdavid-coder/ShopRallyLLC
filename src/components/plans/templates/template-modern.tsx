"use client";

import { cn } from "@/lib/utils";
import { FONT_SCALE, themeCssVars } from "@/lib/plans-page-theme";

import {
  PlansContactRow,
  PlansGrid,
  PlansPageFooter,
  PlansShopLogo,
  PlansTermsSection,
  PlansVehicleClassPicker,
  type PlansTemplateProps,
} from "./plans-shared";

export function TemplateModern(props: PlansTemplateProps) {
  const {
    shop,
    settings,
    plans,
    theme,
    heroTitle,
    heroSubtitle,
    featuredHighlight,
    usesClassPricing,
    vehicleClass,
    onVehicleClassChange,
    onSelectPlan,
    termsOpen,
    onTermsToggle,
  } = props;

  const fonts = FONT_SCALE[theme.fontScale];

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white" style={themeCssVars(theme)}>
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <PlansShopLogo shop={shop} theme={theme} />
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--plans-accent)" }}
          >
            Maintenance plans
          </p>
          <h1
            className={cn("font-bold tracking-tight text-slate-900", fonts.heroTitle)}
          >
            {heroTitle}
          </h1>
          <p className={cn("mt-4 max-w-2xl leading-relaxed text-slate-600", fonts.heroSubtitle)}>
            {heroSubtitle}
          </p>
          {featuredHighlight ? (
            <span
              className="mt-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, var(--plans-accent) 12%, white)`,
                color: "var(--plans-primary)",
              }}
            >
              {featuredHighlight}
            </span>
          ) : null}
          <PlansContactRow shop={shop} theme={theme} className="mt-5" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        {usesClassPricing ? (
          <PlansVehicleClassPicker
            theme={theme}
            vehicleClass={vehicleClass}
            onVehicleClassChange={onVehicleClassChange}
            className="rounded-2xl border-slate-200/80 shadow-sm"
          />
        ) : null}
        <PlansGrid plans={plans} theme={theme} shopName={shop.name} onSelectPlan={onSelectPlan} />
        <PlansTermsSection
          theme={theme}
          settings={settings}
          plans={plans}
          termsOpen={termsOpen}
          onTermsToggle={onTermsToggle}
        />
      </main>
      <PlansPageFooter theme={theme} />
    </div>
  );
}
