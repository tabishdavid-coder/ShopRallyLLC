import { Suspense } from "react";

import { SeoAutopilotProvider } from "@/components/marketing/seo-automation/seo-autopilot-context";
import { SeoAutopilotShell } from "@/components/marketing/seo-automation/seo-autopilot-shell";
import { growthEnginePageTitle, GROWTH_PRODUCTS } from "@/lib/growth-engine-brand";
import { loadSeoAutopilotPageData } from "@/server/seo-autopilot-page";

export const metadata = {
  title: growthEnginePageTitle(GROWTH_PRODUCTS.seoAutopilot.label),
};

export default async function SeoAutopilotLayout({ children }: { children: React.ReactNode }) {
  const data = await loadSeoAutopilotPageData();

  return (
    <SeoAutopilotProvider data={data}>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <SeoAutopilotShell>{children}</SeoAutopilotShell>
      </Suspense>
    </SeoAutopilotProvider>
  );
}
