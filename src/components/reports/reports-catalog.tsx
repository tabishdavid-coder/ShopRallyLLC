"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Car,
  Clock,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  LayoutGrid,
  Megaphone,
  PieChart,
  Search,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  REPORT_CATEGORIES,
  REPORT_DEFINITIONS,
  type ReportCategoryId,
  type ReportDefinition,
} from "@/lib/reports";

const CATEGORY_ICONS: Record<ReportCategoryId, React.ComponentType<{ className?: string }>> = {
  sales: DollarSign,
  ar: Clock,
  "repair-orders": Wrench,
  technicians: Users,
  customers: Users,
  payments: CreditCard,
  marketing: Megaphone,
};

/** Per-category header chrome — icon tile, left bar, and text tints. */
const CATEGORY_THEME: Record<
  ReportCategoryId,
  { bar: string; surface: string; iconBox: string; icon: string; title: string; desc: string }
> = {
  sales: {
    bar: "border-l-emerald-500",
    surface: "bg-emerald-50/90",
    iconBox: "bg-emerald-100 ring-emerald-200",
    icon: "text-emerald-700",
    title: "text-emerald-950",
    desc: "text-emerald-800/75",
  },
  ar: {
    bar: "border-l-amber-500",
    surface: "bg-amber-50/90",
    iconBox: "bg-amber-100 ring-amber-200",
    icon: "text-amber-800",
    title: "text-amber-950",
    desc: "text-amber-900/70",
  },
  "repair-orders": {
    bar: "border-l-brand-navy",
    surface: "bg-brand-navy/[0.06]",
    iconBox: "bg-brand-navy/10 ring-brand-navy/15",
    icon: "text-brand-navy",
    title: "text-brand-navy",
    desc: "text-brand-navy/70",
  },
  technicians: {
    bar: "border-l-violet-500",
    surface: "bg-violet-50/90",
    iconBox: "bg-violet-100 ring-violet-200",
    icon: "text-violet-700",
    title: "text-violet-950",
    desc: "text-violet-900/70",
  },
  customers: {
    bar: "border-l-brand-light",
    surface: "bg-brand-light/15",
    iconBox: "bg-brand-light/30 ring-brand-light/45",
    icon: "text-brand-navy",
    title: "text-brand-navy",
    desc: "text-brand-navy/65",
  },
  payments: {
    bar: "border-l-teal-500",
    surface: "bg-teal-50/90",
    iconBox: "bg-teal-100 ring-teal-200",
    icon: "text-teal-700",
    title: "text-teal-950",
    desc: "text-teal-900/70",
  },
  marketing: {
    bar: "border-l-brand-orange",
    surface: "bg-brand-orange/[0.08]",
    iconBox: "bg-brand-orange/15 ring-brand-orange/25",
    icon: "text-brand-orange",
    title: "text-brand-navy",
    desc: "text-brand-navy/65",
  },
};

const ALL_REPORTS_THEME = {
  bar: "border-l-brand-navy/40",
  surface: "bg-muted/40",
  iconBox: "bg-brand-navy/10 ring-brand-navy/10",
  icon: "text-brand-navy",
  title: "text-brand-navy",
  desc: "text-muted-foreground",
};

const REPORT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "sales-summary": TrendingUp,
  "gross-profit": PieChart,
  "aro-report": BarChart3,
  "car-count": Car,
  "ar-aging": Clock,
  "ar-by-customer": Users,
  "ro-throughput": Wrench,
  "ro-by-status": FileSpreadsheet,
  "tire-orders": Car,
  "payments-by-method": CreditCard,
  "tech-hours": Users,
  "tech-productivity": BarChart3,
  "customer-list": Users,
  "new-customers": Users,
  "marketing-leads": Megaphone,
};

type CategoryFilter = ReportCategoryId | "all";

