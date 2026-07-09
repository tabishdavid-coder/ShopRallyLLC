"use client";

import { VinDisplay } from "@/components/vin-display";
import { engineDetailRows } from "@/lib/engine-details";
import type { QuickLaborVehicle } from "@/lib/quick-labor";
import { quickLaborVehicleLabel } from "@/lib/quick-labor";
import { cn } from "@/lib/utils";
import type { DecodedVin } from "@/server/services/vin";

function SpecPill({ label, value }: { label: string; value: string }) {
  const isVin = label === "VIN";
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] leading-tight">
      <span className="shrink-0 font-medium text-subtle-foreground">{label}</span>
      <span className={cn("truncate font-semibold", !isVin && "text-foreground")}>
        {isVin ? <VinDisplay vin={value} className="text-[11px] leading-tight" /> : value}
      </span>
    </span>
  );
}

/** Dense horizontal vehicle summary after VIN/plate decode. */
export function QuickLaborVehicleStrip({
  vehicle,
  decoded,
  displayVin,
  onChange,
  className,
}: {
  vehicle: QuickLaborVehicle;
  decoded: DecodedVin;
  displayVin: string | null;
  onChange: () => void;
  className?: string;
}) {
  const label = quickLaborVehicleLabel(vehicle);
  const engineRows = engineDetailRows(decoded.engineDetails, decoded.engine);
  const disp = engineRows.find((r) => r.label === "Displacement")?.value;
  const config = engineRows.find((r) => r.label === "Configuration")?.value;
  const engineShort =
    disp && config ? `${disp} ${config}` : (decoded.engine ?? vehicle.engine ?? null);

  const pills: { label: string; value: string }[] = [];
  if (displayVin) pills.push({ label: "VIN", value: displayVin });
  if (engineShort) pills.push({ label: "Engine", value: engineShort });
  if (decoded.transmission) pills.push({ label: "Trans", value: decoded.transmission });
  if (decoded.drivetrain || vehicle.drivetrain) {
    pills.push({ label: "Drive", value: decoded.drivetrain ?? vehicle.drivetrain! });
  }
  if (decoded.bodyClass) pills.push({ label: "Body", value: decoded.bodyClass });
  if (vehicle.plate) {
    pills.push({
      label: "Plate",
      value: [vehicle.plate, vehicle.plateState].filter(Boolean).join(" "),
    });
  }

  return (
    <div
      className={cn(
        "flex flex-nowrap items-center gap-x-2 gap-y-1 overflow-x-auto border-b border-emerald-200/60 bg-emerald-50/50 px-3 py-1.5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="size-1.5 shrink-0 rounded-full bg-emerald-600"
          aria-hidden
        />
        <p className="min-w-0 truncate text-sm font-semibold text-emerald-950">{label}</p>
      </div>

      <div className="flex min-w-0 flex-[2] flex-wrap items-center gap-1.5">
        {pills.map((p) => (
          <SpecPill key={p.label} label={p.label} value={p.value} />
        ))}
      </div>

      <button
        type="button"
        onClick={onChange}
        className="shrink-0 text-xs font-medium text-brand-navy underline-offset-2 hover:underline"
      >
        Change vehicle
      </button>
    </div>
  );
}
