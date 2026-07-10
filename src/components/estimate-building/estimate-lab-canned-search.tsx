"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format";
import { filterCannedJobsByQuery } from "@/lib/canned-job-browse-filter";
import { estimateCannedJobSummaryTotal } from "@/lib/canned-job-estimate";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import type { LaborTier, PartTier } from "@/lib/matrix";
import { addCannedJobToRepairOrder } from "@/server/actions/canned-jobs";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";

const MAX_RESULTS = 8;

/** Inline typeahead — filters only; explicit Add / Enter on highlighted row writes to DB. */
export function EstimateLabCannedSearch({
  roId,
  jobs,
  baseRateCents,
  partTiers,
  laborTiers,
  onBrowse,
}: {
  roId: string;
  jobs: CannedJobSummary[];
  baseRateCents: number;
  partTiers: PartTier[];
  laborTiers: LaborTier[];
  onBrowse: (query: string) => void;
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [pending, start] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return filterCannedJobsByQuery(jobs, query).slice(0, MAX_RESULTS);
  }, [jobs, query]);

  const showDropdown = open && query.trim().length > 0;

  useEffect(() => {
    setHighlight(0);
  }, [query, results.length]);

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

  const addJob = useCallback(
    (job: CannedJobSummary) => {
      if (pending) return;
      start(async () => {
        const res = await addCannedJobToRepairOrder(roId, job.id);
        if (res.ok) {
          toast("success", `Added "${job.name}" to estimate`);
          setQuery("");
          setOpen(false);
          router.refresh();
        } else {
          toast("error", res.error);
        }
      });
    },
    [pending, roId, toast, router],
  );

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showDropdown && query.trim()) setOpen(true);
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
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (showDropdown && results.length > 0) {
        addJob(results[highlight]!);
      } else if (query.trim()) {
        onBrowse(query.trim());
      }
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-[12rem] flex-1 sm:max-w-sm">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#5B7295]" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        onKeyDown={onInputKeyDown}
        placeholder="Search jobs & templates"
        className="h-9 rounded-none border-[#DDE5EF] bg-white pl-8 text-sm shadow-none placeholder:text-[#5B7295] focus-visible:border-[#1E7FE0] focus-visible:ring-2 focus-visible:ring-[#1E7FE0]/25"
        aria-label="Search jobs & templates"
        aria-expanded={showDropdown}
        aria-controls="estimate-lab-canned-search-list"
        aria-autocomplete="list"
        role="combobox"
      />

      {showDropdown ? (
        <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-none border border-[#DDE5EF] bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">
              No matches — press Enter to open Browse
            </p>
          ) : (
            <ul
              id="estimate-lab-canned-search-list"
              ref={listRef}
              role="listbox"
              className="max-h-64 overflow-y-auto py-1"
            >
              {results.map((job, idx) => {
                const est = estimateCannedJobSummaryTotal(job, baseRateCents, partTiers, laborTiers);
                const active = idx === highlight;
                return (
                  <li key={job.id} role="presentation">
                    <div
                      role="option"
                      aria-selected={active}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5",
                        active ? "bg-brand-light/20" : "hover:bg-muted/50",
                      )}
                      onMouseEnter={() => setHighlight(idx)}
                      onDoubleClick={() => addJob(job)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{job.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {job.category ?? "Uncategorized"} · {job.laborHours.toFixed(1)}h · ~
                          {formatCents(est.totalCents)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        className={cn(
                          "h-7 shrink-0 gap-1 px-2 text-xs",
                          active && "bg-brand-navy hover:bg-brand-navy/90",
                        )}
                        disabled={pending}
                        onClick={(e) => {
                          e.stopPropagation();
                          addJob(job);
                        }}
                      >
                        {pending ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <>
                            <Plus className="size-3" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
            ↑↓ highlight · Enter Add · Double-click Add · Esc close
          </p>
        </div>
      ) : null}
    </div>
  );
}
