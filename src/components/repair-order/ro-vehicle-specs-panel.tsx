"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Battery,
  ChevronDown,
  ChevronRight,
  Circle,
  Droplets,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  TriangleAlert,
  Wind,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { tireSizeLabel } from "@/lib/tires";
import type { NhtsaRecallItem } from "@/lib/vehicle-recalls";
import {
  vehicleHasSpecsData,
  type VehicleSpecsView,
} from "@/lib/vehicle-specs-view";
import type { LastTireOrderSize } from "@/server/actions/vehicle-specs";
import { loadVehicleRecalls, updateVehicleMaintenanceSpecs, updateVehicleTireSizes } from "@/server/actions/vehicle-specs";
import type {
  MaintenanceSpecRow,
  VehicleMaintenanceMemoryView,
  VehicleMaintenanceOverrides,
} from "@/lib/vehicle-maintenance-specs";
import { maintenanceSectionHasData } from "@/lib/vehicle-maintenance-specs";
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

function MaintenanceSourceNote({ row }: { row: MaintenanceSpecRow }) {
  if (row.source === "manual") {
    return <p className="text-[10px] text-muted-foreground/90">On file</p>;
  }
  if (row.source === "history" && row.roNumber) {
    return (
      <p className="text-[10px] text-muted-foreground/90">
        RO #{row.roNumber}
        {row.roDate ? ` · ${new Date(row.roDate).toLocaleDateString()}` : ""}
      </p>
    );
  }
  return null;
}

function MaintenanceRows({ rows }: { rows: MaintenanceSpecRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="text-right font-medium text-foreground">{row.value ?? "—"}</span>
          </div>
          {row.value ? <MaintenanceSourceNote row={row} /> : null}
        </div>
      ))}
    </div>
  );
}

