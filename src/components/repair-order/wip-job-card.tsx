"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Trash2,
  DollarSign,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCents } from "@/lib/format";
import { deleteJob } from "@/server/actions/estimate";
import type { RepairOrderDetail } from "@/server/repair-order";
import type { Technician } from "@/server/staff";

type Job = RepairOrderDetail["jobs"][number];

function jobTotals(job: Job, taxBps: number) {
  const laborLines = job.laborLines.filter((l) => l.authorized);
  const partLines = job.partLines.filter((p) => p.authorized);
  const laborTotal = laborLines.reduce((s, l) => s + Math.round(l.hours * l.rateCents), 0);
  const partsTotal = partLines.reduce((s, p) => s + p.retailCents * p.quantity, 0);
  const partsCost = partLines.reduce((s, p) => s + p.costCents * p.quantity, 0);
  const subtotal = laborTotal + partsTotal;
  const laborTax = job.laborTaxable ? Math.round((laborTotal * taxBps) / 10000) : 0;
  const partsTax = job.partsTaxable ? Math.round((partsTotal * taxBps) / 10000) : 0;
  const gp = laborTotal + (partsTotal - partsCost);
  const hours = laborLines.reduce((s, l) => s + l.hours, 0);
  return {
    laborTotal,
    partsTotal,
    subtotal,
    laborTax,
    partsTax,
    jobTotal: subtotal + laborTax + partsTax,
    gp,
    gpPct: subtotal > 0 ? (gp / subtotal) * 100 : 0,
    hours,
  };
}

function techName(technicians: Technician[], id: string | null | undefined) {
  if (!id) return "Unassigned";
  return technicians.find((t) => t.id === id)?.name ?? "Unassigned";
}

