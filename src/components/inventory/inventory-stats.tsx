"use client";

import { AlertTriangle, DollarSign, Package } from "lucide-react";

import { CatalogListHeader } from "@/components/catalog/catalog-list-chrome";
import { formatCents } from "@/lib/format";
import type { InventoryStats } from "@/server/inventory";

export function InventoryStatsRow({ stats }: { stats: InventoryStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Total parts</p>
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
            <Package className="size-4" />
          </span>
        </div>
        <p className="mt-1 text-2xl font-bold tracking-tight">{stats.totalParts}</p>
      </div>
      <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
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
      <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
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

/** Used on add/edit routes — list page uses CatalogListHeader directly */
export function InventoryModuleHeader() {
  return (
    <CatalogListHeader
      title="Parts"
      description="On-hand stock, reorder levels, and quantity adjustments."
    />
  );
}
