"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Mail,
  TrendingUp,
} from "lucide-react";

import { HERO_RO } from "@/components/marketing-site/hero-lifecycle-ring";
import { cn } from "@/lib/utils";

/**
 * Pricing page — Daily Snapshot + kanban strip + approval card.
 * Different from ProductUiShowcase; no lifecycle ring.
 */
export function PricingUiShowcase({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-navy/55">
          Operations at a glance
        </p>
        <Link
          href="/demo"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-navy underline-offset-2 hover:text-brand-red hover:underline"
        >
          See it in the walkthrough
          <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>

      <DailySnapshotStrip className="mt-4" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:gap-5">
        <KanbanStrip />
        <ApprovalCard />
      </div>
    </div>
  );
}

function DailySnapshotStrip({ className }: { className?: string }) {
  const kpis = [
    { label: "Open ROs", value: "12", sub: "3 estimates" },
    { label: "WIP today", value: "5", sub: "2 same-day" },
    { label: "Revenue", value: "$8.4k", sub: "collected" },
    { label: "Avg ticket", value: "$412", sub: "this week" },
  ] as const;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-brand-navy/12 bg-white shadow-[0_12px_32px_-20px_rgba(22,88,142,0.28)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-brand-navy/8 bg-brand-navy px-4 py-2.5">
        <BarChart3 className="size-4 text-brand-light" aria-hidden />
        <span className="text-sm font-bold text-white">Live Operations Daily Snapshot</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-white/70">
          <TrendingUp className="size-3 text-emerald-400" aria-hidden />
          Mon · live
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-brand-navy/6 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="px-4 py-3 text-center sm:py-3.5">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{kpi.label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-brand-navy">{kpi.value}</p>
            <p className="text-[10px] text-slate-500">{kpi.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanStrip() {
  const columns = [
    {
      title: "Estimates",
      tone: "bg-sky-500/15 text-sky-700",
      cards: [
        { ro: "#1047", name: "Maria Santos", vehicle: "2018 Honda CR-V", total: "$680" },
        { ro: "#1048", name: "James Wu", vehicle: "2015 F-150", total: "$920" },
      ],
    },
    {
      title: "Work in progress",
      tone: "bg-brand-light/30 text-brand-navy",
      cards: [{ ro: HERO_RO.number, name: HERO_RO.customer, vehicle: HERO_RO.vehicle, total: "$1,240", active: true }],
    },
    {
      title: "Completed",
      tone: "bg-emerald-500/15 text-emerald-700",
      cards: [{ ro: "#1044", name: "Pat O'Brien", vehicle: "2019 Camry", total: "$540", done: true }],
    },
  ] as const;

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-navy/12 bg-white shadow-[0_12px_32px_-20px_rgba(22,88,142,0.28)]">
      <div className="border-b border-brand-navy/8 bg-slate-50/80 px-4 py-2.5">
        <p className="text-sm font-bold text-brand-navy">Job board</p>
        <p className="text-[10px] text-slate-500">Drag ROs · same record from estimate to paid</p>
      </div>
      <div className="grid divide-y divide-brand-navy/6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {columns.map((col) => (
          <div key={col.title} className="p-3">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                col.tone,
              )}
            >
              {col.title}
            </span>
            <div className="mt-2 space-y-2">
              {col.cards.map((card) => (
                <div
                  key={card.ro}
                  className={cn(
                    "rounded-lg border px-2.5 py-2",
                    "active" in card && card.active
                      ? "border-brand-navy/25 bg-brand-light/15 shadow-sm"
                      : "border-brand-navy/8 bg-slate-50/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold tabular-nums text-brand-navy">{card.ro}</span>
                    {"done" in card && card.done ? (
                      <CheckCircle2 className="size-3 text-emerald-600" aria-hidden />
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-700">{card.name}</p>
                  <p className="truncate text-[9px] text-slate-400">{card.vehicle}</p>
                  <p className="mt-1 text-[11px] font-bold tabular-nums text-brand-navy">{card.total}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovalCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-brand-navy/12 bg-white shadow-[0_12px_32px_-20px_rgba(22,88,142,0.28)]">
      <div className="border-b border-brand-navy/8 bg-brand-light/15 px-4 py-3">
        <p className="text-sm font-bold text-brand-navy">Customer approval</p>
        <p className="text-[10px] text-slate-500">Email link · no phone tag</p>
      </div>

      <div className="flex-1 space-y-3 p-4">
        <div className="flex items-start gap-3 rounded-xl border border-brand-navy/8 bg-slate-50/80 p-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-brand-navy" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-brand-navy">Estimate sent · {HERO_RO.number}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {HERO_RO.customer} · {HERO_RO.vehicle}
            </p>
            <p className="mt-1 text-xs font-bold tabular-nums text-brand-navy">{HERO_RO.total}</p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
            <span className="text-[11px] font-bold text-emerald-800">Approved 9:41 AM</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-600">
            Customer opened the link on mobile. RO moved to WIP automatically — advisor notified.
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-brand-navy/15 bg-brand-navy/[0.02] px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Ignition includes</p>
          <p className="mt-0.5 text-[11px] font-medium text-brand-navy">
            Email estimates · approval links · digital invoices
          </p>
        </div>
      </div>
    </div>
  );
}
