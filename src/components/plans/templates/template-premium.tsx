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

export function TemplatePremium(props: PlansTemplateProps) {
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
    <div className="min-h-dvh bg-neutral-950 text-neutral-100" style={themeCssVars(theme)}>
      <header
        className="relative border-b border-neutral-800"
        style={{ backgroundColor: "var(--plans-primary)" }}
      >
        <div
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, var(--plans-accent), transparent)` }}
        />
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <PlansShopLogo shop={shop} theme={theme} className="brightness-0 invert" />
          <div className="flex items-start gap-4">
            <div
              className="mt-2 hidden h-12 w-1 shrink-0 sm:block"
              style={{ backgroundColor: "var(--plans-accent)" }}
            />
            <div>
              <h1 className={cn("font-light tracking-tight text-white", fonts.heroTitle)}>
                {heroTitle}
              </h1>
              <p className={cn("mt-4 max-w-2xl text-neutral-300", fonts.heroSubtitle)}>
                {heroSubtitle}
              </p>
              {featuredHighlight ? (
                <p
                  className="mt-4 inline-flex border px-3 py-1 text-xs font-medium tracking-wide uppercase"
                  style={{ borderColor: "var(--plans-accent)", color: "var(--plans-accent)" }}
                >
                  {featuredHighlight}
                </p>
              ) : null}
            </div>
          </div>
          <PlansContactRow shop={shop} theme={theme} className="mt-6 text-neutral-400" lightText />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        {usesClassPricing ? (
          <PlansVehicleClassPicker
            theme={theme}
            vehicleClass={vehicleClass}
            onVehicleClassChange={onVehicleClassChange}
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
