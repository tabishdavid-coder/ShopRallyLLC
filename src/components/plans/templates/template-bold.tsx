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

export function TemplateBold(props: PlansTemplateProps) {
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
  const heroStyle =
    theme.heroStyle === "minimal"
      ? { background: "white" }
      : theme.heroStyle === "solid"
        ? { backgroundColor: "var(--plans-primary)" }
        : {
            background: `linear-gradient(120deg, var(--plans-primary) 0%, var(--plans-accent) 55%, var(--plans-primary) 100%)`,
          };

  const lightHero = theme.heroStyle !== "minimal";

  return (
    <div className="min-h-dvh bg-slate-100" style={themeCssVars(theme)}>
      <header className="relative overflow-hidden text-white" style={heroStyle}>
        <div
          className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full opacity-20"
          style={{ backgroundColor: "var(--plans-accent)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full opacity-10"
          style={{ backgroundColor: "white" }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <PlansShopLogo shop={shop} theme={theme} />
          <h1
            className={cn("font-extrabold tracking-tight", fonts.heroTitle)}
            style={lightHero ? undefined : { color: "var(--plans-primary)" }}
          >
            {heroTitle}
          </h1>
          <p
            className={cn("mt-4 max-w-2xl font-medium", fonts.heroSubtitle)}
            style={lightHero ? { color: "rgba(255,255,255,0.9)" } : { color: "var(--plans-primary)", opacity: 0.8 }}
          >
            {heroSubtitle}
          </p>
          {featuredHighlight ? (
            <p
              className="mt-4 inline-flex rounded-md px-4 py-1.5 text-sm font-bold uppercase tracking-wide"
              style={{ backgroundColor: "var(--plans-accent)", color: "white" }}
            >
              {featuredHighlight}
            </p>
          ) : null}
          <PlansContactRow shop={shop} theme={theme} className="mt-5" lightText={lightHero} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
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
