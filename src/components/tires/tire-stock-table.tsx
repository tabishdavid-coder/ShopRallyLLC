"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";

import { AdjustTireQuantityDialog } from "@/components/tires/adjust-tire-quantity-dialog";
import { ConditionFilterChips } from "@/components/tires/condition-filter-chips";
import { ImportTiresDialog } from "@/components/tires/import-tires-dialog";
import {
  CatalogListBody,
  CatalogListCard,
  CatalogListCount,
  CatalogListEmpty,
  CatalogListFooter,
  CatalogListTableHeadRow,
  CatalogListToolbar,
  CatalogListToolbarRow,
  catalogSearchInputClass,
} from "@/components/catalog/catalog-list-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/format";
import {
  TIRE_CONDITION_COLORS,
  TIRE_CONDITION_LABELS,
} from "@/lib/tire-stock";
import { cn } from "@/lib/utils";
import type { TireStockRow } from "@/server/tire-stock";
import type { TireCondition } from "@/generated/prisma";

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function TireStockTable({
  rows,
  total,
  page,
  perPage,
  query,
  conditionFilter,
  lowStockFilter,
}: {
  rows: TireStockRow[];
  total: number;
  page: number;
  perPage: number;
  query: string;
  conditionFilter: TireCondition | "all";
  lowStockFilter: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adjustTire, setAdjustTire] = useState<TireStockRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const isVirginEmpty =
    total === 0 && !query && conditionFilter === "all" && !lowStockFilter;

  const setParams = useCallback(
    (next: Record<string, string | number | null | boolean>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "" || v === false) sp.delete(k);
        else sp.set(k, String(v));
      }
      startTransition(() => router.push(`${pathname}?${sp.toString()}`));
    },
    [params, pathname, router],
  );

  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => setParams({ q: search || null, page: null }), 350);
    return () => clearTimeout(t);
  }, [search, query, setParams]);

  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <>
      <CatalogListCard>
        <CatalogListToolbar>
          <CatalogListToolbarRow>
            <div className="relative min-w-0 flex-1 basis-52">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              {isPending ? (
                <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
              ) : null}
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stock #, brand, model, size, bin, DOT…"
                className={catalogSearchInputClass}
              />
            </div>

            <Button
              variant={lowStockFilter ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 gap-1.5",
                lowStockFilter && "bg-brand-red hover:bg-brand-red/90",
              )}
              onClick={() => setParams({ lowStock: !lowStockFilter, page: null })}
            >
              <SlidersHorizontal className="size-4" />
              Low stock
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="size-4" />
              Import
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
              <a href="/api/tires/export">
                <Download className="size-4" />
                Export
              </a>
            </Button>

            <CatalogListCount count={total} label="tire" />
          </CatalogListToolbarRow>

          <ConditionFilterChips
            value={conditionFilter}
            onChange={(v) => setParams({ condition: v === "all" ? null : v, page: null })}
            className="scrollbar-thin overflow-x-auto overscroll-x-contain pb-0.5"
          />
        </CatalogListToolbar>

        <CatalogListBody>
          {rows.length === 0 ? (
            <CatalogListEmpty
              title={isVirginEmpty ? "No tires in stock yet" : "No tires match"}
              description={
                isVirginEmpty
                  ? "Add new or used tires to track quantity on hand, bin locations, and reorder points. Import a CSV to bulk-load your rack inventory."
                  : "Try clearing filters or search terms."
              }
              action={
                isVirginEmpty ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button asChild className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90">
                      <Link href="/tires/new">
                        <Plus className="size-4" />
                        Add tire
                      </Link>
                    </Button>
                    <Button variant="outline" onClick={() => setImportOpen(true)}>
                      Import CSV
                    </Button>
                  </div>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <CatalogListTableHeadRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="min-w-[7rem] font-semibold">Stock #</TableHead>
                  <TableHead className="w-[7rem] font-semibold">Size</TableHead>
                  <TableHead className="min-w-[10rem] font-semibold">Brand / model</TableHead>
                  <TableHead className="w-[5.5rem] font-semibold">Condition</TableHead>
                  <TableHead className="w-[4.5rem] text-right font-semibold">QOH</TableHead>
                  <TableHead className="w-[5rem] text-right font-semibold">Reorder</TableHead>
                  <TableHead className="w-[5.5rem] text-right font-semibold">Cost</TableHead>
                  <TableHead className="w-[5.5rem] text-right font-semibold">Retail</TableHead>
                  <TableHead className="w-[5rem] font-semibold">Bin</TableHead>
                  <TableHead className="w-10" />
                </CatalogListTableHeadRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isLow = row.reorderPoint > 0 && row.quantityOnHand <= row.reorderPoint;
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(isLow && "bg-brand-red/5", isPending && "opacity-60")}
                    >
                      <TableCell className="py-2.5">
                        <Checkbox
                          checked={selected.has(row.id)}
                          onCheckedChange={() => toggleOne(row.id)}
                          aria-label={`Select ${row.stockNumber}`}
                        />
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="min-w-0">
                          <Link
                            href={`/tires/${row.id}`}
                            className="truncate font-medium text-foreground hover:text-brand-navy hover:underline"
                          >
                            {row.stockNumber}
                          </Link>
                          {isLow ? (
                            <Badge className="ml-1.5 h-5 border-0 bg-brand-red/12 px-1.5 text-[10px] font-semibold text-brand-red hover:bg-brand-red/12">
                              Low
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-sm font-medium">{row.size}</TableCell>
                      <TableCell className="max-w-48 truncate py-2.5 text-sm">
                        {row.brand} {row.model}
                        {row.loadSpeed ? (
                          <span className="text-muted-foreground"> · {row.loadSpeed}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-5 px-1.5 text-[10px] font-semibold",
                            TIRE_CONDITION_COLORS[row.condition],
                          )}
                        >
                          {TIRE_CONDITION_LABELS[row.condition]}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "py-2.5 text-right tabular-nums text-sm font-medium",
                          isLow && "text-brand-red",
                        )}
                      >
                        {row.quantityOnHand}
                      </TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums text-sm text-muted-foreground">
                        {row.reorderPoint || "—"}
                      </TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums text-sm">
                        {formatCents(row.costCents)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums text-sm font-semibold text-brand-navy">
                        {formatCents(row.retailCents)}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-muted-foreground">
                        {row.binLocation ?? "—"}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 text-muted-foreground"
                              aria-label={`Actions for ${row.stockNumber}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem asChild>
                              <Link href={`/tires/${row.id}`}>View details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/tires/${row.id}?edit=1`}>Edit tire</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAdjustTire(row)}>
                              Adjust quantity
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CatalogListBody>

        {total > 0 ? (
          <CatalogListFooter>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page</span>
              <Select
                value={String(perPage)}
                onValueChange={(v) => setParams({ perPage: v, page: null })}
              >
                <SelectTrigger className="h-8 w-16 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <p className="mr-2 text-xs tabular-nums text-muted-foreground">
                {from}–{to} of {total}
              </p>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page <= 1}
                onClick={() => setParams({ page: page - 1 })}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page >= lastPage}
                onClick={() => setParams({ page: page + 1 })}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CatalogListFooter>
        ) : null}
      </CatalogListCard>

      {adjustTire ? (
        <AdjustTireQuantityDialog
          tireId={adjustTire.id}
          stockNumber={adjustTire.stockNumber}
          currentQty={adjustTire.quantityOnHand}
          open={!!adjustTire}
          onOpenChange={(open) => !open && setAdjustTire(null)}
        />
      ) : null}

      <ImportTiresDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
