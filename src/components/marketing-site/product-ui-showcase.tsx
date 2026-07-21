"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, Wrench } from "lucide-react";

import { HERO_RO } from "@/components/marketing-site/hero-lifecycle-ring";
import { cn } from "@/lib/utils";

/**
 * Features / Product hero — estimate job card + DVI panel.
 * Still composition for light sections; no lifecycle ring.
 */
export function ProductUiShowcase({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-navy/55">
          Real CRM surfaces · same RO
        </p>
        <Link
          href="/demo"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-navy underline-offset-2 hover:text-brand-red hover:underline"
        >
          Try the walkthrough
          <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.85fr] lg:gap-5">
        <EstimateJobCard />
        <InspectionPanel />
      </div>
    </div>
  );
}

function EstimateJobCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-navy/12 bg-white shadow-[0_16px_40px_-24px_rgba(22,88,142,0.35)]">
      {/* Job card header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-brand-navy/8 bg-brand-light/12 px-4 py-3">
        <Wrench className="size-4 text-brand-navy" aria-hidden />
        <span className="text-sm font-bold text-brand-navy">Brake pads R&amp;R</span>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
          Approved
        </span>
        <span className="ml-auto text-xs font-bold tabular-nums text-brand-navy">{HERO_RO.total}</span>
      </div>

      {/* RO context strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-brand-navy/6 bg-slate-50/80 px-4 py-2 text-[11px]">
        <span className="font-bold tabular-nums text-brand-navy">{HERO_RO.number}</span>
        <span className="text-slate-500">{HERO_RO.customer}</span>
        <span className="hidden text-slate-400 sm:inline">·</span>
        <span className="text-slate-500">{HERO_RO.vehicle}</span>
      </div>

      {/* Labor / parts grid */}
      <div className="px-3 py-3 sm:px-4">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 gap-y-0 border-b border-brand-navy/8 pb-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
          <span>Type</span>
          <span>Description</span>
          <span className="text-right">Qty/Hrs</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-brand-navy/6">
          <GridRow
            type="Labor"
            typeClass="bg-brand-light/25 text-brand-navy"
            name="Brake pads R&amp;R"
            qty="1.0 hr"
            amount="$210.00"
          />
          <GridRow
            type="Part"
            typeClass="bg-brand-red/10 text-brand-red"
            name="Ceramic brake pads (front)"
            qty="1"
            amount="$86.00"
          />
          <GridRow
            type="Labor"
            typeClass="bg-brand-light/25 text-brand-navy"
            name="Brake fluid flush"
            qty="0.5 hr"
            amount="$70.00"
          />
          <GridRow
            type="Part"
            typeClass="bg-brand-red/10 text-brand-red"
            name="DOT 4 brake fluid"
            qty="1"
            amount="$18.00"
          />
        </div>

        {/* GP footer */}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-2 rounded-xl border border-brand-navy/8 bg-brand-navy/[0.03] px-3 py-2.5">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Gross profit</p>
            <p className="text-sm font-bold tabular-nums text-brand-navy">
              $284.50 <span className="text-xs font-semibold text-emerald-600">· 68%</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Job total</p>
            <p className="text-lg font-bold tabular-nums text-brand-navy">$384.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GridRow({
  type,
  typeClass,
  name,
  qty,
  amount,
}: {
  type: string;
  typeClass: string;
  name: string;
  qty: string;
  amount: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2 py-2 text-[11px]">
      <span className={cn("rounded px-1.5 py-0.5 text-[8px] font-bold uppercase", typeClass)}>
        {type}
      </span>
      <span className="truncate font-medium text-slate-700">{name}</span>
      <span className="text-right tabular-nums text-slate-500">{qty}</span>
      <span className="text-right font-bold tabular-nums text-brand-navy">{amount}</span>
    </div>
  );
}

function InspectionPanel() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-brand-navy/12 bg-white shadow-[0_12px_32px_-20px_rgba(22,88,142,0.28)]">
      <div className="flex items-center gap-2 border-b border-brand-navy/8 bg-brand-navy px-4 py-3">
        <ClipboardCheck className="size-4 text-brand-light" aria-hidden />
        <span className="text-sm font-bold text-white">Digital inspection</span>
        <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/90">
          MPI
        </span>
      </div>

      <div className="flex-1 space-y-2 p-4">
        <InspectRow label="Front brake pads" tone="red" note="2mm · replace soon" />
        <InspectRow label="Battery load test" tone="yellow" note="12.1V marginal" />
        <InspectRow label="Tire tread (LF)" tone="green" note="6/32 · OK" />
        <InspectRow label="Coolant level" tone="green" note="Full · OK" />
        <InspectRow label="Serpentine belt" tone="yellow" note="Minor cracking" />
      </div>

      <div className="border-t border-brand-navy/8 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-brand-navy">Customer-ready report</p>
            <p className="text-[10px] text-slate-500">Photos + R/Y/G · sent with estimate</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectRow({
  label,
  tone,
  note,
}: {
  label: string;
  tone: "red" | "yellow" | "green";
  note: string;
}) {
  const dot =
    tone === "red" ? "bg-brand-red" : tone === "yellow" ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-brand-navy/6 bg-white px-3 py-2">
      <span className={cn("size-2.5 shrink-0 rounded-full", dot)} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700">{label}</span>
      <span className="truncate text-[10px] text-slate-400">{note}</span>
    </div>
  );
}
