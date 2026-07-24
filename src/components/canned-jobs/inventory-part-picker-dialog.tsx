"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Package, Search } from "lucide-react";

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
import type { InventoryPartRow } from "@/server/inventory";
import { fetchInventoryPartsForPicker } from "@/server/actions/canned-jobs";
import { cn } from "@/lib/utils";

export function InventoryPartPickerDialog({
  open,
  onOpenChange,
  onPick,
  onManualEntry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (part: InventoryPartRow) => void;
  onManualEntry?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [parts, setParts] = useState<InventoryPartRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setError(null);
    startTransition(async () => {
      const res = await fetchInventoryPartsForPicker();
      if (res.ok) {
        setParts(res.parts);
        setTotal(res.total);
      } else {
        setError(res.error);
        setParts([]);
        setTotal(0);
      }
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const res = await fetchInventoryPartsForPicker({ q: query.trim() || undefined });
        if (res.ok) {
          setParts(res.parts);
          setTotal(res.total);
          setError(null);
        } else {
          setError(res.error);
        }
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  function handlePick(part: InventoryPartRow) {
    onPick(part);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-brand-navy">
            <Package className="size-4" aria-hidden />
            Choose part from inventory
          </DialogTitle>
          <DialogDescription>
            Pick a stocked part — name, part number, and cost fill in automatically. You can still edit
            after adding.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search part #, description, brand…"
              className="h-9 pl-8"
              autoFocus
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {pending ? "Searching…" : `${total} part${total === 1 ? "" : "s"} in stock`}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {error ? (
            <p className="px-3 py-6 text-center text-sm text-brand-red">{error}</p>
          ) : pending && parts.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-brand-navy" />
            </div>
          ) : parts.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No matching parts in inventory. Add parts under Parts in the sidebar, or enter a custom line
              manually.
            </p>
          ) : (
            <ul className="space-y-1">
              {parts.map((part) => (
                <li key={part.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(part)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left",
                      "hover:border-brand-navy/15 hover:bg-brand-light/10",
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy/10 text-brand-navy">
                      <Package className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {part.description}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        #{part.partNumber}
                        {part.brand ? ` · ${part.brand}` : ""}
                        {part.binLocation ? ` · Bin ${part.binLocation}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs tabular-nums">
                      <span className="block font-semibold text-foreground">
                        {formatCents(part.costCents)}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        QOH {part.quantityOnHand}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-slate-50/80 px-5 py-3">
          {onManualEntry ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-brand-navy hover:text-brand-navy"
              onClick={onManualEntry}
            >
              Enter manually
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
