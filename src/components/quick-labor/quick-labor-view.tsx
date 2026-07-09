"use client";

import { useState } from "react";

import { QuickLaborGuidePanel } from "@/components/quick-labor/quick-labor-guide-panel";
import {
  QuickLaborVehicleLookup,
  type QuickLaborVehicleContext,
} from "@/components/quick-labor/quick-labor-vehicle-lookup";

export function QuickLaborView() {
  const [context, setContext] = useState<QuickLaborVehicleContext | null>(null);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <QuickLaborVehicleLookup context={context} onContextChange={setContext} />
      {context ? (
        <QuickLaborGuidePanel vehicle={context.vehicle} embedded />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 px-4 py-6 text-center">
          <p className="max-w-md text-xs text-muted-foreground">
            Enter a plate or VIN above to search labor times and browse the shop library.
          </p>
        </div>
      )}
    </section>
  );
}
