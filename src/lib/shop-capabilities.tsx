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
  /** Resolved plan features — drives settings nav pruning on Core. */
  planFeatures: PlanFeatureSet;
};

const DEFAULT: ShopCapabilities = {
  sms: false,
  stripePayments: false,
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
