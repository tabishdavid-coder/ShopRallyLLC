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
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";

import { AdjustQuantityDialog } from "@/components/inventory/adjust-quantity-dialog";
import { ImportPartsDialog } from "@/components/inventory/import-parts-dialog";
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
  const categoryLabel =
    categoryFilter === "all" ? "All categories" : categoryFilter;
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
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            {isPending ? (
              <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
            ) : null}
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search part #, description, vendor, or bin"
              className="pl-8"
            />
          </div>
          <Select
            value={categoryFilter || "all"}
            onValueChange={(v) => setParams({ category: v === "all" ? null : v, page: null })}
          >
            <SelectTrigger className="w-44" aria-label="Filter by category">
              <SelectValue placeholder="Category">{categoryLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={lowStockFilter ? "default" : "outline"}
            size="sm"
            className={cn("gap-1.5", lowStockFilter && "bg-brand-red hover:bg-brand-red/90")}
            onClick={() => setParams({ lowStock: !lowStockFilter, page: null })}
          >
            <SlidersHorizontal className="size-4" />
            Low stock
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="size-4" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href="/api/inventory/export">
              <Download className="size-4" />
              Export CSV
            </a>
          </Button>
          <Button asChild size="sm" className="gap-1.5 bg-brand-navy">
            <Link href="/inventory/new">
              <Plus className="size-4" />
              Add part
            </Link>
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Part #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">QOH</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Retail</TableHead>
              <TableHead>Bin</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center">
                  {isVirginEmpty ? (
                    <div className="flex flex-col items-center gap-3 px-4">
                      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                        <Package className="size-7 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-medium">No parts yet</p>
                        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                          Add parts to track quantity on hand, reorder points, and bin
                          locations. Import a CSV to bulk-load your parts catalog.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button asChild size="sm" className="bg-brand-navy">
                          <Link href="/inventory/new">
                            <Plus className="size-4" />
                            Add part
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                          Import CSV
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No parts match your filters.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const isLow =
                  row.reorderPoint > 0 && row.quantityOnHand <= row.reorderPoint;
                return (
                  <TableRow
                    key={row.id}
                    className={cn(isLow && "bg-brand-red/5")}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggleOne(row.id)}
                        aria-label={`Select ${row.partNumber}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/inventory/${row.id}`}
                        className="font-medium text-brand-navy hover:underline"
                      >
                        {row.partNumber}
                      </Link>
                      {isLow ? (
                        <Badge variant="outline" className="ml-2 border-brand-red/40 text-brand-red">
                          Low
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{row.description}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.vendorName ?? "—"}
                    </TableCell>
                    <TableCell
                      className={cn("text-right font-medium", isLow && "text-brand-red")}
                    >
                      {row.quantityOnHand}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.reorderPoint || "—"}
                    </TableCell>
                    <TableCell className="text-right">{formatCents(row.costCents)}</TableCell>
                    <TableCell className="text-right">{formatCents(row.retailCents)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.binLocation ?? "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
              })
            )}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select
              value={String(perPage)}
              onValueChange={(v) => setParams({ perPage: v, page: null })}
            >
              <SelectTrigger className="h-8 w-16">
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
          <div className="flex items-center gap-2">
            <span>
              {from}–{to} of {total}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1}
              onClick={() => setParams({ page: page - 1 })}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= lastPage}
              onClick={() => setParams({ page: page + 1 })}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

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
