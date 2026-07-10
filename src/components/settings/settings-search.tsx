"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  groupedSettingsSections,
  searchSettings,
  type SettingsSearchEntry,
} from "@/lib/settings-catalog";

/**
 * Settings command search. Typeahead over every section + deep-linkable
 * sub-page. Empty state shows the full grouped catalog (command-palette
 * landing). Keyboard: ↑/↓ move, Enter navigate, Esc close, ⌘/Ctrl-K focus.
 */
export function SettingsSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo<SettingsSearchEntry[]>(() => {
    if (query.trim()) return searchSettings(query, 8);
    // Empty state: flatten the grouped catalog into a browsable list.
    return groupedSettingsSections().flatMap(({ group, sections }) =>
      sections.map((s) => ({
        key: s.id,
        label: s.label,
        href: s.href,
        icon: s.icon,
        sectionLabel: s.label,
        groupLabel: group.label,
        description: s.description,
        haystack: "",
        isChild: false,
      })),
    );
  }, [query]);

  useEffect(() => setActive(0), [query]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // ⌘K / Ctrl-K global focus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Keep the active item scrolled into view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function go(entry: SettingsSearchEntry | undefined) {
    if (!entry) return;
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(entry.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (query) setQuery("");
      else {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
  }

  return (
    <div ref={rootRef} className="relative w-full sm:max-w-md">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-background px-3 shadow-sm transition-colors",
          open ? "border-brand-light ring-3 ring-brand-light/40" : "border-input",
        )}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          placeholder="Search settings…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : (
          <kbd className="hidden shrink-0 items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground sm:flex">
            ⌘K
          </kbd>
        )}
      </div>

      {open ? (
        <div
          id={listId}
          role="listbox"
          ref={listRef}
          className="absolute z-50 mt-2 max-h-[22rem] w-full overflow-y-auto rounded-lg border bg-popover p-1.5 shadow-lg"
        >
          {query.trim() ? null : (
            <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Jump to a section
            </p>
          )}
          {results.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">
              No settings match “{query.trim()}”.
            </p>
          ) : (
            results.map((entry, i) => {
              const Icon = entry.icon;
              const isActive = i === active;
              return (
                <button
                  key={entry.key}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  data-idx={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(entry)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                    isActive ? "bg-brand-light/40 text-brand-navy" : "hover:bg-muted/70",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md border",
                      isActive
                        ? "border-brand-light/60 bg-white text-brand-navy"
                        : "bg-muted/60 text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{entry.label}</span>
                      {entry.isChild ? (
                        <span className="truncate text-xs text-muted-foreground">
                          · {entry.sectionLabel}
                        </span>
                      ) : null}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {entry.description ?? `${entry.groupLabel} settings`}
                    </span>
                  </span>
                  {isActive ? (
                    <CornerDownLeft className="size-3.5 shrink-0 text-brand-navy/60" aria-hidden />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
