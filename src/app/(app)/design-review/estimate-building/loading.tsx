import { Loader2 } from "lucide-react";

export default function EstimateBuildingLabLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 py-3">
      <div className="shrink-0 space-y-2 px-1">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-brand-light/40 bg-muted/10">
        <Loader2 className="size-6 animate-spin text-brand-navy" aria-hidden />
        <div className="text-center">
          <p className="text-sm font-medium text-brand-navy">Loading estimate builder…</p>
          <p className="mt-1 text-xs text-muted-foreground">Design mode · live repair order data</p>
        </div>
      </div>
    </div>
  );
}
