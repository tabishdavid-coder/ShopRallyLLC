"use client";

import { createContext, useContext, type ReactNode } from "react";

import { SMS_ENABLED } from "@/lib/features";

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
  /** VIN/vPIC vehicle specs rail — Pro+ only (Core uses manual YMM). */
  vehicleSpecs: boolean;
};

const DEFAULT: ShopCapabilities = {
  sms: false,
  stripePayments: false,
  motorLabor: false,
  partsTech: false,
  marketingCampaigns: false,
  vehicleSpecs: false,
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

/** Licensed MOTOR Labor Book UI — Pro+. */
export function useMotorLaborUiEnabled(): boolean {
  return useShopCapabilities().motorLabor;
}

/** PartsTech / vendor parts lookup UI — Pro+. */
export function usePartsTechUiEnabled(): boolean {
  return useShopCapabilities().partsTech;
}

/** Growth Engine / marketing campaigns UI — Pro+. */
export function useMarketingCampaignsUiEnabled(): boolean {
  return useShopCapabilities().marketingCampaigns;
}

/** VIN/vPIC vehicle specs rail — Pro+. */
export function useVehicleSpecsUiEnabled(): boolean {
  return useShopCapabilities().vehicleSpecs;
}
