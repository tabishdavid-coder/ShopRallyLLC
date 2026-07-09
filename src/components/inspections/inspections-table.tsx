"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { defaultRoOpenHref } from "@/lib/ro-workspace";
import { INSPECTION_STATUS, INSPECTION_STATUS_DOT } from "@/lib/inspection";
import { InspectionWorkflowBadge } from "@/components/inspections/inspection-badges";
import type { InspectionListRow } from "@/server/inspections";
const PER_PAGE_OPTIONS = [10, 15, 25, 50];
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: INSPECTION_STATUS.NOT_STARTED, label: "Not started" },
  { value: INSPECTION_STATUS.IN_PROGRESS, label: "In progress" },
  { value: INSPECTION_STATUS.COMPLETED, label: "Completed" },
];

export function InspectionsTable({
  rows,
  total,
  page,
  perPage,
  query,
  status,
}: {
  rows: InspectionListRow[];
  total: number;
  page: number;
  perPage: number;
  query: string;
  status: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);

  const setParams = useCallback(
    (next: Record<string, string | number | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "") sp.delete(k);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search RO #, customer, vehicle, template…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setParams({ status: v === "ALL" ? null : v, page: null })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Inspection</TableHead>
              <TableHead>RO #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">R / Y / G</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No inspections found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/repair-orders/${row.roId}/inspections`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.templateName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={defaultRoOpenHref(row.roId)}
                      className="tabular-nums hover:underline"
                    >
                      #{row.roNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{row.customerName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.vehicleLabel}</TableCell>
                  <TableCell>
                    <InspectionWorkflowBadge status={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="h-1.5 flex-1 rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${row.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {row.progressPercent}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-2 text-xs tabular-nums">
                      <span className="flex items-center gap-0.5">
                        <span className={cn("size-2 rounded-full", INSPECTION_STATUS_DOT.RED)} />
                        {row.redCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className={cn("size-2 rounded-full", INSPECTION_STATUS_DOT.YELLOW)} />
                        {row.yellowCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className={cn("size-2 rounded-full", INSPECTION_STATUS_DOT.GREEN)} />
                        {row.greenCount}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(row.performedAt ?? row.createdAt).toLocaleDateString("en-US")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {from}–{to} of {total}
        </span>
        <div className="flex items-center gap-2">
          <Select
            value={String(perPage)}
            onValueChange={(v) => setParams({ perPage: v, page: null })}
          >
            <SelectTrigger className="w-[72px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8"
            disabled={page <= 1}
            onClick={() => setParams({ page: page - 1 })}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="tabular-nums text-muted-foreground">
            {page} / {lastPage}
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8"
            disabled={page >= lastPage}
            onClick={() => setParams({ page: page + 1 })}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
