"use client";

import { createContext, useContext, type ReactNode } from "react";

import { SMS_ENABLED } from "@/lib/features";
import type { PlanFeatureSet } from "@/lib/plans";

/** Per-shop plan capabilities for client UI (server still enforces). */
export type ShopCapabilities = {
  /** Two-way SMS / share-via-SMS — Pro+ only (also requires SMS_ENABLED). */
  sms: boolean;
  /** Stripe Connect / online RO checkout — Pro+ only. */
  stripePayments: boolean;
  /** Licensed MOTOR Labor Book — Pro+ only. */
  motorLabor: boolean;
  /** PartsTech / vendor parts lookup — Pro+ only. */
  partsTech: boolean;
  /** Growth Engine / marketing campaigns — Pro+ only. */
  marketingCampaigns: boolean;
  /** On-demand Vehicle Specs (identity + fluids) — Core + Pro; catalog/AI only on Specs open. */
  vehicleSpecs: boolean;
  /** Auto.dev plate→VIN lookup — Pro+ only (Core: manual plate + NHTSA VIN). */
  autodevDecoding: boolean;
  /** Smart AI repair-order intake — Core-only AI Plus add-on. */
  freeformRoIntake: boolean;
  /** Shop is on Core (STARTER) — Smart intake option only shown for Core. */
  corePlan: boolean;
  /** Resolved plan features — drives settings nav pruning on Core. */
  planFeatures: PlanFeatureSet;
};

const DEFAULT: ShopCapabilities = {
  sms: false,
  stripePayments: false,
  motorLabor: false,
  partsTech: false,
  marketingCampaigns: false,
  vehicleSpecs: false,
  autodevDecoding: false,
  freeformRoIntake: false,
  corePlan: false,
  planFeatures: {} as PlanFeatureSet,
};

const ShopCapabilitiesContext = createContext<ShopCapabilities>(DEFAULT);

export function ShopCapabilitiesProvider({
  value,
  children,
}: {
  value: ShopCapabilities;
  children: ReactNode;
}) {
  return (
    <ShopCapabilitiesContext.Provider value={value}>{children}</ShopCapabilitiesContext.Provider>
  );
}

export function useShopCapabilities(): ShopCapabilities {
  return useContext(ShopCapabilitiesContext);
}

/** Env kill switch AND plan entitlement — use for SMS buttons in the shop CRM. */
export function useSmsUiEnabled(): boolean {
  const caps = useShopCapabilities();
  return SMS_ENABLED && caps.sms;
}

/** Plan features for settings / admin UI gates. */
export function usePlanFeatures(): PlanFeatureSet {
  return useShopCapabilities().planFeatures;
}

/** Licensed MOTOR Labor Book UI — Pro+. */
export function useMotorLaborUiEnabled(): boolean {
  return useShopCapabilities().motorLabor;
}

/** PartsTech / vendor parts lookup UI — Pro+ only (never Core). */
export function usePartsTechUiEnabled(): boolean {
  return useShopCapabilities().partsTech;
}

/** Growth Engine / marketing campaigns UI — Pro+. */
export function useMarketingCampaignsUiEnabled(): boolean {
  return useShopCapabilities().marketingCampaigns;
}

/** On-demand Vehicle Specs UI — Core + Pro (not Auto.dev). */
export function useVehicleSpecsUiEnabled(): boolean {
  return useShopCapabilities().vehicleSpecs;
}

/** Stripe Connect / online checkout UI — Pro+. Core is manual payments only. */
export function useStripePaymentsUiEnabled(): boolean {
  return useShopCapabilities().stripePayments;
}

/** Auto.dev plate→VIN lookup UI — Pro+. */
export function useAutodevDecodingUiEnabled(): boolean {
  return useShopCapabilities().autodevDecoding;
}

/** Smart AI repair-order intake — Core-only AI Plus add-on. */
export function useSmartRoIntakeEnabled(): boolean {
  return useShopCapabilities().freeformRoIntake;
}

/** Alias for Smart AI intake entitlement checks in UI. */
export function useFreeformRoIntakeEnabled(): boolean {
  return useSmartRoIntakeEnabled();
}

/** True when active shop is on Core (STARTER) — Smart intake card is Core-only. */
export function useCorePlanShop(): boolean {
  return useShopCapabilities().corePlan;
}
