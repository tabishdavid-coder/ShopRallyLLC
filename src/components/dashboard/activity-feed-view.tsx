"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, ListFilter, Search } from "lucide-react";

import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ACTIVITY_FEED_CATEGORIES,
  ACTIVITY_FEED_CATEGORY_LABELS,
  ACTIVITY_FEED_CATEGORY_PILL,
  ACTIVITY_FEED_DEFAULT_RANGE,
  serializeActivityFeedCategories,
  type ActivityFeedCategory,
  type ActivityFeedResult,
} from "@/lib/activity-feed";
import { fmtDateTime, timeAgo } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type ActivityFeedViewProps = {
  data: ActivityFeedResult;
};

function setParams(
  router: ReturnType<typeof useRouter>,
  searchParams: URLSearchParams,
  patch: Record<string, string | null>,
) {
  const params = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const q = params.toString();
  router.push(q ? `/dashboard/shop-activity?${q}` : "/dashboard/shop-activity");
}

export function ActivityFeedView({ data }: ActivityFeedViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(data.q);

  const from = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const to = Math.min(data.page * data.pageSize, data.total);

  const isFiltered = data.categories.length > 0;
  const selectedSet = new Set(
    isFiltered ? data.categories : ACTIVITY_FEED_CATEGORIES,
  );
  const selectedCount = selectedSet.size;

  function applySearch(value: string) {
    startTransition(() => {
      setParams(router, searchParams, { q: value.trim() || null, page: null });
    });
  }

  function applyCategories(next: ActivityFeedCategory[]) {
    startTransition(() => {
      setParams(router, searchParams, {
        category: serializeActivityFeedCategories(next),
        page: null,
      });
    });
  }

  function toggleCategory(cat: ActivityFeedCategory) {
    const current = isFiltered
      ? [...data.categories]
      : [...ACTIVITY_FEED_CATEGORIES];
    const next = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    applyCategories(next);
  }

  function selectAllCategories() {
    applyCategories([]);
  }

  function goToday() {
    startTransition(() => {
      setParams(router, searchParams, {
        range: null,
        period: null,
        from: null,
        to: null,
        page: null,
      });
    });
  }

  function setPage(page: number) {
    startTransition(() => {
      setParams(router, searchParams, {
        page: page <= 1 ? null : String(page),
      });
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy/70">
            Operations
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Shop Activity</h1>
          <p className="text-sm text-muted-foreground">
            What advisors and the shop did for {data.rangeLabel.toLowerCase()} — estimate views,
            jobs, RO status, payments, appointments, and customer contact.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DateRangePicker
            basePath="/dashboard/shop-activity"
            defaultRange={ACTIVITY_FEED_DEFAULT_RANGE}
          />
          <Button
            type="button"
            size="sm"
            variant={data.range === "today" ? "default" : "outline"}
            className={cn(data.range === "today" && "bg-brand-navy")}
            onClick={goToday}
          >
            Today
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          className="relative w-full max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            applySearch(searchDraft);
          }}
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search shop activity…"
            className="h-9 pl-8"
            aria-label="Search shop activity"
          />
        </form>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                "h-9 gap-2 border-border bg-background px-3 font-medium text-foreground",
                isFiltered && "border-brand-navy/30 bg-brand-navy/5 text-brand-navy",
              )}
              aria-label={
                isFiltered
                  ? `Filter by activity type, ${selectedCount} selected`
                  : "Filter by activity type"
              }
            >
              <ListFilter className="size-3.5 shrink-0" aria-hidden />
              <span>Activity type</span>
              {isFiltered ? (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 justify-center rounded-md bg-brand-navy px-1.5 text-[11px] font-semibold text-white"
                >
                  {selectedCount}
                </Badge>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Filter by type
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={!isFiltered}
              onCheckedChange={(checked) => {
                if (checked) selectAllCategories();
              }}
              onSelect={(e) => e.preventDefault()}
            >
              All types
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {ACTIVITY_FEED_CATEGORIES.map((cat) => (
              <DropdownMenuCheckboxItem
                key={cat}
                checked={selectedSet.has(cat)}
                onCheckedChange={() => toggleCategory(cat)}
                onSelect={(e) => e.preventDefault()}
              >
                {ACTIVITY_FEED_CATEGORY_LABELS[cat]}
              </DropdownMenuCheckboxItem>
            ))}
            {isFiltered ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-brand-navy focus:text-brand-navy"
                  onSelect={() => selectAllCategories()}
                >
                  Clear filter
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card",
          pending && "opacity-70",
        )}
      >
        {data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="text-sm font-medium text-brand-navy">No activity in this range</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Try Today, expand the date range, or clear filters. Events appear when estimates are
              shared, viewed, approved, paid, or when staff log RO notes.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.items.map((item) => (
              <li
                key={item.id}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">{item.summary}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    {item.roNumber != null && item.href ? (
                      <Link
                        href={item.href}
                        className="font-medium text-brand-navy hover:underline"
                      >
                        RO #{item.roNumber}
                      </Link>
                    ) : item.roNumber != null ? (
                      <span className="font-medium text-brand-navy">RO #{item.roNumber}</span>
                    ) : null}
                    {item.roNumber != null ? <span aria-hidden>·</span> : null}
                    <span title={fmtDateTime(item.createdAt)}>{timeAgo(item.createdAt)}</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 shrink-0 justify-self-start border text-[11px] font-medium sm:justify-self-end",
                    ACTIVITY_FEED_CATEGORY_PILL[item.category],
                  )}
                >
                  {item.categoryLabel}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        {data.total > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
            <div className="tabular-nums">
              {from}–{to} of {data.total}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={data.page <= 1 || pending}
                onClick={() => setPage(data.page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={data.page >= data.totalPages || pending}
                onClick={() => setPage(data.page + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
