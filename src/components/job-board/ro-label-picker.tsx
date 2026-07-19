"use client";

import { useMemo, useState } from "react";
import { Printer, Search, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { openRoLabelPrint, type RoLabelOption } from "@/lib/ro-label";
import { cn } from "@/lib/utils";

export function RoLabelPicker({
  options,
  className,
}: {
  options: RoLabelOption[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
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
    setOpen(false);
    setQ("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next && options.length === 1) {
          openRoLabelPrint(options[0]!.id);
          return;
        }
        setOpen(next);
        if (!next) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          title="Print RO hang-tag label"
        >
          <Tag className="size-3.5" />
          <span className="hidden 2xl:inline">RO Label</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[22rem] gap-0 overflow-hidden p-0"
      >
        <PopoverHeader className="border-b border-border/70 bg-brand-navy/[0.04] px-3 py-2.5">
          <PopoverTitle className="flex items-center gap-1.5 text-sm font-semibold text-brand-navy">
            <Tag className="size-3.5" />
            Print RO Label
          </PopoverTitle>
          <PopoverDescription className="text-xs">
            Pick a board RO to open a print-ready hang tag.
          </PopoverDescription>
        </PopoverHeader>

        <div className="flex flex-col gap-2 p-2.5">
          {options.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-5 text-center text-xs text-muted-foreground">
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
                  className="h-8 pl-8 text-xs"
                  autoFocus
                />
              </div>
              <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-0.5">
                {filtered.length === 0 ? (
                  <li className="px-2 py-5 text-center text-xs text-muted-foreground">
                    No matches.
                  </li>
                ) : (
                  filtered.map((opt) => (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => pick(opt.id)}
                        className={cn(
                          "group flex w-full items-start gap-2 rounded-md border border-transparent px-2.5 py-2 text-left transition-colors",
                          "hover:border-brand-navy/25 hover:bg-brand-light/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-brand-navy">
                              RO #{opt.number}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {opt.statusLabel}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-foreground">
                            {opt.customerName}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {opt.vehicleLabel}
                          </span>
                        </span>
                        <Printer className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