export function ReportsCatalog() {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return null;
    return REPORT_DEFINITIONS.filter(
      (r) =>
        r.name.toLowerCase().includes(normalizedQuery) ||
        r.description.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery]);

  const visibleCategories = useMemo(() => {
    if (searchResults) return [];
    if (category === "all") return REPORT_CATEGORIES;
    return REPORT_CATEGORIES.filter((c) => c.id === category);
  }, [category, searchResults]);

  const activeCategoryMeta =
    category === "all"
      ? { label: "All reports", description: "Browse every pre-built shop report." }
      : REPORT_CATEGORIES.find((c) => c.id === category);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-20 shrink-0 border-b border-border/80 bg-[oklch(0.965_0.004_260)]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[oklch(0.965_0.004_260)]/90 md:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex shrink-0 items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-brand-navy">Reports</h1>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-navy/12 bg-card px-2 py-1 text-xs text-muted-foreground">
              <LayoutGrid className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
              <span className="font-semibold tabular-nums text-brand-navy">
                {REPORT_DEFINITIONS.length}
              </span>
              reports
            </span>
          </div>

          {searchResults ? (
            <div className="min-w-0 flex-1 basis-40">
              <p className="text-sm font-semibold text-brand-navy">
                {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Matching &ldquo;{query.trim()}&rdquo;
              </p>
            </div>
          ) : activeCategoryMeta ? (
            <CategorySectionHeader
              categoryId={category === "all" ? undefined : category}
              label={activeCategoryMeta.label}
              description={activeCategoryMeta.description}
              icon={category === "all" ? LayoutGrid : CATEGORY_ICONS[category]}
              compact
              className="min-w-0 flex-1 basis-40 border-0 bg-transparent px-0 py-0"
            />
          ) : null}

          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm sm:flex-none">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search reports by name or description…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 border-border/80 bg-card pl-9 shadow-sm"
              aria-label="Search reports"
            />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
      {searchResults ? (
        <SearchResultsSection query={query} results={searchResults} />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside className="lg:w-60 lg:shrink-0">
            <nav
              className="lg:sticky lg:top-4"
              aria-label="Report categories"
            >
              <div className="hidden rounded-xl border border-border/80 bg-card p-2 shadow-sm lg:block">
                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Categories
                </p>
                <ul className="space-y-0.5">
                  <CategoryNavItem
                    label="All reports"
                    count={REPORT_DEFINITIONS.length}
                    icon={LayoutGrid}
                    active={category === "all"}
                    onClick={() => setCategory("all")}
                  />
                  {REPORT_CATEGORIES.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.id];
                    const count = REPORT_DEFINITIONS.filter((r) => r.category === cat.id).length;
                    return (
                      <CategoryNavItem
                        key={cat.id}
                        label={cat.label}
                        count={count}
                        icon={Icon}
                        active={category === cat.id}
                        onClick={() => setCategory(cat.id)}
                      />
                    );
                  })}
                </ul>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
                <CategoryPill
                  label="All"
                  count={REPORT_DEFINITIONS.length}
                  active={category === "all"}
                  onClick={() => setCategory("all")}
                />
                {REPORT_CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id];
                  const count = REPORT_DEFINITIONS.filter((r) => r.category === cat.id).length;
                  return (
                    <CategoryPill
                      key={cat.id}
                      label={cat.label}
                      count={count}
                      icon={Icon}
                      active={category === cat.id}
                      onClick={() => setCategory(cat.id)}
                    />
                  );
                })}
              </div>
            </nav>
          </aside>

          <div className="min-w-0 flex-1 space-y-8">
            {visibleCategories.map((cat) => {
              const reports = REPORT_DEFINITIONS.filter((r) => r.category === cat.id);
              if (reports.length === 0) return null;
              const Icon = CATEGORY_ICONS[cat.id];
              const showSectionHeader = category === "all";

              return (
                <section key={cat.id} className="space-y-4">
                  {showSectionHeader ? (
                    <CategorySectionHeader
                      categoryId={cat.id}
                      label={cat.label}
                      description={cat.description}
                      icon={Icon}
                    />
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                    {reports.map((report) => (
                      <ReportCatalogCard key={report.slug} report={report} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function CategorySectionHeader({
  categoryId,
  label,
  description,
  icon: Icon,
  compact = false,
  className,
}: {
  categoryId?: ReportCategoryId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  compact?: boolean;
  className?: string;
}) {
  const theme = categoryId ? CATEGORY_THEME[categoryId] : ALL_REPORTS_THEME;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border/50 border-l-[3px] px-3 py-2",
        theme.bar,
        theme.surface,
        className,
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1",
          theme.iconBox,
        )}
      >
        <Icon className={cn("size-4", theme.icon)} aria-hidden />
      </span>
      <div className="min-w-0">
        <h3
          className={cn(
            compact ? "text-base font-semibold tracking-tight" : "font-semibold",
            theme.title,
          )}
        >
          {label}
        </h3>
        <p className={cn("truncate text-xs", theme.desc)}>{description}</p>
      </div>
    </div>
  );
}

function SearchResultsSection({
  query,
  results,
}: {
  query: string;
  results: ReportDefinition[];
}) {
  return (
    <section className="space-y-4">
      {results.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/80 bg-muted/15 px-6 py-14 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-light/30 ring-1 ring-brand-light/40">
            <Search className="size-7 text-brand-navy/70" />
          </span>
          <p className="mt-4 text-base font-semibold text-brand-navy">No reports found</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Try a different search term, or clear the search to browse by category.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((report) => (
            <ReportCatalogCard key={report.slug} report={report} />
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryNavItem({
  label,
  count,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200",
          active
            ? "bg-brand-navy font-medium text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            active ? "text-brand-light" : "text-brand-navy/70",
          )}
        />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      </button>
    </li>
  );
}

function CategoryPill({
  label,
  count,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  count: number;
  icon?: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all duration-200",
        active
          ? "border-brand-navy bg-brand-navy font-medium text-primary-foreground shadow-sm"
          : "border-border bg-card text-muted-foreground hover:border-brand-light/60 hover:bg-accent hover:text-foreground",
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
          active ? "bg-primary-foreground/20" : "bg-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ReportCatalogCard({ report }: { report: ReportDefinition }) {
  const Icon = REPORT_ICONS[report.slug] ?? FileSpreadsheet;
  const categoryLabel = REPORT_CATEGORIES.find((c) => c.id === report.category)?.label;

  return (
    <Link
      href={`/reports/${report.slug}`}
      className="group flex flex-col rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-light/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy/10 ring-1 ring-brand-navy/10 transition-colors group-hover:bg-brand-navy/15">
          <Icon className="size-5 text-brand-navy" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug text-foreground transition-colors group-hover:text-brand-navy">
            {report.name}
          </h3>
          {categoryLabel ? (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {categoryLabel}
            </p>
          ) : null}
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {report.description}
          </p>
        </div>
        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-brand-navy" />
      </div>
    </Link>
  );
}
