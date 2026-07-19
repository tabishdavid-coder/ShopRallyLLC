"use client";

import {
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  vehicleCanShowSpecsUi,
  vehicleHasSpecsData,
  vehicleYmmLabel,
  type VehicleSpecsView,
} from "@/lib/vehicle-specs-view";
import { VinDisplay } from "@/components/vin-display";
import { cn } from "@/lib/utils";

function SidebarSpecRow({
  label,
  value,
  rail,
}: {
  label: string;
  value: string | React.ReactNode | null;
  rail?: boolean;
}) {
  return (
    <div className={cn("flex justify-between gap-2", rail ? "py-1" : "py-0.5")}>
      <span className={cn(rail ? "text-[13px] text-[var(--jb-slate,#5b7295)]" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "text-right font-medium",
          rail ? "text-[13px] text-[var(--jb-ink,#0b1f3b)]" : "text-foreground",
        )}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function SidebarAccordion({
  icon: Icon,
  title,
  hint,
  children,
  defaultOpen,
  onOpenChange,
  rail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  rail?: boolean;
}) {
  /** Estimate right rail: always expanded — no collapse toggle. */
  if (rail) {
    return (
      <div>
        <div className="flex w-full items-center gap-2 border-b border-[var(--jb-line,#dde5ef)] px-3.5 py-2 text-left text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--jb-ink,#0b1f3b)]">
          <span className="min-w-0 flex-1 truncate">{title}</span>
          {hint ? (
            <span className="shrink-0 text-[11px] font-semibold normal-case tracking-normal text-[var(--jb-faint,#8ca2c0)]">
              {hint}
            </span>
          ) : null}
        </div>
        <div className="overflow-hidden px-3.5 py-2.5 text-[13px] text-[var(--jb-slate,#5b7295)]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <Collapsible defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="ro-sidebar-accordion-trigger group flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold tracking-tight text-foreground/90">
        <Icon className="ro-sidebar-accordion-icon size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {hint ? (
          <span className="shrink-0 text-[10px] font-semibold normal-case tracking-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:hidden" />
        <ChevronDown className="hidden size-4 shrink-0 text-brand-navy group-data-[state=open]:block" />
      </CollapsibleTrigger>
      <CollapsibleContent className="ro-sidebar-accordion-content overflow-hidden px-3 py-2 text-xs text-muted-foreground">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function VehicleSpecsContent({ specs, rail }: { specs: VehicleSpecsView; rail?: boolean }) {
  if (!vehicleCanShowSpecsUi(specs)) {
    return (
      <p className={rail ? "text-[13px] text-[var(--jb-slate,#5b7295)]" : undefined}>
        Add year, make, and model to see vehicle specs. VIN improves accuracy but is optional.
      </p>
    );
  }

  const ymm = vehicleYmmLabel(specs);
  const rich = vehicleHasSpecsData(specs);

  return (
    <div className="space-y-1.5">
      {ymm ? <SidebarSpecRow rail={rail} label="Vehicle" value={ymm} /> : null}
      {specs.vin ? (
        <SidebarSpecRow
          rail={rail}
          label="VIN"
          value={<VinDisplay vin={specs.vin} className={rail ? "text-[13px]" : "text-[12px]"} />}
        />
      ) : (
        <SidebarSpecRow rail={rail} label="VIN" value="—" />
      )}
      <SidebarSpecRow rail={rail} label="Engine" value={specs.engine} />
      {!rail
        ? specs.engineRows.map((row) => (
            <SidebarSpecRow key={row.label} label={row.label} value={row.value} />
          ))
        : null}
      <SidebarSpecRow rail={rail} label="Transmission" value={specs.transmission} />
      <SidebarSpecRow rail={rail} label="Drivetrain" value={specs.drivetrain} />
      {!rail ? <SidebarSpecRow label="Body" value={specs.bodyClass} /> : null}
      {!rail ? (
        <p className="pt-1 text-[10px] text-muted-foreground/90">
          {rich && specs.vin
            ? "From VIN decode · NHTSA vPIC"
            : "Identity from vehicle record · catalog enrichment when available"}
        </p>
      ) : null}
    </div>
  );
}

export function RoVehicleSpecsPanel({
  specs,
  embedded = false,
  /** Estimate right rail — Palette C card chrome, always expanded. */
  variant = "default",
}: {
  specs: VehicleSpecsView;
  /** Estimate right rail / dialog — no mt-auto footer pinning. */
  embedded?: boolean;
  variant?: "default" | "rail";
}) {
  const rail = variant === "rail";

  return (
    <div
      className={cn(
        rail
          ? undefined
          : embedded
            ? "border-b border-border"
            : "mt-auto border-t border-border",
      )}
    >
      <SidebarAccordion
        icon={FileText}
        title={rail ? "Vehicle specs" : "Specs"}
        hint={rail ? "vPIC" : undefined}
        defaultOpen
        rail={rail}
      >
        <VehicleSpecsContent specs={specs} rail={rail} />
      </SidebarAccordion>
    </div>
  );
}
