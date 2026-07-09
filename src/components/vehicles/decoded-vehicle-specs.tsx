import { engineDetailRows, parseEngineString, type EngineDetails } from "@/lib/engine-details";
import { cn } from "@/lib/utils";

function Spec({
  label,
  value,
  highlighted,
}: {
  label: string;
  value: string | null;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-2 rounded px-2 py-1",
        highlighted && "bg-brand-light/15",
      )}
    >
      <span className="text-foreground/55">{label}</span>
      <span className="text-right font-medium text-foreground">{value ?? "—"}</span>
    </div>
  );
}

/** Engine breakdown + drivetrain/trans/body specs after a VIN decode. */
export function DecodedVehicleSpecs({
  decoded,
  vin,
  className,
  highlighted = false,
}: {
  decoded: {
    engine: string | null;
    engineDetails: EngineDetails;
    transmission: string | null;
    drivetrain: string | null;
    bodyClass: string | null;
  };
  vin?: string | null;
  className?: string;
  /** Light-blue row highlights for add-vehicle found state. */
  highlighted?: boolean;
}) {
  const engineDetails: EngineDetails =
    decoded.engineDetails ?? parseEngineString(decoded.engine);
  const engineRows = engineDetailRows(engineDetails, decoded.engine);

  return (
    <div className={cn("space-y-3 text-sm", className)}>
      {vin ? (
        <div
          className={cn(
            "flex justify-between gap-2 border-b border-brand-navy/15 pb-2 font-mono text-xs uppercase",
            highlighted && "rounded bg-brand-light/15 px-2 py-1.5",
          )}
        >
          <span className="text-foreground/55">VIN</span>
          <span className="font-medium text-foreground">{vin}</span>
        </div>
      ) : null}

      {engineRows.length > 0 ? (
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-navy">
            Engine
          </div>
          <div
            className={cn(
              "space-y-1 rounded-md border px-2.5 py-2",
              highlighted
                ? "border-brand-navy/15 bg-brand-light/10"
                : "border-border/70 bg-background/80",
            )}
          >
            {decoded.engine && engineRows.length > 1 ? (
              <p className="mb-1 border-b border-brand-navy/10 pb-1.5 text-xs font-medium text-brand-navy">
                {decoded.engine}
              </p>
            ) : null}
            {engineRows.map((row) => (
              <Spec key={row.label} label={row.label} value={row.value} highlighted={highlighted} />
            ))}
          </div>
        </div>
      ) : decoded.engine ? (
        <Spec label="Engine" value={decoded.engine} />
      ) : null}

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        <Spec label="Transmission" value={decoded.transmission} highlighted={highlighted} />
        <Spec label="Drivetrain" value={decoded.drivetrain} highlighted={highlighted} />
        <Spec label="Body" value={decoded.bodyClass} highlighted={highlighted} />
      </div>
    </div>
  );
}
