"use client";

import { createContext, useContext, type ReactNode } from "react";

import { SMS_ENABLED } from "@/lib/features";

/** Per-shop plan capabilities for client UI (server still enforces). */
export type ShopCapabilities = {
  /** Two-way SMS / share-via-SMS — Pro+ only (also requires SMS_ENABLED). */
  sms: boolean;
  /** Stripe Connect / online RO checkout — Pro+ only. */
  stripePayments: boolean;
  /** Growth Engine campaigns / automations / booking hub. */
  growth: boolean;
  /** Care / maintenance programs hub. */
  maintenancePrograms: boolean;
  /** PartsTech punchout / live catalog. */
  partsTech: boolean;
  /** Licensed MOTOR labor (shop library stays on Core). */
  motorLabor: boolean;
  /** ShopSite editor / public site. */
  shopSite: boolean;
  /** Local SEO / Growth Engine SEO. */
  websiteSeo: boolean;
};

const DEFAULT: ShopCapabilities = {
  sms: false,
  stripePayments: false,
  growth: false,
  maintenancePrograms: false,
  partsTech: false,
  motorLabor: false,
  shopSite: false,
  websiteSeo: false,
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
