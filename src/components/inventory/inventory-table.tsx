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

import { AdjustQuantityDialog } from "@/components/inventory/adjust-quantity-dialog";
import { ImportPartsDialog } from "@/components/inventory/import-parts-dialog";
import { CategoryFilterChips } from "@/components/canned-jobs/category-filter-chips";
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
import { mergeInventoryCategories } from "@/lib/inventory-categories";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InventoryPartRow } from "@/server/inventory";

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function InventoryTable({
  rows,
  total,
  page,
  perPage,
  query,
  categoryFilter,
  lowStockFilter,
  categories,
}: {
  rows: InventoryPartRow[];
  total: number;
  page: number;
  perPage: number;
  query: string;
  categoryFilter: string;
  lowStockFilter: boolean;
  categories: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adjustPart, setAdjustPart] = useState<InventoryPartRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const categoryOptions = mergeInventoryCategories(categories, categoryFilter);
  const chipCategory = categoryFilter === "all" ? "" : categoryFilter;
  const isVirginEmpty =
    total === 0 && !query && categoryFilter === "all" && !lowStockFilter;

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
                placeholder="Search part #, description, vendor, or bin…"
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
              <a href="/api/inventory/export">
                <Download className="size-4" />
                Export
              </a>
            </Button>

            <CatalogListCount count={total} label="part" />
          </CatalogListToolbarRow>

          {categoryOptions.length > 0 ? (
            <CategoryFilterChips
              categories={categoryOptions}
              value={chipCategory}
              onChange={(v) => setParams({ category: v || null, page: null })}
              className="scrollbar-thin overflow-x-auto overscroll-x-contain pb-0.5"
            />
          ) : null}
        </CatalogListToolbar>

        <CatalogListBody>
          {rows.length === 0 ? (
            <CatalogListEmpty
              title={isVirginEmpty ? "No parts yet" : "No parts match"}
              description={
                isVirginEmpty
                  ? "Add parts to track quantity on hand, reorder points, and bin locations. Import a CSV to bulk-load your catalog."
                  : "Try clearing filters or search terms."
              }
              action={
                isVirginEmpty ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button asChild className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90">
                      <Link href="/inventory/new">
                        <Plus className="size-4" />
                        Add part
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
                  <TableHead className="min-w-[7rem] font-semibold">Part #</TableHead>
                  <TableHead className="min-w-[10rem] font-semibold">Description</TableHead>
                  <TableHead className="w-[8rem] font-semibold">Vendor</TableHead>
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
                  const isLow =
                    row.reorderPoint > 0 && row.quantityOnHand <= row.reorderPoint;
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(isLow && "bg-brand-red/5", isPending && "opacity-60")}
                    >
                      <TableCell className="py-2.5">
                        <Checkbox
                          checked={selected.has(row.id)}
                          onCheckedChange={() => toggleOne(row.id)}
                          aria-label={`Select ${row.partNumber}`}
                        />
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="min-w-0">
                          <Link
                            href={`/inventory/${row.id}`}
                            className="truncate font-medium text-foreground hover:text-brand-navy hover:underline"
                          >
                            {row.partNumber}
                          </Link>
                          {isLow ? (
                            <Badge className="ml-1.5 h-5 border-0 bg-brand-red/12 px-1.5 text-[10px] font-semibold text-brand-red hover:bg-brand-red/12">
                              Low
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-48 truncate py-2.5 text-sm">
                        {row.description}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-muted-foreground">
                        {row.vendorName ?? "—"}
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
                              aria-label={`Actions for ${row.partNumber}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem asChild>
                              <Link href={`/inventory/${row.id}`}>View details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/inventory/${row.id}?edit=1`}>Edit part</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAdjustPart(row)}>
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

      {adjustPart ? (
        <AdjustQuantityDialog
          partId={adjustPart.id}
          partNumber={adjustPart.partNumber}
          currentQty={adjustPart.quantityOnHand}
          open={!!adjustPart}
          onOpenChange={(open) => !open && setAdjustPart(null)}
        />
      ) : null}

      <ImportPartsDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
