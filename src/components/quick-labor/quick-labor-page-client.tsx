"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

const QuickLaborView = dynamic(
  () => import("@/components/quick-labor/quick-labor-view").then((mod) => mod.QuickLaborView),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-xl border border-border/80 bg-card">
        <Skeleton className="h-9 w-56" />
      </div>
    ),
  },
);

export function QuickLaborPageClient() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 workspace-surface">
      <header className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Quick Labor</h1>
        <p className="text-xs text-muted-foreground">
          Tabish Friday Labor by VIN or plate — no customer or repair order required.
        </p>
      </header>
      <QuickLaborView />
    </div>
  );
}
