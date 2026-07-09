"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Disc3, Loader2, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  TIRE_ORDER_STATUSES,
  TIRE_SOURCE_LABELS,
  TIRE_STATUS_COLORS,
  TIRE_STATUS_LABELS,
} from "@/lib/tires";
import type { TireOrderRow } from "@/server/tires";

export function TireOrdersTable({
  rows,
  total,
  page,
  perPage,
  query,
  statusFilter,
  statusCounts,
}: {
  rows: TireOrderRow[];
  total: number;
  page: number;
  perPage: number;
  query: string;
  statusFilter: string;
  statusCounts: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);

  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "") sp.delete(k);
        else sp.set(k, v);
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setParams({ status: null, page: null })}
          >
            All
            <span className="ml-1.5 text-xs opacity-70">
              {Object.values(statusCounts).reduce((a, b) => a + b, 0)}
            </span>
          </Button>
          {TIRE_ORDER_STATUSES.filter((s) => s !== "CANCELED").map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setParams({ status: s, page: null })}
            >
              {TIRE_STATUS_LABELS[s]}
              {statusCounts[s] ? (
                <span className="ml-1.5 text-xs opacity-70">{statusCounts[s]}</span>
              ) : null}
            </Button>
          ))}
        </div>
        <Button asChild>
          <Link href="/tires/new">
            <Plus className="mr-1.5 size-4" />
            New tire order
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search customer, size, brand, order #…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isPending ? (
          <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Order #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Deposit</TableHead>
              <TableHead>Install</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No tire orders yet. Create one to start tracking deposits and installs.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/tires/${row.id}`} className="font-medium text-primary hover:underline">
                      #{row.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={TIRE_STATUS_COLORS[row.status]}>
                      {TIRE_STATUS_LABELS[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/tires/${row.id}`} className="hover:underline">
                      {row.customerName}
                    </Link>
                    {row.customerPhone ? (
                      <div className="text-xs text-muted-foreground">{row.customerPhone}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">{row.vehicleLabel}</TableCell>
                  <TableCell className="font-mono text-sm">{row.tireSize}</TableCell>
                  <TableCell>{row.tireBrand ?? "—"}</TableCell>
                  <TableCell>
                    {row.depositPaidAt ? (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        {formatCents(row.depositCents)}
                      </span>
                    ) : row.depositCents > 0 ? (
                      <span className="text-amber-700 dark:text-amber-400">
                        {formatCents(row.depositCents)} pending
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.appointmentStart
                      ? row.appointmentStart.toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {TIRE_SOURCE_LABELS[row.source as keyof typeof TIRE_SOURCE_LABELS] ?? row.source}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0 ? "0 orders" : `${from}–${to} of ${total}`}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() => setParams({ page: String(page - 1) })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= lastPage || isPending}
            onClick={() => setParams({ page: String(page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TireModuleHeader() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 items-center justify-center rounded-md bg-brand-navy text-white">
        <Disc3 className="size-5" />
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tires</h1>
        <p className="text-sm text-muted-foreground">
          Tire quotes, deposits, install scheduling, and supplier approval — separate from online booking.
        </p>
      </div>
    </div>
  );
}
