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

export function TemplateClassic(props: PlansTemplateProps) {
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
    pageBg = "bg-muted/30",
  } = props;

  const fonts = FONT_SCALE[theme.fontScale];
  const heroBg =
    theme.heroStyle === "gradient"
      ? { background: `linear-gradient(135deg, var(--plans-primary) 0%, var(--plans-accent) 100%)` }
      : theme.heroStyle === "minimal"
        ? { background: "white", color: "var(--plans-primary)" }
        : { backgroundColor: "var(--plans-primary)" };

  const heroTextLight = theme.heroStyle !== "minimal";

  return (
    <div className={cn("min-h-dvh", pageBg)} style={themeCssVars(theme)}>
      <header className={cn("border-b text-white", theme.heroStyle === "minimal" && "border-b-2")} style={heroBg}>
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <PlansShopLogo shop={shop} theme={theme} />
          <h1
            className={cn("font-bold tracking-tight", fonts.heroTitle)}
            style={theme.heroStyle === "minimal" ? { color: "var(--plans-primary)" } : undefined}
          >
            {heroTitle}
          </h1>
          <p
            className={cn("mt-3 max-w-2xl", fonts.heroSubtitle)}
            style={
              theme.heroStyle === "minimal"
                ? { color: "var(--plans-primary)", opacity: 0.75 }
                : { color: "rgba(255,255,255,0.85)" }
            }
          >
            {heroSubtitle}
          </p>
          {featuredHighlight ? (
            <p
              className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium"
              style={
                heroTextLight
                  ? { backgroundColor: "rgba(255,255,255,0.15)", color: "white" }
                  : { backgroundColor: "var(--plans-accent)", color: "white", opacity: 0.9 }
              }
            >
              {featuredHighlight}
            </p>
          ) : null}
          <PlansContactRow shop={shop} theme={theme} className="mt-4" lightText={heroTextLight} />
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
