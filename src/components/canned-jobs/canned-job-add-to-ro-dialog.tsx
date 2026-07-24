"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchOpenEstimateRepairOrdersForPicker,
  type OpenEstimateRoRow,
} from "@/server/actions/canned-jobs";

export function CannedJobAddToRoDialog({
  open,
  onOpenChange,
  cannedJobName,
  onSelect,
  pending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cannedJobName: string;
  onSelect: (repairOrderId: string) => void;
  pending?: boolean;
}) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [rows, setRows] = useState<OpenEstimateRoRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(id);
  }, [open, q]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setDebouncedQ("");
      setRows([]);
      setError(null);
      setSelectedId(null);
      return;
    }

    startLoad(async () => {
      const res = await fetchOpenEstimateRepairOrdersForPicker({ q: debouncedQ || undefined });
      if (res.ok) {
        setRows(res.rows);
        setError(null);
        setSelectedId((prev) => (prev && res.rows.some((r) => r.id === prev) ? prev : null));
      } else {
        setRows([]);
        setError(res.error);
      }
    });
  }, [open, debouncedQ]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  function confirm() {
    if (!selectedId || pending) return;
    onSelect(selectedId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,640px)] flex-col gap-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border pb-4">
          <DialogTitle className="text-brand-navy">Add to repair order</DialogTitle>
          <DialogDescription>
            Choose an open estimate RO for{" "}
            <span className="font-medium text-foreground">{cannedJobName || "this canned job"}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b border-border px-1 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search RO #, customer, vehicle, plate…"
              className="h-9 pl-9"
              disabled={pending}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading open estimates…
            </div>
          ) : error ? (
            <p className="rounded-md border border-brand-red/25 bg-brand-red/5 px-3 py-2 text-sm text-brand-red">
              {error}
            </p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No open estimate repair orders found.
            </p>
          ) : (
            <ul className="space-y-1">
              {rows.map((ro) => {
                const active = ro.id === selectedId;
                return (
                  <li key={ro.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setSelectedId(ro.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-brand-navy/40 bg-brand-light/20 ring-1 ring-brand-navy/20"
                          : "border-transparent hover:border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-brand-navy">RO #{ro.number}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {ro.jobCount} job{ro.jobCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {ro.customerLabel} · {ro.vehicleLabel}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border pt-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={!selected || pending}
            className="bg-brand-navy hover:bg-brand-navy/90"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : selected ? (
              `Add to RO #${selected.number}`
            ) : (
              "Select repair order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
