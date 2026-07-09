"use client";

import { CornerDownLeft } from "lucide-react";

import { customerDisplayName } from "@/lib/format";
import { customerHistoryLabel } from "@/lib/customer-search";
import type { CustomerPick } from "@/lib/picker-types";
import { cn } from "@/lib/utils";

function EnterHint() {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      <CornerDownLeft className="size-2.5" /> Enter
    </span>
  );
}

export function CustomerSearchResults({
  results,
  searching,
  query,
  onSelect,
  onAddNew,
  showEnterHint = true,
  className,
}: {
  results: CustomerPick[];
  searching: boolean;
  query: string;
  onSelect: (c: CustomerPick) => void;
  onAddNew?: () => void;
  showEnterHint?: boolean;
  className?: string;
}) {
  const term = query.trim();

  if (term.length < 2) return null;

  if (searching && results.length === 0) {
    return (
      <div className={cn("px-3 py-2.5 text-sm text-muted-foreground", className)}>
        Searching…
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={cn("px-3 py-3 text-sm", className)}>
        {onAddNew ? (
          <button
            type="button"
            onClick={onAddNew}
            className="w-full rounded-md border border-brand-light/40 bg-brand-light/5 px-3 py-2.5 text-left transition-colors hover:bg-brand-light/10"
          >
            <span className="font-medium text-brand-navy">Add “{term}” as new customer</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Opens form with search text pre-filled
            </span>
          </button>
        ) : (
          <>
            <p className="font-medium text-foreground">No customers found</p>
            <p className="mt-1 text-muted-foreground">
              Try name, phone, email, plate, or VIN — or add a new customer.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {results.map((c, i) => {
        const history = customerHistoryLabel(c);
        const contact = [c.phone, c.email].filter(Boolean).join(" · ");
        const subline = [contact, c.vehicleHint].filter(Boolean).join(" · ");

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{customerDisplayName(c)}</span>
                {c.roCount > 0 ? (
                  <span className="rounded bg-brand-navy/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
                    Returning
                  </span>
                ) : null}
              </div>
              {subline ? (
                <div className="truncate text-xs text-muted-foreground">{subline}</div>
              ) : null}
              {history ? (
                <div className="text-xs text-muted-foreground/80">{history}</div>
              ) : null}
            </div>
            {showEnterHint && i === 0 ? <EnterHint /> : null}
          </button>
        );
      })}
    </>
  );
}
