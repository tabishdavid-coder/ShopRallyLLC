import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DesignModeMergedHub } from "@/components/design-mode/design-mode-merged-hub";

export const metadata = { title: "Design mode — Merged CRM" };

export default async function DesignModePage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string }>;
}) {
  const sp = await searchParams;
  if (sp.design !== "open") {
    redirect("/design-mode?design=open");
  }

  return (
    <Suspense fallback={<DesignModeHubFallback />}>
      <DesignModeMergedHub />
    </Suspense>
  );
}

function DesignModeHubFallback() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-4 py-8">
      <div className="h-32 rounded-xl bg-muted/40" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-28 rounded-xl bg-muted/30" />
        <div className="h-28 rounded-xl bg-muted/30" />
        <div className="h-28 rounded-xl bg-muted/30" />
      </div>
    </div>
  );
}
