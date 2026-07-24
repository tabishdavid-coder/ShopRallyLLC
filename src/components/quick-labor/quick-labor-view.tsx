"use client";

import { TabishFridayLaborWorkspace } from "@/components/labor/tabish-friday-labor-workspace";
import { TABISH_FRIDAY_LABOR_TITLE } from "@/lib/tabish-friday-labor";

export function QuickLaborView() {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <TabishFridayLaborWorkspace requireGate className="min-h-0 flex-1" />
      <p className="shrink-0 border-t border-border/60 px-3 py-2 text-center text-[11px] text-muted-foreground">
        {TABISH_FRIDAY_LABOR_TITLE} · decode VIN or plate above, then stage labor and add to a new
        repair order from the dock.
      </p>
    </section>
  );
}
