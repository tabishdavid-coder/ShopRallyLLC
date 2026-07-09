"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Dialog as SheetPrimitive } from "radix-ui";
import { ExternalLink, Loader2, UserRound, X } from "lucide-react";

import { DrawerRepairOrdersTab } from "@/components/estimate-building/estimate-lab-context-drawer-panels";
import { Sheet, SheetOverlay, SheetPortal } from "@/components/ui/sheet";
import type { EstimateContextDrawerData } from "@/lib/estimate-context-drawer-types";
import { fetchEstimateContextDrawer } from "@/server/actions/estimate-context-drawer";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Right drawer — all repair orders for a customer (job board History action). */
export function JobBoardHistoryDrawer({
  open,
  onOpenChange,
  customerId,
  customerName,
  roId,
  roNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  roId: string;
  roNumber: number;
}) {
  const [data, setData] = useState<EstimateContextDrawerData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  const reload = useCallback(() => {
    startLoad(async () => {
      try {
        const res = await fetchEstimateContextDrawer(customerId);
        if (res.ok) {
          setData(res.data);
          setLoadError(null);
        } else {
          setLoadError(res.error);
        }
      } catch {
        setLoadError("Could not load repair order history. Try again.");
      }
    });
  }, [customerId]);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setLoadError(null);
    reload();
  }, [open, customerId, reload]);

  const creditCents = data?.availableCreditCents ?? 0;
  const orders = data?.detail.repairOrders ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay className="bg-black/45 backdrop-blur-[1px] duration-300 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <SheetPrimitive.Content
          aria-describedby={undefined}
          data-side="right"
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-0 overflow-hidden bg-[#f8fafc] p-0 shadow-2xl outline-none",
            "border-l border-brand-navy/10 sm:max-w-[min(42rem,calc(100vw-0.5rem))]",
            "duration-300 ease-out data-open:animate-in data-closed:animate-out",
            "data-open:slide-in-from-right data-closed:slide-out-to-right data-open:fade-in-0 data-closed:fade-out-0",
          )}
        >
          <header className="shrink-0 border-b border-border/80 bg-white px-4 py-3">
            <div className="flex min-w-0 items-start gap-2 pr-10">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-navy/8 text-brand-navy">
                <UserRound className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-brand-navy">{customerName}</h2>
                  <Link
                    href={`/customers?customer=${customerId}`}
                    className="inline-flex shrink-0 text-brand-navy/50 hover:text-brand-navy"
                    aria-label="Open customer profile"
                  >
                    <ExternalLink className="size-3.5" />
                  </Link>
                  {data ? (
                    <span className="text-sm text-brand-navy/70">
                      (Available credit:{" "}
                      <span className="font-semibold tabular-nums text-brand-navy">
                        {formatCents(creditCents)}
                      </span>
                      )
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  RO #{roNumber} · Repair order history
                </p>
              </div>
            </div>
          </header>

          <div className="flex shrink-0 border-b border-border/80 bg-white px-4">
            <p
              role="tab"
              aria-selected
              className="relative shrink-0 px-1 py-3 text-sm font-medium text-brand-navy after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-red"
            >
              Repair orders ({orders.length || "…"})
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {loading && !data ? (
              <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-brand-navy" />
                Loading repair orders…
              </div>
            ) : null}

            {loadError ? (
              <div className="py-8 text-center">
                <p className="text-sm text-brand-red">{loadError}</p>
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-brand-navy underline"
                  onClick={reload}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {data ? (
              <DrawerRepairOrdersTab
                orders={orders}
                currentRoId={roId}
                customerId={customerId}
                customerName={customerName}
              />
            ) : null}
          </div>

          <SheetPrimitive.Close className="absolute top-3.5 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}
