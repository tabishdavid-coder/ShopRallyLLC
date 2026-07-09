"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format";
import { fmtDateTime } from "@/lib/datetime";
import type { PurchaseOrderRow } from "@/server/purchase-orders";

/** Client-safe PO status values (mirrors Prisma PurchaseOrderStatus). */
const PO_STATUS = {
  OPEN: "OPEN",
  ORDERED: "ORDERED",
  RECEIVED: "RECEIVED",
  ARCHIVED: "ARCHIVED",
} as const;
type PoStatus = (typeof PO_STATUS)[keyof typeof PO_STATUS];
import {
  archiveAllPurchaseOrdersForRo,
  archivePurchaseOrder,
  unarchivePurchaseOrder,
} from "@/server/actions/purchase-orders";

type Filter = "active" | "archived";

const STATUS_LABEL: Record<PoStatus, string> = {
  OPEN: "Open",
  ORDERED: "Ordered",
  RECEIVED: "Received",
  ARCHIVED: "Archived",
};

function isArchived(po: PurchaseOrderRow) {
  return po.status === PO_STATUS.ARCHIVED || po.archivedAt != null;
}

export function RoPurchaseOrdersPanel({
  roId,
  roDone,
  purchaseOrders,
}: {
  roId: string;
  roDone: boolean;
  purchaseOrders: PurchaseOrderRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openCount = useMemo(
    () => purchaseOrders.filter((po) => !isArchived(po)).length,
    [purchaseOrders],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return purchaseOrders.filter((po) => {
      const archived = isArchived(po);
      if (filter === "active" && archived) return false;
      if (filter === "archived" && !archived) return false;
      if (!q) return true;
      return (
        String(po.number).includes(q) ||
        (po.vendor?.toLowerCase().includes(q) ?? false) ||
        (po.invoiceNumber?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [purchaseOrders, filter, query]);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {roDone && openCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand-navy/20 bg-brand-light/15 px-3 py-2.5">
          <p className="text-sm text-foreground">
            Work is complete — {openCount} purchase order{openCount === 1 ? "" : "s"} can be archived.
          </p>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            className="h-8 gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90"
            onClick={() => run(() => archiveAllPurchaseOrdersForRo({ roId }))}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="size-3.5" />}
            Archive all POs
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-foreground/45" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders by vendor, PO #"
            className="h-9 border-border pl-8 text-sm"
          />
        </div>
        <div className="flex rounded-md border border-border p-0.5">
          {(["active", "archived"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                filter === f
                  ? "bg-brand-navy text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {f === "active" ? "Active" : "Archived"}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Order Date/Time</th>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2">PO#</th>
              <th className="px-3 py-2">Invoice #</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Order Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-subtle-foreground">
                  {filter === "archived" ? "No archived purchase orders." : "No purchase orders."}
                </td>
              </tr>
            ) : (
              filtered.map((po) => {
                const archived = isArchived(po);
                return (
                  <tr
                    key={po.id}
                    className={cn(
                      "border-b border-border/70 last:border-0",
                      archived && "bg-muted/20 text-muted-foreground",
                    )}
                  >
                    <td className="px-3 py-2 tabular-nums">
                      {fmtDateTime(po.createdAt, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2">{po.vendor ?? "—"}</td>
                    <td className="px-3 py-2 font-medium tabular-nums">{po.number}</td>
                    <td className="px-3 py-2">{po.invoiceNumber ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{formatCents(po.totalCents)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                          archived
                            ? "bg-muted text-subtle-foreground"
                            : po.status === PO_STATUS.RECEIVED
                              ? "bg-emerald-500/15 text-emerald-700"
                              : "bg-brand-light/40 text-brand-navy",
                        )}
                      >
                        {STATUS_LABEL[po.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {archived ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          className="h-8 gap-1 text-xs"
                          onClick={() => run(() => unarchivePurchaseOrder(po.id))}
                        >
                          <ArchiveRestore className="size-3.5" />
                          Unarchive
                        </Button>
                      ) : roDone ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          className="h-8 gap-1 border-brand-navy/30 text-xs text-brand-navy"
                          onClick={() => run(() => archivePurchaseOrder(po.id))}
                        >
                          <Archive className="size-3.5" />
                          Archive
                        </Button>
                      ) : (
                        <span className="text-xs text-foreground/45">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
