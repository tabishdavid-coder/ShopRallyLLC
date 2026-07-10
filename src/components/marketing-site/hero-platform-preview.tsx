"use client";

import {
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Globe,
  LayoutGrid,
  MessageSquare,
  Package,
  Repeat,
  Send,
  Sparkles,
  Star,
  Wrench,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

const MODULES = [
  { id: "crm", label: "Shop CRM", icon: Wrench },
  { id: "dashboard", label: "Live dashboard", icon: BarChart3 },
  { id: "jobboard", label: "Job Board", icon: LayoutGrid },
  { id: "dvi", label: "DVIs", icon: ClipboardCheck },
  { id: "payments", label: "Payments", icon: Zap },
  { id: "growth", label: "Growth Engine", icon: Sparkles },
  { id: "website", label: "ShopSite", icon: Globe },
  { id: "parts", label: "PartsTech", icon: Package },
  { id: "ai", label: "AI Reception", icon: Bot },
  { id: "reports", label: "Daily Snapshot", icon: BarChart3 },
  { id: "subs", label: "Subscriptions", icon: Repeat },
] as const;

const FEATURE_CHIPS = [
  "Operations Daily Snapshot",
  "Digital vehicle inspections",
  "Licensed MOTOR on Pro+",
  "Plate & VIN decode",
  "OEM specs & fluids",
  "Approval links",
  "Two-way SMS",
  "Growth Engine",
  "Google review management",
  "Online booking",
  "Inventory",
  "Canned jobs",
  "Stripe Connect",
] as const;

export function HeroPlatformPreview({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto max-w-5xl", className ?? "mt-14")}>
      <div className="overflow-hidden rounded-2xl border-2 border-brand-navy/15 bg-white shadow-2xl shadow-brand-navy/10">
        <div className="flex items-center gap-2 border-b border-brand-navy/10 bg-brand-navy px-4 py-3">
          <div className="size-2.5 rounded-full bg-brand-red" />
          <div className="size-2.5 rounded-full bg-brand-light" />
          <div className="size-2.5 rounded-full bg-white/40" />
          <span className="ml-2 text-xs font-medium text-white/90">
            ShopRally · CRM, inspections, Growth Engine, payments &amp; AI
          </span>
        </div>

        {/* Module ribbon — scroll on small screens */}
        <div className="border-b border-brand-navy/10 bg-brand-light/10 px-3 py-2">
          <div className="scrollbar-none flex gap-1 overflow-x-auto pb-0.5">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.id}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand-navy px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm"
                >
                  <Icon className="size-3" />
                  {mod.label}
                  <CheckCircle2 className="size-3 text-brand-light" aria-hidden />
                </div>
              );
            })}
          </div>
        </div>

        {/* Workflow panels */}
        <div className="grid gap-px bg-brand-navy/5 sm:grid-cols-2 xl:grid-cols-4">
          {/* Shop CRM */}
          <div className="bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-navy/60">Shop CRM</p>
            <div className="mt-2 rounded-lg border border-brand-light/40 bg-brand-light/5 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                  Pending approval
                </span>
                <span className="text-[10px] font-bold text-brand-navy">RO#1042</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-brand-navy">Mike Johnson</p>
              <p className="text-[11px] text-slate-500">2019 Ford F-150 · Brake job</p>
              <p className="mt-2 text-sm font-bold tabular-nums text-brand-navy">$1,840</p>
            </div>
            <div className="mt-2 rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded bg-brand-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-navy">
                  In progress
                </span>
                <span className="text-[10px] font-bold text-brand-navy">RO#1038</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-brand-navy">Elena Martinez</p>
              <p className="text-[11px] text-slate-500">2021 Camry · Canned job applied</p>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-brand-navy/10 bg-brand-navy/[0.03] px-3 py-2">
              <LayoutGrid className="size-3.5 shrink-0 text-brand-navy" />
              <div>
                <p className="text-xs font-semibold text-brand-navy">Job board</p>
                <p className="text-[10px] text-slate-500">8 estimates · 5 WIP · 7 done</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2">
              <BarChart3 className="size-3.5 shrink-0 text-emerald-700" />
              <div>
                <p className="text-xs font-semibold text-brand-navy">Operations Daily Snapshot</p>
                <p className="text-[10px] text-slate-500">6 ROs · 3 appts · next up today</p>
              </div>
            </div>
          </div>

          {/* Inspections */}
          <div className="bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-navy/60">
              Digital vehicle inspections (DVIs)
            </p>
            <div className="mt-2 rounded-lg border border-brand-light/40 bg-brand-light/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-brand-navy">MPI · RO#1038</p>
                <span className="text-[10px] font-bold text-brand-light">10/12</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-navy/10">
                <div className="h-full w-[83%] rounded-full bg-brand-light" />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Brakes — OK</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="size-2 rounded-full bg-amber-400" />
                  <span className="text-slate-600">Tires — 4/32&quot; tread</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="size-2 rounded-full bg-brand-red" />
                  <span className="text-slate-600">Battery — failed load test</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <ClipboardCheck className="size-3.5 shrink-0 text-emerald-700" />
              <div>
                <p className="text-xs font-semibold text-emerald-900">Photo markup sent</p>
                <p className="text-[10px] text-emerald-700">3 items added to estimate</p>
              </div>
            </div>
          </div>

          {/* Growth Engine */}
          <div className="bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-navy/60">
              Growth Engine
            </p>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-brand-light/50 bg-brand-light/10 px-3 py-2">
                <Send className="size-3.5 shrink-0 text-brand-navy" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-brand-navy">Approval link sent</p>
                  <p className="text-[10px] text-slate-500">SMS · Mike Johnson · 2m ago</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <Calendar className="size-3.5 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900">Online booking</p>
                  <p className="text-[10px] text-emerald-700">Thu 9:00 AM · Oil change</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <Star className="size-3.5 shrink-0 fill-amber-500 text-amber-500" />
                <div>
                  <p className="text-xs font-semibold text-amber-950">Review request sent</p>
                  <p className="text-[10px] text-amber-800">Google · post-RO automation</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <MessageSquare className="size-3.5 shrink-0 text-brand-navy" />
                <div>
                  <p className="text-xs font-semibold text-brand-navy">Win-back campaign</p>
                  <p className="text-[10px] text-slate-500">142 lapsed · scheduled</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payments, parts & AI */}
          <div className="bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-navy/60">
              Payments &amp; ops
            </p>
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-900">Approved via text</p>
              </div>
              <p className="mt-1 text-[11px] text-emerald-800">RO#1042 · $1,840 · Stripe</p>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-brand-navy/15 bg-brand-navy/5 px-3 py-2">
              <CreditCard className="size-3.5 shrink-0 text-brand-navy" />
              <div>
                <p className="text-xs font-semibold text-brand-navy">Text-to-pay</p>
                <p className="text-[10px] text-slate-500">$640 collected today</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-brand-light/40 bg-brand-light/10 px-3 py-2">
              <Package className="size-3.5 shrink-0 text-brand-navy" />
              <div>
                <p className="text-xs font-semibold text-brand-navy">PartsTech order</p>
                <p className="text-[10px] text-slate-500">4 parts · RO#1042 · in cart</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-brand-red/20 bg-brand-red/5 px-3 py-2">
              <Repeat className="size-3.5 shrink-0 text-brand-red" />
              <div>
                <p className="text-xs font-semibold text-brand-navy">Maintenance plans</p>
                <p className="text-[10px] text-slate-500">12 subscribers · $49/mo avg</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-brand-navy/15 bg-gradient-to-r from-brand-navy/5 to-brand-light/10 px-3 py-2">
              <Bot className="size-3.5 shrink-0 text-brand-navy" />
              <div>
                <p className="text-xs font-semibold text-brand-navy">AI after-hours SMS</p>
                <p className="text-[10px] text-slate-500">Booked appt · 9:14 PM last night</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature chip strip */}
        <div className="border-t border-brand-navy/10 bg-brand-light/[0.12] px-4 py-3">
          <div className="flex flex-wrap justify-center gap-1.5">
            {FEATURE_CHIPS.map((chip) => (
              <span
                key={chip}
                className={cn(
                  "rounded-full border border-brand-navy/10 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-brand-navy shadow-sm",
                )}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-navy/10 bg-brand-navy px-4 py-2.5 text-[11px] text-white/90">
          <span className="font-medium">
            CRM · Operations Daily Snapshot · job board · DVIs · estimates · MOTOR · PartsTech · SMS · booking ·
            Growth Engine · payments · ShopSite · SEO · AI
          </span>
          <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-[10px] font-bold text-brand-navy">
            Premium all-in-one
          </span>
        </div>
      </div>
    </div>
  );
}
