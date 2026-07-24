"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Loader2, X } from "lucide-react";

import {
  ShopLaborRatesEditor,
  type ShopLaborRateEditorRow,
} from "@/components/settings/shop-labor-rates-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCents } from "@/lib/format";
import type { ShopLaborItemRow } from "@/lib/shop-labor-item-types";
import { fetchShopLaborItemsForManage } from "@/server/actions/shop-labor-items";
import { saveLaborRates } from "@/server/actions/ro-settings";

function toEditorRows(items: ShopLaborItemRow[]): ShopLaborRateEditorRow[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    rate: item.rateCents / 100,
    defaultHours: item.defaultHours,
    isActive: item.isActive,
    isDefault: item.isDefault,
  }));
}

/** Manage the unified shop labor list (shared with RO Settings → Labor Rates). */
export function ShopLaborManageDialog({
  open,
  onOpenChange,
  laborRateCents = 15000,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laborRateCents?: number;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<ShopLaborRateEditorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  async function loadItems() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchShopLaborItemsForManage();
      if (res.ok) {
        setRows(toEditorRows(res.items ?? []));
        setEditorKey((k) => k + 1);
      } else {
        setLoadError(res.error);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadItems();
  }, [open]);

  async function handleSave(nextRows: ShopLaborRateEditorRow[]) {
    const res = await saveLaborRates(nextRows);
    if (res.ok) {
      await loadItems();
      onChanged?.();
    }
    return res;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,720px)] w-[min(56rem,calc(100vw-1.5rem))] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="space-y-3 border-b border-border px-5 py-4 pr-12 text-left">
          <div className="space-y-1">
            <DialogTitle className="text-base font-semibold text-brand-navy">
              Labor catalog
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Same list as Settings → RO Settings → Labor Rates. Edit here or in Settings — both stay
              in sync. Active rows appear in canned-job labor pickers.
            </DialogDescription>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-brand-navy/15 bg-slate-50/90 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Shop default rate
              </p>
              <p className="text-sm font-semibold tabular-nums text-brand-navy">
                {formatCents(laborRateCents)}/hr
              </p>
            </div>
            <Link
              href="/settings/ro-settings?section=labor"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-navy underline-offset-2 hover:underline"
            >
              Open in Settings
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loadError ? (
            <p
              role="alert"
              className="mb-3 rounded-md border border-brand-red/25 bg-brand-red/5 px-3 py-2 text-xs font-medium text-brand-red"
            >
              {loadError}
            </p>
          ) : null}

          {loading ? (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading labor list…
            </div>
          ) : (
            <ShopLaborRatesEditor
              key={editorKey}
              initialRows={rows}
              shopDefaultRateCents={laborRateCents}
              onSave={handleSave}
              saveLabel="Save changes"
              addLabel="Add labor"
              compact
            />
          )}
        </div>

        <div className="flex shrink-0 justify-end border-t border-border bg-slate-50/90 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-border bg-white"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onOpenChange(false)}
          className="absolute right-2 top-2 size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
