import { splitVinForDisplay } from "@/lib/ro-context-display";
import { cn } from "@/lib/utils";

/** Eight readable enterprise colors for per-character last-8 VIN emphasis (WCAG on white). */
export const VIN_LAST8_CHAR_COLORS = [
  "text-brand-navy",
  "text-brand-red",
  "text-brand-orange",
  "text-emerald-700",
  "text-amber-800",
  "text-sky-700",
  "text-indigo-700",
  "text-teal-700",
] as const;

export function vinLast8CharColor(index: number): (typeof VIN_LAST8_CHAR_COLORS)[number] {
  return VIN_LAST8_CHAR_COLORS[index % VIN_LAST8_CHAR_COLORS.length];
}

type VinDisplayProps = {
  vin: string;
  className?: string;
  mono?: boolean;
  /** Hide WMI/VDS prefix; show only the colorized last 8. */
  last8Only?: boolean;
  title?: string;
};

/** Full VIN with muted prefix and colorized last 8 characters. */
export function VinDisplay({
  vin,
  className,
  mono = true,
  last8Only = false,
  title,
}: VinDisplayProps) {
  const { full, prefix, last8 } = splitVinForDisplay(vin);

  return (
    <span
      className={cn(mono && "font-mono tabular-nums", className)}
      title={title ?? full}
      aria-label={`VIN ${full}`}
    >
      {!last8Only && prefix ? <span className="text-muted-foreground">{prefix}</span> : null}
      {last8.split("").map((char, i) => (
        <span key={`${i}-${char}`} className={cn("font-semibold", vinLast8CharColor(i))}>
          {char}
        </span>
      ))}
    </span>
  );
}
