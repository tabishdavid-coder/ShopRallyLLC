"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, Send, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EstimateLabServiceSelect } from "@/components/estimate-building/estimate-lab-service-select";
import { EstimateLabServicesCoverage } from "@/components/estimate-building/estimate-lab-services-coverage";
import {
  EstimateLabRemovePartDialog,
  partItemLabel,
} from "@/components/estimate-building/estimate-lab-remove-part-dialog";
import type { ServiceJobSummary } from "@/lib/service-job-parts";
import { formatCents } from "@/lib/format";
import type { HubPart } from "@/lib/hub-parts";
import { cn } from "@/lib/utils";
import { deletePartLine, reassignPartLineJob } from "@/server/actions/estimate";
import { markPartsOrdered } from "@/server/actions/partstech";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import type { PartStatus } from "@/generated/prisma";

type PipelineStatus = "NEEDED" | "QUOTED" | "ORDERED";

const TABS: { key: PipelineStatus; label: string }[] = [
  { key: "NEEDED", label: "Needed" },
  { key: "QUOTED", label: "Quoted" },
  { key: "ORDERED", label: "Ordered" },
];

function statusBadge(status: PartStatus) {
  if (status === "ORDERED") {
    return (
      <Badge variant="outline" className="border-emerald-600/40 bg-emerald-50 text-[10px] text-emerald-800">
        Ordered
      </Badge>
    );
  }
  if (status === "QUOTED") {
    return (
      <Badge variant="outline" className="border-brand-navy/30 bg-brand-light/20 text-[10px] text-brand-navy">
        Quoted
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-500/40 bg-amber-50 text-[10px] text-amber-900">
      Needed
    </Badge>
  );
}

function partLineLabel(p: HubPart): string {
  return p.description.trim() || p.partNumber?.trim() || p.brand?.trim() || "Part line";
}

export function EstimateLabPartsPipeline({
  parts,
  jobs,
  canEdit,
  compact = false,
  filterJobId,
  defaultTab,
  layout = "autoleap",
}: {
  parts: HubPart[];
  jobs: ServiceJobSummary[];
  canEdit: boolean;
  compact?: boolean;
  filterJobId?: string | null;
  defaultTab?: PipelineStatus;
  layout?: "autoleap" | "compact";
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [tab, setTab] = useState<PipelineStatus>(defaultTab ?? "NEEDED");
  const [orderPick, setOrderPick] = useState<Record<string, boolean>>({});
  const [removeTarget, setRemoveTarget] = useState<HubPart | null>(null);
  const [pending, startTransition] = useTransition();

  const scoped = filterJobId ? parts.filter((p) => p.jobId === filterJobId) : parts;

  const counts = useMemo(
    () => ({
      NEEDED: scoped.filter((p) => p.status === "NEEDED").length,
      QUOTED: scoped.filter((p) => p.status === "QUOTED").length,
      ORDERED: scoped.filter((p) => p.status === "ORDERED").length,
    }),
    [scoped],
  );

  useEffect(() => {
    if (defaultTab) setTab(defaultTab);
  }, [defaultTab]);

  const tabParts = scoped.filter((p) => p.status === tab);
  const showServicePicker = canEdit && tab !== "ORDERED";
  const showOrderCheckboxes = canEdit && tab === "QUOTED";
  const showRowActions = canEdit && tab !== "ORDERED";

  const sortedParts = useMemo(
    () => [...tabParts].sort((a, b) => a.description.localeCompare(b.description)),
    [tabParts],
  );

  function reassign(partLineId: string, jobId: string) {
    if (!canEdit) return;
    startTransition(async () => {
      const res = await reassignPartLineJob(partLineId, jobId);
      if (res.ok) {
        toast("success", "Part assigned to service");
        router.refresh();
      } else {
        toast("error", res.error);
      }
    });
  }

  function submitOrder() {
    const ids = Object.keys(orderPick).filter((k) => orderPick[k]);
    if (!ids.length) return;
    startTransition(async () => {
      const res = await markPartsOrdered(ids);
      if (res.ok) {
        toast("success", `Placed order for ${ids.length} part${ids.length === 1 ? "" : "s"}`);
        setOrderPick({});
        setTab("ORDERED");
        router.refresh();
      } else {
        toast("error", res.error);
      }
    });
  }

  function confirmRemove() {
    if (!removeTarget || !canEdit) return;
    const lineId = removeTarget.id;
    startTransition(async () => {
      const res = await deletePartLine(lineId);
      if (res.ok) {
        toast("success", "Part removed");
        setOrderPick((c) => {
          const next = { ...c };
          delete next[lineId];
          return next;
        });
        setRemoveTarget(null);
        router.refresh();
      } else {
        toast("error", res.error);
      }
    });
  }

  function selectAllQuoted(checked: boolean) {
    if (!checked) {
      setOrderPick({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const p of tabParts) next[p.id] = true;
    setOrderPick(next);
  }

  const pickedCount = Object.values(orderPick).filter(Boolean).length;
  const sectionTitle =
    tab === "QUOTED"
      ? "Quoted parts — assign service, then place order"
      : tab === "ORDERED"
        ? "Placed orders"
        : "Parts on estimate";

  const showCoverage = tab === "QUOTED" || tab === "NEEDED";

  return (
    <div className={cn("flex min-h-0 flex-col", compact ? "gap-3" : "flex-1 gap-3")}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-2">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.key
                  ? "bg-brand-navy text-white"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {t.label}
              {counts[t.key] ? ` (${counts[t.key]})` : ""}
            </button>
          ))}
        </div>
        {canEdit && tab === "QUOTED" && counts.QUOTED > 0 ? (
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-emerald-700 px-3 text-xs hover:bg-emerald-800"
            disabled={pending || pickedCount === 0}
            onClick={submitOrder}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Place order{pickedCount > 0 ? ` (${pickedCount})` : ""}
          </Button>
        ) : null}
      </div>

      {showCoverage && jobs.length > 0 ? (
        <EstimateLabServicesCoverage
          jobs={jobs}
          parts={scoped}
          statusFilter={tab === "QUOTED" ? "QUOTED" : tab === "NEEDED" ? "NEEDED" : undefined}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white">
        <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/25 px-3 py-2">
          <p className="text-xs font-semibold text-brand-navy">{sectionTitle}</p>
          {tabParts.length > 0 ? (
            <span className="text-[10px] text-muted-foreground">
              {tabParts.length} line{tabParts.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </header>

        <div className={cn("min-h-0 flex-1", layout === "autoleap" && !compact && "overflow-auto")}>
          {tabParts.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              {tab === "NEEDED"
                ? "No parts yet — order from a vendor above or add lines on the Services tab."
                : tab === "QUOTED"
                  ? "Quoted lines from catalog or phone orders appear here. Set Service on each row, then place order."
                  : "No placed orders yet."}
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  {showOrderCheckboxes ? (
                    <th className="w-8 px-2 py-2">
                      <input
                        type="checkbox"
                        checked={sortedParts.length > 0 && sortedParts.every((p) => orderPick[p.id])}
                        onChange={(e) => selectAllQuoted(e.target.checked)}
                        aria-label="Select all"
                      />
                    </th>
                  ) : null}
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="hidden px-2 py-2 text-left font-medium sm:table-cell">Item #</th>
                  <th className="w-14 px-2 py-2 text-right font-medium">Qty</th>
                  <th className="w-20 px-2 py-2 text-right font-medium">Amount</th>
                  <th className="min-w-[9rem] px-2 py-2 text-left font-medium">Service</th>
                  <th className="hidden px-2 py-2 text-left font-medium md:table-cell">Vendor</th>
                  <th className="w-20 px-2 py-2 text-left font-medium">Status</th>
                  {showRowActions ? <th className="w-10 px-2 py-2" aria-label="Actions" /> : null}
                </tr>
              </thead>
              <tbody>
                {sortedParts.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/15">
                    {showOrderCheckboxes ? (
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={!!orderPick[p.id]}
                          onChange={(e) => setOrderPick((c) => ({ ...c, [p.id]: e.target.checked }))}
                          aria-label={`Select ${partLineLabel(p)}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-3 py-2">
                      <span className="font-medium text-foreground">{partLineLabel(p)}</span>
                    </td>
                    <td className="hidden px-2 py-2 text-muted-foreground sm:table-cell">
                      {p.partNumber ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{p.quantity}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatCents(p.costCents * p.quantity)}</td>
                    <td className="px-2 py-2">
                      {showServicePicker ? (
                        <EstimateLabServiceSelect
                          value={p.jobId}
                          jobs={jobs}
                          disabled={pending}
                          onValueChange={(v) => reassign(p.id, v)}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{p.jobName}</span>
                      )}
                    </td>
                    <td className="hidden px-2 py-2 text-xs text-muted-foreground md:table-cell">
                      {p.vendor ?? "—"}
                    </td>
                    <td className="px-2 py-2">{statusBadge(p.status)}</td>
                    {showRowActions ? (
                      <td className="px-2 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              disabled={pending}
                              aria-label={`Actions for ${partLineLabel(p)}`}
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setRemoveTarget(p)}
                            >
                              <Trash2 className="size-3.5" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <EstimateLabRemovePartDialog
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open && !pending) setRemoveTarget(null);
        }}
        itemLabel={removeTarget ? partItemLabel(removeTarget) : ""}
        pending={pending}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