export function WipJobCard({
  roId,
  index,
  job,
  taxBps,
  technicians,
  baseRateCents,
  roDone,
  forceCollapsed,
}: {
  roId: string;
  index: number;
  job: Job;
  taxBps: number;
  technicians: Technician[];
  baseRateCents: number;
  roDone: boolean;
  forceCollapsed?: boolean;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [pending, start] = useTransition();
  const t = jobTotals(job, taxBps);
  const laborLines = job.laborLines.filter((l) => l.authorized);
  const partLines = job.partLines.filter((p) => p.authorized);
  const incomplete = !roDone && laborLines.length + partLines.length === 0;
  const isCollapsed = forceCollapsed ?? collapsed;

  useEffect(() => {
    if (forceCollapsed !== undefined) setCollapsed(forceCollapsed);
  }, [forceCollapsed]);

  function remove() {
    if (roDone) return;
    if (!confirm(`Delete job "${job.name}"? This removes its labor and parts.`)) return;
    start(async () => {
      const res = await deleteJob(job.id);
      if (res.ok) router.refresh();
      else alert(res.error);
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-2">
        <GripVertical className="size-4 text-foreground/35" />
        <button type="button" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle job">
          {isCollapsed ? <ChevronRight className="size-4 text-foreground/55" /> : <ChevronDown className="size-4 text-foreground/55" />}
        </button>
        {incomplete ? (
          <span className="size-2.5 shrink-0 rounded-full bg-brand-red" title="Incomplete" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
        )}
        <Wrench className="size-4 shrink-0 text-brand-navy/70" />
        <span className="font-semibold text-foreground">
          {index + 1}. {job.name}
        </span>
        <span className="text-sm font-normal text-foreground/55">({t.hours.toFixed(2)} Hours)</span>
        <div className="ml-auto flex items-center gap-1 text-foreground/55">
          <span className="hidden rounded-md border border-border bg-background px-2 py-1 text-xs sm:inline">
            {techName(technicians, job.technicianId)}
          </span>
          <span className="hidden items-center gap-0.5 rounded-md px-1.5 py-1 text-xs tabular-nums sm:flex">
            <DollarSign className="size-3.5" />
            {(baseRateCents / 100).toFixed(0)}
          </span>
          {!roDone ? (
            <>
              <Link
                href={`/repair-orders/${roId}/estimate`}
                aria-label="Edit job on estimate tab"
                title="Edit job on estimate tab"
                className="rounded-md p-1.5 hover:bg-accent hover:text-foreground"
              >
                <Pencil className="size-4" />
              </Link>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                aria-label="Delete job"
                title="Delete job"
                className="rounded-md p-1.5 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {job.note ? (
        <div className="border-b border-border px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground/55">Note: </span>
          {job.note}
        </div>
      ) : null}

      {!isCollapsed ? (
        <>
      {/* Labor */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground">
            <th className="px-3 py-2 text-left">Labor</th>
            <th className="px-3 py-2 text-left">Technician</th>
            <th className="w-16 px-3 py-2 text-right">Hours</th>
            <th className="w-24 px-3 py-2 text-right">Rate</th>
            <th className="w-24 px-3 py-2 text-right">Total</th>
            <th className="w-28 px-3 py-2 text-right" />
          </tr>
        </thead>
        <tbody>
          {laborLines.map((l) => (
            <tr key={l.id} className="border-b border-border/70 last:border-0">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 shrink-0 text-brand-navy/60" />
                  <span className={roDone ? "text-foreground/50 line-through" : "text-brand-navy"}>
                    {l.description}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {techName(technicians, l.technicianId ?? job.technicianId)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-foreground">{l.hours.toFixed(2)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-foreground">{formatCents(l.rateCents)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">
                {formatCents(Math.round(l.hours * l.rateCents))}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Tech timeclock — coming soon"
                    className="h-7 gap-1 border-brand-navy/30 px-2 text-xs text-brand-navy"
                  >
                    <Play className="size-3" /> Start
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Tech timeclock — coming soon"
                    className="h-7 px-2 text-xs"
                  >
                    Finish
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled
                    title="Tech timeclock — coming soon"
                    className="h-7 px-2 text-xs text-foreground/55"
                  >
                    <Pause className="size-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Parts */}
      {partLines.length > 0 ? (
        <table className="w-full border-t border-border text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground">
              <th className="px-3 py-2 text-left">Part</th>
              <th className="w-14 px-3 py-2 text-right">Qty</th>
              <th className="w-24 px-3 py-2 text-right">Cost</th>
              <th className="w-24 px-3 py-2 text-right">Retail</th>
              <th className="w-24 px-3 py-2 text-right">Total</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {partLines.map((p) => (
              <tr key={p.id} className="border-b border-border/70 last:border-0 align-top">
                <td className="px-3 py-2">
                  <div>
                    <span className="text-foreground">
                      {p.brand ? <span className="font-medium">{p.brand} </span> : null}
                      {p.description}
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-2 border-amber-200 bg-amber-50 text-[10px] font-semibold uppercase text-amber-800"
                    >
                      {p.source === "PARTSTECH" ? "Quoted" : "Needed"}
                    </Badge>
                    {p.partNumber ? (
                      <div className="text-xs text-foreground/50">{p.partNumber}</div>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{p.quantity}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatCents(p.costCents)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCents(p.retailCents)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {formatCents(p.retailCents * p.quantity)}
                </td>
                <td className="px-3 py-2 text-right">
                  <Checkbox checked={roDone} aria-label="Part complete" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {/* Job totals footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/25 px-3 py-2 text-sm">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            GP% <b className="text-foreground">{t.gpPct.toFixed(1)}%</b>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span>
            Subtotal <b className="tabular-nums text-foreground">{formatCents(t.subtotal)}</b>
          </span>
          <span className="text-foreground/55">
            Labor Tax <span className="text-foreground/45">est</span> {formatCents(t.laborTax)}
          </span>
          <span className="text-foreground/55">
            Parts Tax <span className="text-foreground/45">est</span> {formatCents(t.partsTax)}
          </span>
          <span className="font-semibold text-foreground">
            JOB TOTAL <span className="tabular-nums">{formatCents(t.jobTotal)}</span>
          </span>
        </div>
      </div>
        </>
      ) : null}
    </div>
  );
}
