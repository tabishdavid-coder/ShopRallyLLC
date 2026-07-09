"use client";

import { createContext, useContext } from "react";

import type { SeoAutopilotPageData } from "@/server/seo-autopilot-page";

const SeoAutopilotContext = createContext<SeoAutopilotPageData | null>(null);

export function SeoAutopilotProvider({
  data,
  children,
}: {
  data: SeoAutopilotPageData;
  children: React.ReactNode;
}) {
  return <SeoAutopilotContext.Provider value={data}>{children}</SeoAutopilotContext.Provider>;
}

export function useSeoAutopilot(): SeoAutopilotPageData {
  const ctx = useContext(SeoAutopilotContext);
  if (!ctx) {
    throw new Error("useSeoAutopilot must be used within SeoAutopilotProvider");
  }
  return ctx;
}
