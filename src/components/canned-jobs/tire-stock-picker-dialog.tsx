"use client";

import { useEffect, useState, useTransition } from "react";
import { Circle, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/format";
import type { TireStockRow } from "@/server/tire-stock";
import { fetchTireStockForPicker } from "@/server/actions/canned-jobs";
import { cn } from "@/lib/utils";

export function TireStockPickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (tire: TireStockRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [tires, setTires] = useState<TireStockRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setError(null);
    startTransition(async () => {
      const res = await fetchTireStockForPicker();
      if (res.ok) {
        setTires(res.tires);
        setTotal(res.total);
      } else {
        setError(res.error);
        setTires([]);
        setTotal(0);
      }
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const res = await fetchTireStockForPicker({ q: query.trim() || undefined });
        if (res.ok) {
          setTires(res.tires);
          setTotal(res.total);
          setError(null);
        } else {
          setError(res.error);
        }
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  function handlePick(tire: TireStockRow) {
    onPick(tire);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-brand-navy">
            <Circle className="size-4" aria-hidden />
            Choose tire from stock
          </DialogTitle>
          <DialogDescription>
            Pick a tire SKU from your shop stock. Size, brand, and cost populate the line automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stock #, size, brand, model…"
              className="h-9 pl-8"
              autoFocus
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {pending ? "Searching…" : `${total} tire SKU${total === 1 ? "" : "s"} in stock`}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {error ? (
            <p className="px-3 py-6 text-center text-sm text-brand-red">{error}</p>
          ) : pending && tires.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-brand-navy" />
            </div>
          ) : tires.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No matching tires in stock. Add tires under Tires in the sidebar, or enter a custom tire line
              manually.
            </p>
          ) : (
            <ul className="space-y-1">
              {tires.map((tire) => (
                <li key={tire.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(tire)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left",
                      "hover:border-brand-navy/15 hover:bg-brand-light/10",
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-light/50 text-brand-navy">
                      <Circle className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {tire.brand} {tire.model}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {tire.size}
                        {tire.loadSpeed ? ` · ${tire.loadSpeed}` : ""}
                        {tire.binLocation ? ` · Bin ${tire.binLocation}` : ""}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">#{tire.stockNumber}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs tabular-nums">
                      <span className="block font-semibold text-foreground">
                        {formatCents(tire.costCents)}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        QOH {tire.quantityOnHand}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-border bg-slate-50/80 px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