function MaintenanceEditDialog({
  open,
  onOpenChange,
  title,
  vehicleId,
  fields,
  values,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  vehicleId: string;
  fields: Array<{ key: keyof VehicleMaintenanceOverrides; label: string; placeholder?: string }>;
  values: VehicleMaintenanceOverrides;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const field of fields) {
      next[field.key] = values[field.key] ?? "";
    }
    setDraft(next);
    setError(null);
  }, [open, values, fields]);

  function save() {
    setError(null);
    const specs: VehicleMaintenanceOverrides = {};
    for (const field of fields) {
      specs[field.key] = draft[field.key]?.trim() || null;
    }
    start(async () => {
      const res = await updateVehicleMaintenanceSpecs({ vehicleId, specs });
      if (res.ok) {
        onOpenChange(false);
        onSaved();
      } else setError(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`maint-${field.key}`}>{field.label}</Label>
              <Input
                id={`maint-${field.key}`}
                value={draft[field.key] ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceSectionContent({
  vehicleId,
  rows,
  overrides,
  emptyHint,
  editTitle,
  editFields,
  canEdit,
}: {
  vehicleId: string;
  rows: MaintenanceSpecRow[];
  overrides: VehicleMaintenanceOverrides;
  emptyHint: string;
  editTitle: string;
  editFields: Array<{ key: keyof VehicleMaintenanceOverrides; label: string; placeholder?: string }>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const hasData = maintenanceSectionHasData(rows);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {hasData ? (
              <MaintenanceRows rows={rows} />
            ) : (
              <p className="text-muted-foreground">{emptyHint}</p>
            )}
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-brand-navy"
              title={`Edit ${editTitle.toLowerCase()}`}
            >
              <Pencil className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <MaintenanceEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editTitle}
        vehicleId={vehicleId}
        fields={editFields}
        values={overrides}
        onSaved={() => router.refresh()}
      />
    </>
  );
}

function specLinkClass(lightTheme: boolean) {
  return lightTheme ? "link-subtle" : "link-on-dark";
}

function ApplyLastOrderButton({
  vehicleId,
  lastOrder,
  onApplied,
  lightTheme,
}: {
  vehicleId: string;
  lastOrder: LastTireOrderSize;
  onApplied: () => void;
  lightTheme: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={cn(specLinkClass(lightTheme), "mt-1.5 text-[11px] disabled:opacity-50")}
      data-testid="tire-use-last-order"
      onClick={() => {
        start(async () => {
          const res = await updateVehicleTireSizes({
            vehicleId,
            tireSizeFront: lastOrder.tireSizeFront,
            tireSizeRear: lastOrder.tireSizeRear,
          });
          if (res.ok) onApplied();
        });
      }}
    >
      {pending ? "Saving…" : "Use last order size"}
    </button>
  );
}

function TireSizesDialog({
  open,
  onOpenChange,
  vehicleId,
  front,
  rear,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  front: string;
  rear: string;
  onSaved: () => void;
}) {
  const [sizeFront, setSizeFront] = useState(front);
  const [sizeRear, setSizeRear] = useState(rear);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) {
      setSizeFront(front);
      setSizeRear(rear);
      setError(null);
    }
  }, [open, front, rear]);

  function save() {
    setError(null);
    start(async () => {
      const res = await updateVehicleTireSizes({
        vehicleId,
        tireSizeFront: sizeFront.trim() || null,
        tireSizeRear: sizeRear.trim() || null,
      });
      if (res.ok) {
        onOpenChange(false);
        onSaved();
      } else setError(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tire sizes</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tire-front">Front / all</Label>
            <Input
              id="tire-front"
              value={sizeFront}
              onChange={(e) => setSizeFront(e.target.value)}
              placeholder="225/65R17"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tire-rear">Rear (optional)</Label>
            <Input
              id="tire-rear"
              value={sizeRear}
              onChange={(e) => setSizeRear(e.target.value)}
              placeholder="Same as front"
              className="font-mono"
            />
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TiresContent({
  vehicleId,
  tireSizeFront,
  tireSizeRear,
  lastOrder,
  canEdit,
  lightTheme,
}: {
  vehicleId: string;
  tireSizeFront: string | null;
  tireSizeRear: string | null;
  lastOrder: LastTireOrderSize | null;
  canEdit: boolean;
  lightTheme: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const savedLabel = tireSizeLabel(tireSizeFront, tireSizeRear);
  const orderLabel = lastOrder ? tireSizeLabel(lastOrder.tireSizeFront, lastOrder.tireSizeRear) : null;
  const showApplyBtn = canEdit && savedLabel === "—" && !!lastOrder && orderLabel !== "—";

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">On file</p>
            <p className="font-mono text-sm font-medium text-foreground">
              {savedLabel !== "—" ? savedLabel : "Not set"}
            </p>
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-brand-navy"
              title="Edit tire sizes"
            >
              <Pencil className="size-3.5" />
            </button>
          ) : null}
        </div>
        {lastOrder && orderLabel !== "—" ? (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Last tire order</p>
            <p className="font-mono text-sm text-foreground/90">{orderLabel}</p>
            <p className="text-[10px] text-muted-foreground/90">
              {new Date(lastOrder.createdAt).toLocaleDateString()}
            </p>
            {showApplyBtn ? (
              <ApplyLastOrderButton
                vehicleId={vehicleId}
                lastOrder={lastOrder}
                onApplied={() => router.refresh()}
                lightTheme={lightTheme}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground">No tire orders with a size recorded yet.</p>
        )}
      </div>
      <TireSizesDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        vehicleId={vehicleId}
        front={tireSizeFront ?? lastOrder?.tireSizeFront ?? ""}
        rear={tireSizeRear ?? lastOrder?.tireSizeRear ?? ""}
        onSaved={() => router.refresh()}
      />
    </>
  );
}

export function RoVehicleSpecsPanel({
  vehicleId,
  specs,
  tireSizeFront,
  tireSizeRear,
  lastTireOrder,
  maintenanceMemory,
  canEdit = true,
  lightTheme = false,
  embedded = false,
}: {
  vehicleId: string;
  specs: VehicleSpecsView;
  tireSizeFront: string | null;
  tireSizeRear: string | null;
  lastTireOrder: LastTireOrderSize | null;
  maintenanceMemory: VehicleMaintenanceMemoryView;
  canEdit?: boolean;
  lightTheme?: boolean;
  /** Estimate right rail / dialog — no mt-auto footer pinning. */
  embedded?: boolean;
}) {
  const fluidsHint = maintenanceMemory.hasHistory
    ? "No fluids on file — values from past ROs appear here automatically."
    : "Add specs or complete an oil service to build shop memory.";

  const filtersHint = maintenanceMemory.hasHistory
    ? "No filters on file — last used parts from RO history appear here."
    : "Add specs or sell filters on this vehicle to build shop memory.";

  const batteryHint = maintenanceMemory.hasHistory
    ? "No battery on file — last battery from RO history appears here."
    : "Add battery specs or replace a battery on this vehicle to build shop memory.";

  return (
    <div className={cn(embedded ? "border-b border-border" : "mt-auto border-t border-border")}>
      <SidebarAccordion icon={Droplets} title="Fluids">
        <MaintenanceSectionContent
          vehicleId={vehicleId}
          rows={maintenanceMemory.fluids}
          overrides={maintenanceMemory.overrides}
          emptyHint={fluidsHint}
          editTitle="Fluids"
          canEdit={canEdit}
          editFields={[
            { key: "engineOil", label: "Engine oil", placeholder: "5W-30 full synthetic" },
            { key: "oilCapacity", label: "Oil capacity", placeholder: "6 qt" },
            { key: "coolant", label: "Coolant", placeholder: "OEM blue coolant" },
          ]}
        />
      </SidebarAccordion>
      <SidebarAccordion icon={Wind} title="Filters & Blades">
        <MaintenanceSectionContent
          vehicleId={vehicleId}
          rows={maintenanceMemory.filters}
          overrides={maintenanceMemory.overrides}
          emptyHint={filtersHint}
          editTitle="Filters & blades"
          canEdit={canEdit}
          editFields={[
            { key: "oilFilter", label: "Oil filter", placeholder: "Motorcraft OF-1240" },
            { key: "airFilter", label: "Air filter", placeholder: "Fram CA10262" },
            { key: "cabinFilter", label: "Cabin filter", placeholder: "Bosch 6029C" },
            { key: "fuelFilter", label: "Fuel filter", placeholder: "WIX 33502" },
            { key: "wiperFront", label: "Wiper (front)", placeholder: "22 in" },
            { key: "wiperRear", label: "Wiper (rear)", placeholder: "18 in" },
          ]}
        />
      </SidebarAccordion>
      <SidebarAccordion icon={Circle} title="Tires">
        <TiresContent
          vehicleId={vehicleId}
          tireSizeFront={tireSizeFront}
          tireSizeRear={tireSizeRear}
          lastOrder={lastTireOrder}
          canEdit={canEdit}
          lightTheme={lightTheme}
        />
      </SidebarAccordion>
      <SidebarAccordion icon={Battery} title="Batteries">
        <MaintenanceSectionContent
          vehicleId={vehicleId}
          rows={maintenanceMemory.batteries}
          overrides={maintenanceMemory.overrides}
          emptyHint={batteryHint}
          editTitle="Battery"
          canEdit={canEdit}
          editFields={[
            { key: "battery", label: "Battery", placeholder: "Group 35 · 700 CCA" },
          ]}
        />
      </SidebarAccordion>
      <SidebarAccordion icon={FileText} title="Specs">
        <VehicleSpecsContent specs={specs} />
      </SidebarAccordion>
      <RecallsAccordion vehicleId={vehicleId} lightTheme={lightTheme} />
    </div>
  );
}
