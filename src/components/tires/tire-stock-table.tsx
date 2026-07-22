"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Disc3,
  Download,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";

import { AdjustTireQuantityDialog } from "@/components/tires/adjust-tire-quantity-dialog";
import { ImportTiresDialog } from "@/components/tires/import-tires-dialog";
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

  const conditionLabel =
    conditionFilter === "all" ? "All conditions" : TIRE_CONDITION_LABELS[conditionFilter];
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
              placeholder="Search stock #, brand, model, size, bin, DOT"
              className="pl-8"
            />
          </div>
          <Select
            value={conditionFilter}
            onValueChange={(v) =>
              setParams({ condition: v === "all" ? null : v, page: null })
            }
          >
            <SelectTrigger className="w-40" aria-label="Filter by condition">
              <SelectValue placeholder="Condition">{conditionLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All conditions</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="USED">Used</SelectItem>
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
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href="/api/tires/export">
              <Download className="size-4" />
              Export CSV
            </a>
          </Button>
          <Button asChild size="sm" className="gap-1.5 bg-brand-navy">
            <Link href="/tires/new">
              <Plus className="size-4" />
              Add tire
            </Link>
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allOnPageSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </TableHead>
              <TableHead>Stock #</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Brand / model</TableHead>
              <TableHead>Condition</TableHead>
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
                <TableCell colSpan={11} className="py-12 text-center">
                  {isVirginEmpty ? (
                    <div className="flex flex-col items-center gap-3 px-4">
                      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                        <Disc3 className="size-7 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-medium">No tires in stock yet</p>
                        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                          Add new or used tires to track quantity on hand, bin locations, and reorder
                          points. Import a CSV to bulk-load your rack inventory.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button asChild size="sm" className="bg-brand-navy">
                          <Link href="/tires/new">
                            <Plus className="size-4" />
                            Add tire
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                          Import CSV
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No tires match your filters.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const isLow = row.reorderPoint > 0 && row.quantityOnHand <= row.reorderPoint;
                return (
                  <TableRow key={row.id} className={cn(isLow && "bg-brand-red/5")}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggleOne(row.id)}
                        aria-label={`Select ${row.stockNumber}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/tires/${row.id}`} className="font-medium text-brand-navy hover:underline">
                        {row.stockNumber}
                      </Link>
                      {isLow ? (
                        <Badge variant="outline" className="ml-2 border-brand-red/40 text-brand-red">
                          Low
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-medium">{row.size}</TableCell>
                    <TableCell className="max-w-48 truncate">
                      {row.brand} {row.model}
                      {row.loadSpeed ? (
                        <span className="text-muted-foreground"> · {row.loadSpeed}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={TIRE_CONDITION_COLORS[row.condition]}>
                        {TIRE_CONDITION_LABELS[row.condition]}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-right font-medium", isLow && "text-brand-red")}>
                      {row.quantityOnHand}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.reorderPoint || "—"}
                    </TableCell>
                    <TableCell className="text-right">{formatCents(row.costCents)}</TableCell>
                    <TableCell className="text-right">{formatCents(row.retailCents)}</TableCell>
                    <TableCell className="text-muted-foreground">{row.binLocation ?? "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/tires/${row.id}`}>View details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/tires/${row.id}?edit=1`}>Edit tire</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAdjustTire(row)}>Adjust quantity</DropdownMenuItem>
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
            <Select value={String(perPage)} onValueChange={(v) => setParams({ perPage: v, page: null })}>
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
            <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setParams({ page: page - 1 })}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-8" disabled={page >= lastPage} onClick={() => setParams({ page: page + 1 })}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

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
