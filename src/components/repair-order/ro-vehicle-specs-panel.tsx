"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { NhtsaRecallItem } from "@/lib/vehicle-recalls";
import {
  vehicleHasSpecsData,
  type VehicleSpecsView,
} from "@/lib/vehicle-specs-view";
import { loadVehicleRecalls } from "@/server/actions/vehicle-specs";
import { VinDisplay } from "@/components/vin-display";
import { cn } from "@/lib/utils";

function SidebarSpecRow({ label, value }: { label: string; value: string | React.ReactNode | null }) {
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value ?? "—"}</span>
    </div>
  );
}

function SidebarAccordion({
  icon: Icon,
  title,
  children,
  defaultOpen,
  onOpenChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="ro-sidebar-accordion-trigger group flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold tracking-tight text-foreground/90">
        <Icon className="ro-sidebar-accordion-icon size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:hidden" />
        <ChevronDown className="hidden size-4 shrink-0 text-brand-navy group-data-[state=open]:block" />
      </CollapsibleTrigger>
      <CollapsibleContent className="ro-sidebar-accordion-content overflow-hidden px-3 py-2 text-xs text-muted-foreground">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function VehicleSpecsContent({ specs }: { specs: VehicleSpecsView }) {
  if (!vehicleHasSpecsData(specs)) {
    return (
      <p>
        Add a VIN or complete year/make/model on the vehicle to see decoded specifications.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {specs.vin ? (
        <SidebarSpecRow label="VIN" value={<VinDisplay vin={specs.vin} className="text-[13px]" />} />
      ) : null}
      {[specs.year, specs.make, specs.model, specs.trim].filter(Boolean).length ? (
        <SidebarSpecRow
          label="Vehicle"
          value={[specs.year, specs.make, specs.model, specs.trim].filter(Boolean).join(" ")}
        />
      ) : null}
      {specs.engine ? <SidebarSpecRow label="Engine" value={specs.engine} /> : null}
      {specs.engineRows.map((row) => (
        <SidebarSpecRow key={row.label} label={row.label} value={row.value} />
      ))}
      <SidebarSpecRow label="Transmission" value={specs.transmission} />
      <SidebarSpecRow label="Drivetrain" value={specs.drivetrain} />
      <SidebarSpecRow label="Body" value={specs.bodyClass} />
      <p className="pt-1 text-[10px] text-muted-foreground/90">From VIN decode · NHTSA vPIC</p>
    </div>
  );
}

function specLinkClass(lightTheme: boolean) {
  return lightTheme ? "link-subtle" : "link-on-dark";
}

function RecallsAccordion({ vehicleId, lightTheme }: { vehicleId: string; lightTheme: boolean }) {
  const [opened, setOpened] = useState(false);
  const [pending, start] = useTransition();
  const [items, setItems] = useState<NhtsaRecallItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  function load(force?: boolean) {
    if (!force && items !== null) return;
    setError(null);
    start(async () => {
      const res = await loadVehicleRecalls(vehicleId);
      if (res.ok) {
        setItems(res.items);
        setFetchedAt(res.fetchedAt);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <SidebarAccordion
      icon={TriangleAlert}
      title="Recalls & campaigns"
      onOpenChange={(next) => {
        setOpened(next);
        if (next) load();
      }}
    >
      {!opened && items === null ? (
        <p>Expand to load NHTSA safety recalls for this vehicle.</p>
      ) : pending && items === null ? (
        <p className="flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin" /> Loading recalls…
        </p>
      ) : error ? (
        <div className="space-y-2">
          <p className="text-amber-200/90">{error}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 border-border bg-transparent text-xs text-brand-navy hover:bg-muted"
            onClick={() => load(true)}
          >
            Retry
          </Button>
        </div>
      ) : items && items.length === 0 ? (
        <p>No open NHTSA campaigns found for this year/make/model.</p>
      ) : items ? (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.campaignNumber} className="rounded border border-border bg-muted/40 p-2">
              <p className="font-medium text-foreground">{r.component}</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{r.campaignNumber}</p>
              <p className="mt-1 text-foreground/85">{r.summary}</p>
              {r.remedy ? (
                <p className="mt-1 text-muted-foreground">
                  <span className="text-muted-foreground">Remedy:</span> {r.remedy}
                </p>
              ) : null}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {fetchedAt ? (
              <p className="text-[10px] text-muted-foreground/90">
                NHTSA · updated {new Date(fetchedAt).toLocaleDateString()}
              </p>
            ) : null}
            <button
              type="button"
              className={cn("inline-flex items-center gap-1 text-[10px]", specLinkClass(lightTheme))}
              onClick={() => load(true)}
              disabled={pending}
            >
              Refresh
            </button>
            <a
              href="https://www.nhtsa.gov/recalls"
              target="_blank"
              rel="noopener noreferrer"
              className={cn("inline-flex items-center gap-1 text-[10px]", specLinkClass(lightTheme))}
            >
              NHTSA.gov <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      ) : null}
    </SidebarAccordion>
  );
}

export function RoVehicleSpecsPanel({
  vehicleId,
  specs,
  lightTheme = false,
  embedded = false,
}: {
  vehicleId: string;
  specs: VehicleSpecsView;
  lightTheme?: boolean;
  /** Estimate right rail / dialog — no mt-auto footer pinning. */
  embedded?: boolean;
}) {
  return (
    <div className={cn(embedded ? "border-b border-border" : "mt-auto border-t border-border")}>
      <SidebarAccordion icon={FileText} title="Specs" defaultOpen>
        <VehicleSpecsContent specs={specs} />
      </SidebarAccordion>
      <RecallsAccordion vehicleId={vehicleId} lightTheme={lightTheme} />
    </div>
  );
}
