"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/format";
import {
  shopLaborItemPriceCents,
  shopLaborItemToCannedLaborLine,
  type ShopLaborItemRow,
} from "@/lib/shop-labor-item-types";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 8;

/** Inline typeahead for picking shop labor catalog items in canned job builder. */
export function ShopLaborPickerInput({
  value,
  onChange,
  onPick,
  items = [],
  placeholder = "Search shop labor…",
  className,
  "aria-label": ariaLabel = "Labor name",
}: {
  value: string;
  onChange: (value: string) => void;
  onPick: (line: { description: string; hours: number; flatAmountCents: number | null }) => void;
  items?: ShopLaborItemRow[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const needle = value.trim().toLowerCase();
    if (!needle) return items.slice(0, MAX_RESULTS);
    return items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(needle) ||
          (item.description?.toLowerCase().includes(needle) ?? false),
      )
      .slice(0, MAX_RESULTS);
  }, [items, value]);

  const showDropdown = open && results.length > 0;

  useEffect(() => {
    setHighlight(0);
  }, [value, results.length]);

  useEffect(() => {
    if (!showDropdown) return;
    const el = listRef.current?.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, showDropdown]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(item: ShopLaborItemRow) {
    onPick(shopLaborItemToCannedLaborLine(item));
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else if (results.length) setHighlight((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length) setHighlight((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter" && showDropdown && results.length > 0) {
      e.preventDefault();
      pick(results[highlight]!);
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cn("pl-7", className)}
        aria-label={ariaLabel}
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        role="combobox"
      />
      {showDropdown ? (
        <div className="absolute top-full z-50 mt-1 w-full min-w-[14rem] overflow-hidden rounded-md border border-border bg-white shadow-lg">
          <ul ref={listRef} role="listbox" className="max-h-48 overflow-y-auto py-1">
            {results.map((item, idx) => {
              const active = idx === highlight;
              const price = shopLaborItemPriceCents(item);
              return (
                <li key={item.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "flex w-full flex-col items-start px-2.5 py-1.5 text-left",
                      active ? "bg-brand-light/25" : "hover:bg-muted/50",
                    )}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(item);
                    }}
                  >
                    <span className="truncate text-xs font-medium text-foreground">{item.name}</span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {item.defaultHours > 0 ? `${item.defaultHours.toFixed(2)}h` : "Flat"}
                      {price > 0 ? ` · ${formatCents(price)}` : ""}
                      {item.rateCents > 0 ? ` · ${formatCents(item.rateCents)}/hr` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
