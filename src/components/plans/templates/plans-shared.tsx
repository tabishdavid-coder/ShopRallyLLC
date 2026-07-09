"use client";

import { ChevronDown, MapPin, Phone } from "lucide-react";

import { PoweredByShopRally } from "@/components/brand/powered-by-shoprally";
import type { PlanCardPreviewData } from "@/components/plans/plan-card-preview";
import { PlanCardPreview } from "@/components/plans/plan-card-preview";
import {
  VEHICLE_CLASSES,
  VEHICLE_CLASS_LABELS,
} from "@/lib/maintenance-programs";
import type { ResolvedPlansTheme } from "@/lib/plans-page-theme";
import { COLUMNS_GRID, getPlansSurfaceClasses } from "@/lib/plans-page-theme";
import type { MaintenanceVehicleClass } from "@/generated/prisma";
import { cn } from "@/lib/utils";

export type PlansPageShop = {
  name: string;
  phone: string | null;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export type PlansPageSettings = {
  termsDefault: string | null;
};

export type PlansPagePlan = PlanCardPreviewData & { id: string; terms?: string | null };

type SharedProps = {
  shop: PlansPageShop;
  settings: PlansPageSettings;
  plans: PlansPagePlan[];
  theme: ResolvedPlansTheme;
  heroTitle: string;
  heroSubtitle: string;
  featuredHighlight: string | null;
  usesClassPricing: boolean;
  vehicleClass: MaintenanceVehicleClass;
  onVehicleClassChange: (vc: MaintenanceVehicleClass) => void;
  onSelectPlan: (planId: string) => void;
  termsOpen: boolean;
  onTermsToggle: () => void;
  pageBg?: string;
};

export function PlansVehicleClassPicker({
  theme,
  vehicleClass,
  onVehicleClassChange,
  className,
}: Pick<SharedProps, "theme" | "vehicleClass" | "onVehicleClassChange"> & { className?: string }) {
  const surface = getPlansSurfaceClasses(theme);

  return (
    <div className={cn("mb-8 p-4", surface.panel, className)}>
      <p className={cn("mb-3 text-sm font-medium", surface.heading)}>
        Select your vehicle type for accurate pricing
      </p>
      <div className="flex flex-wrap gap-2">
        {VEHICLE_CLASSES.filter((c) => c !== "OTHER").map((vc) => (
          <button
            key={vc}
            type="button"
            onClick={() => onVehicleClassChange(vc)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              vehicleClass === vc ? "text-white" : surface.chipIdle,
            )}
            style={
              vehicleClass === vc
                ? { borderColor: `var(--plans-primary)`, backgroundColor: `var(--plans-primary)` }
                : undefined
            }
          >
            {VEHICLE_CLASS_LABELS[vc]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PlansContactRow({
  shop,
  theme,
  className,
  lightText = false,
}: {
  shop: PlansPageShop;
  theme: ResolvedPlansTheme;
  className?: string;
  lightText?: boolean;
}) {
  const addressLine = [shop.address, shop.city, shop.state, shop.zip].filter(Boolean).join(", ");
  const textCls = lightText ? "text-white/80 hover:text-white" : "text-muted-foreground";

  if (!theme.showPhone && !theme.showAddress) return null;
  if (!shop.phone && !addressLine) return null;

  return (
    <div className={cn("flex flex-wrap gap-4 text-sm", textCls, className)}>
      {theme.showPhone && shop.phone ? (
        <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-1.5">
          <Phone className="size-4 shrink-0" /> {shop.phone}
        </a>
      ) : null}
      {theme.showAddress && addressLine ? (
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-4 shrink-0" /> {addressLine}
        </span>
      ) : null}
    </div>
  );
}

export function PlansGrid({
  plans,
  theme,
  shopName,
  onSelectPlan,
}: {
  plans: PlansPagePlan[];
  theme: ResolvedPlansTheme;
  shopName: string;
  onSelectPlan: (planId: string) => void;
}) {
  if (plans.length === 0) {
    const surface = getPlansSurfaceClasses(theme);
    return (
      <p className={cn("p-8 text-center", surface.panel, surface.muted)}>
        No plans are available right now. Contact {shopName} for details.
      </p>
    );
  }

  return (
    <div className={COLUMNS_GRID[theme.columnsLayout]}>
      {plans.map((plan) => (
        <div key={plan.id} id={`plan-${plan.id}`} className="scroll-mt-8">
          <PlanCardPreview
            plan={plan}
            theme={theme}
            onSelect={() => onSelectPlan(plan.id)}
            signupDisabled={false}
          />
        </div>
      ))}
    </div>
  );
}

export function PlansTermsSection({
  theme,
  settings,
  plans,
  termsOpen,
  onTermsToggle,
}: Pick<SharedProps, "theme" | "settings" | "plans" | "termsOpen" | "onTermsToggle">) {
  if (!settings.termsDefault && !plans.some((p) => p.terms)) return null;

  const surface = getPlansSurfaceClasses(theme);

  return (
    <section className={cn("mt-10", surface.panel)}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between px-5 py-4 text-left font-medium",
          surface.heading,
        )}
        onClick={onTermsToggle}
      >
        Terms & conditions
        <ChevronDown className={cn("size-5 transition-transform", termsOpen && "rotate-180")} />
      </button>
      {termsOpen ? (
        <div
          className={cn(
            "space-y-4 border-t px-5 py-4 text-sm whitespace-pre-wrap",
            surface.border,
            surface.body,
          )}
        >
          {settings.termsDefault ? <p>{settings.termsDefault}</p> : null}
          {plans
            .filter((p) => p.terms)
            .map((p) => (
              <div key={p.id}>
                <p className={cn("font-medium", surface.emphasis)}>{p.name}</p>
                <p>{p.terms}</p>
              </div>
            ))}
        </div>
      ) : null}
    </section>
  );
}

export function PlansPageFooter({ theme }: { theme: ResolvedPlansTheme }) {
  const surface = getPlansSurfaceClasses(theme);

  return (
    <footer className={cn("border-t py-6 text-center", surface.footer)}>
      <PoweredByShopRally suffix="" />
    </footer>
  );
}

export function PlansShopLogo({
  shop,
  theme,
  className,
}: {
  shop: PlansPageShop;
  theme: ResolvedPlansTheme;
  className?: string;
}) {
  if (!theme.showLogo || !shop.logoUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={shop.logoUrl} alt="" className={cn("mb-4 h-10 w-auto object-contain", className)} />
  );
}

export type PlansTemplateProps = SharedProps;
