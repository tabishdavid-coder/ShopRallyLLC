"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { ShopPlan } from "@/generated/prisma";
import type { PlanFeatureSet } from "@/lib/plans";
import {
  filterGroupedSettingsSections,
  filterSettingsSearchIndex,
  type SettingsSection,
  type SettingsSearchEntry,
} from "@/lib/settings-catalog";

type SettingsPlanContextValue = {
  plan: ShopPlan;
  features: PlanFeatureSet;
  sections: SettingsSection[];
  groupedSections: ReturnType<typeof filterGroupedSettingsSections>;
  searchIndex: SettingsSearchEntry[];
};

const SettingsPlanContext = createContext<SettingsPlanContextValue | null>(null);

export function SettingsPlanProvider({
  plan,
  features,
  children,
}: {
  plan: ShopPlan;
  features: PlanFeatureSet;
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const groupedSections = filterGroupedSettingsSections(features);
    const sections = groupedSections.flatMap((g) => g.sections);
    const searchIndex = filterSettingsSearchIndex(features);
    return { plan, features, sections, groupedSections, searchIndex };
  }, [plan, features]);

  return (
    <SettingsPlanContext.Provider value={value}>{children}</SettingsPlanContext.Provider>
  );
}

export function useSettingsPlan(): SettingsPlanContextValue {
  const ctx = useContext(SettingsPlanContext);
  if (!ctx) {
    throw new Error("useSettingsPlan must be used within SettingsPlanProvider");
  }
  return ctx;
}

/** Safe when provider is missing (returns unfiltered catalog). */
export function useSettingsPlanOptional(): SettingsPlanContextValue | null {
  return useContext(SettingsPlanContext);
}
