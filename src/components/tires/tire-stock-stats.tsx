"use client";

import { AlertTriangle, Disc3, DollarSign, Layers } from "lucide-react";

import { formatCents } from "@/lib/format";
import type { TireStockStats } from "@/server/tire-stock";

export function TireStockStatsRow({ stats }: { stats: TireStockStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">SKUs on hand</p>
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
            <Disc3 className="size-4" />
          </span>
        </div>
        <p className="mt-1 text-2xl font-bold tracking-tight">{stats.totalSkus}</p>
      </div>
      <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Total units</p>
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-light/40 text-brand-navy">
            <Layers className="size-4" />
          </span>
        </div>
        <p className="mt-1 text-2xl font-bold tracking-tight">{stats.totalUnits}</p>
      </div>
      <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Total value (cost)</p>
          <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
            <DollarSign className="size-4" />
          </span>
        </div>
        <p className="mt-1 text-2xl font-bold tracking-tight">
          {formatCents(stats.totalValueCents)}
        </p>
      </div>
      <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Low stock</p>
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red">
            <AlertTriangle className="size-4" />
          </span>
        </div>
        <p className="mt-1 text-2xl font-bold tracking-tight">{stats.lowStockCount}</p>
      </div>
    </div>
  );
}

export function TireStockModuleHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Tires</h1>
      <p className="text-sm text-muted-foreground">
        Tires on hand — new &amp; used. Track size, brand, bin location, and reorder levels.
      </p>
    </div>
  );
}
