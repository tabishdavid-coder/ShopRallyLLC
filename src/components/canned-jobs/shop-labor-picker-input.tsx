"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/format";
import {
  shopLaborItemPriceCents,
  shopLaborItemToCannedLaborLine,
  type ShopLaborItemRow,
} from "@/lib/shop-labor-item-types";
import { cn } from "@/lib/utils";

/** Inline typeahead for picking shop labor catalog items in canned job builder. */
export function ShopLaborPickerInput({
  value,
  onChange,
  onPick,
  items = [],
  laborRateCents = 0,
  placeholder = "Search shop labor…",
  className,
  "aria-label": ariaLabel = "Labor name",
}: {
  value: string;
  onChange: (value: string) => void;
  onPick: (line: { description: string; hours: number; flatAmountCents: number | null }) => void;
  items?: ShopLaborItemRow[];
  laborRateCents?: number;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    const needle = value.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        (item.description?.toLowerCase().includes(needle) ?? false),
    );
  }, [items, value]);

  const showDropdown = open && results.length > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateDropdownPosition = useCallback(() => {
    const anchor = rootRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 224),
      zIndex: 100,
    });
  }, []);

  useEffect(() => {
    if (!showDropdown) {
      setDropdownStyle(null);
      return;
    }
    updateDropdownPosition();
    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [showDropdown, updateDropdownPosition, value]);

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
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(item: ShopLaborItemRow) {
    onPick(shopLaborItemToCannedLaborLine(item, laborRateCents));
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

  const dropdown =
    showDropdown && dropdownStyle ? (
      <div
        ref={dropdownRef}
        style={dropdownStyle}
        className="overflow-hidden rounded-md border border-border bg-white shadow-lg ring-1 ring-brand-navy/10"
      >
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="max-h-[280px] overflow-y-auto py-1"
        >
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
                    "flex w-full flex-col items-start px-2.5 py-2 text-left",
                    active ? "bg-brand-light/25" : "hover:bg-muted/50",
                  )}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(item);
                  }}
                >
                  <span className="truncate text-xs font-medium text-foreground">{item.name}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
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
    ) : null;

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
        aria-controls={listId}
        aria-autocomplete="list"
        role="combobox"
      />
      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
