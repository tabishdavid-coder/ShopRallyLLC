"use client";

import {
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  vehicleHasSpecsData,
  type VehicleSpecsView,
} from "@/lib/vehicle-specs-view";
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

export function RoVehicleSpecsPanel({
  specs,
  embedded = false,
}: {
  specs: VehicleSpecsView;
  /** Estimate right rail / dialog — no mt-auto footer pinning. */
  embedded?: boolean;
}) {
  return (
    <div className={cn(embedded ? "border-b border-border" : "mt-auto border-t border-border")}>
      <SidebarAccordion icon={FileText} title="Specs" defaultOpen>
        <VehicleSpecsContent specs={specs} />
      </SidebarAccordion>
    </div>
  );
}
