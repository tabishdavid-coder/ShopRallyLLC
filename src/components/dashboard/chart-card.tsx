import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ChartCardVariant = "revenue" | "status" | "appointments" | "payments";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  compact?: boolean;
  variant?: ChartCardVariant;
  action?: React.ReactNode;
  children: React.ReactNode;
  empty?: boolean;
  emptyMessage?: string;
};

const VARIANT_CHROME: Record<ChartCardVariant, string> = {
  revenue:
    "border-brand-light/25 bg-gradient-to-br from-brand-light/[0.08] via-card to-card shadow-[0_1px_0_0_oklch(0.68_0.145_230_/_0.15)_inset]",
  status:
    "border-brand-navy/12 bg-gradient-to-br from-brand-navy/[0.04] via-card to-brand-light/[0.03]",
  appointments:
    "border-brand-red/15 bg-gradient-to-br from-brand-red/[0.05] via-card to-brand-light/[0.03]",
  payments:
    "border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] via-card to-brand-light/[0.03]",
};

/** Consistent chart card chrome for shop home + analytics dashboard. */
export function ChartCard({
  title,
  subtitle,
  compact = false,
  variant,
  action,
  children,
  empty = false,
  emptyMessage = "No data for this period.",
}: ChartCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden shadow-sm",
        variant ? VARIANT_CHROME[variant] : "border-border/80 bg-card",
        compact && "flex min-h-[220px] flex-col gap-0 py-0",
      )}
    >
      <CardHeader
        className={cn(
          "flex flex-row items-start justify-between space-y-0",
          compact ? "shrink-0 px-3 py-2.5" : "pb-2",
        )}
      >
        <div className="min-w-0 space-y-0.5">
          <CardTitle
            className={cn(
              "font-semibold tracking-tight text-brand-navy",
              compact ? "text-sm" : "text-base",
            )}
          >
            {title}
          </CardTitle>
          {subtitle ? (
            <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </CardHeader>
      <CardContent
        className={cn(
          compact ? "min-h-[168px] flex-1 px-3 pb-3 pt-0" : "pb-4",
          !empty && "rounded-lg bg-white/60 p-2 md:bg-white/50",
          compact && !empty && "mx-2 mb-2 mt-0 px-1 pb-2",
        )}
      >
        {empty ? (
          <p
            className={cn(
              "text-center text-muted-foreground",
              compact ? "py-8 text-sm" : "py-10 text-sm",
            )}
          >
            {emptyMessage}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
