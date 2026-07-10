"use client";

import { useMemo, useState } from "react";
import { Search, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { openRoLabelPrint, type RoLabelOption } from "@/lib/ro-label";
import { cn } from "@/lib/utils";

export function RoLabelPickerDialog({
  open,
  onOpenChange,
  options,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: RoLabelOption[];
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((opt) => {
      const hay = `#${opt.number} ${opt.customerName} ${opt.vehicleLabel} ${opt.statusLabel}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [options, q]);

  function pick(id: string) {
    openRoLabelPrint(id);
    onOpenChange(false);
    setQ("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQ("");
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-4 text-brand-navy" />
            Print RO Label
          </DialogTitle>
          <DialogDescription>
            Choose a repair order to open a print-ready hang tag.
          </DialogDescription>
        </DialogHeader>

        {options.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
            No repair orders on the board. Create or unfilter an RO first.
          </p>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search RO #, customer, vehicle…"
                className="h-8 pl-8 text-sm"
                autoFocus
              />
            </div>
            <ul className="max-h-72 space-y-1 overflow-y-auto pr-0.5">
              {filtered.length === 0 ? (
                <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No matches.
                </li>
              ) : (
                filtered.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => pick(opt.id)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 rounded-md border border-transparent px-3 py-2 text-left transition-colors",
                        "hover:border-brand-navy/25 hover:bg-brand-light/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-brand-navy">RO #{opt.number}</span>
                        <span className="text-[11px] text-muted-foreground">{opt.statusLabel}</span>
                      </span>
                      <span className="truncate text-sm text-foreground">{opt.customerName}</span>
                      <span className="truncate text-xs text-muted-foreground">{opt.vehicleLabel}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
