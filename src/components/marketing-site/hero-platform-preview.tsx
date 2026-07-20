"use client";

import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  LayoutGrid,
  Mail,
  Package,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** Ignition launch modules only — no Pro/Elite chrome. */
const MODULES = [
  { id: "crm", label: "Shop CRM", icon: Wrench },
  { id: "jobboard", label: "Job Board", icon: LayoutGrid },
  { id: "estimates", label: "Estimates", icon: Mail },
  { id: "partstech", label: "PartsTech", icon: Package },
  { id: "dvi", label: "Inspections", icon: ClipboardCheck },
  { id: "appts", label: "Appointments", icon: Calendar },
  { id: "reports", label: "Daily Snapshot", icon: BarChart3 },
] as const;

const FEATURE_CHIPS = [
  "PartsTech catalog & punchout",
  "Operations Daily Snapshot",
  "Digital vehicle inspections",
  "Canned jobs & shop labor",
  "Email estimates & approvals",
  "Job board",
  "Appointments",
  "Payment tracking",
  "Unlimited NHTSA VIN",
  "Unlimited users & ROs",
] as const;

type HeroPlatformPreviewProps = {
  className?: string;
  /** Cinematic home stage — denser product chrome, no chip laundry list. */
  variant?: "default" | "cinematic";
};

export function HeroPlatformPreview({
  className,
  variant = "default",
}: HeroPlatformPreviewProps) {
  const cinematic = variant === "cinematic";

  return (
    <div
      className={cn(
        "relative mx-auto",
        cinematic ? "max-w-none" : "max-w-5xl",
        className ?? (cinematic ? undefined : "mt-14"),
      )}
    >
      {cinematic ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 sm:-inset-x-16"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_40%,rgb(0_169_255/0.28),transparent_70%)]" />
          <div className="absolute inset-x-[10%] bottom-0 h-1/2 rounded-[100%] bg-brand-navy/25 blur-3xl" />
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-hidden border-2 border-brand-navy/15 bg-white",
          cinematic
            ? "rounded-xl shadow-[0_28px_80px_-20px_rgb(30_58_86/0.55),0_12px_28px_-12px_rgb(0_169_255/0.25)] ring-1 ring-white/40"
            : "rounded-2xl shadow-2xl shadow-brand-navy/10",
        )}
      >
        <div className="flex items-center gap-2 border-b border-brand-navy/10 bg-brand-navy px-4 py-3">
          <div className="size-2.5 rounded-full bg-brand-red" />
          <div className="size-2.5 rounded-full bg-brand-light" />
          <div className="size-2.5 rounded-full bg-white/40" />
          <span className="ml-2 text-xs font-medium text-white/90">
            {cinematic
              ? "ShopRally Ignition"
              : "ShopRally Ignition · job board, PartsTech, inspections & live ops"}
          </span>
          {cinematic ? (
            <span className="ml-auto hidden items-center gap-1.5 text-[10px] font-semibold text-brand-light sm:inline-flex">
              <span className="size-1.5 animate-pulse rounded-full bg-brand-light" />
              Live ops
            </span>
          ) : null}
        </div>

        <div className="border-b border-brand-navy/10 bg-brand-light/10 px-3 py-2">
          <div className="scrollbar-none flex gap-1 overflow-x-auto pb-0.5">
            {MODULES.map((mod, index) => {
              const Icon = mod.icon;
              const active = cinematic ? index === 0 : true;
              return (
                <div
                  key={mod.id}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold shadow-sm",
                    active
                      ? "bg-brand-navy text-white"
                      : "bg-white/80 text-brand-navy/70 ring-1 ring-brand-navy/10",
                  )}
                >
                  <Icon className="size-3" />
                  {mod.label}
                  {active ? (
                    <CheckCircle2 className="size-3 text-brand-light" aria-hidden />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-px bg-brand-navy/5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-navy/60">
              Shop CRM
            </p>
            <div className="mt-2 rounded-lg border border-brand-light/40 bg-brand-light/5 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                  Pending approval
                </span>
                <span className="text-[10px] font-bold text-brand-navy">RO#1042</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-brand-navy">Mike Johnson</p>
              <p className="text-[11px] text-slate-500">2019 Ford F-150 · Brake job</p>
              <p className="mt-1.5 inline-flex items-center gap-1 rounded bg-brand-navy/8 px-1.5 py-0.5 text-[10px] font-semibold text-brand-navy">
                <Package className="size-2.5" aria-hidden />
                PartsTech · pads &amp; rotors
              </p>
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
          </div>

          <div className="bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-navy/60">
              Digital vehicle inspections
            </p>
            <div className="mt-2 rounded-lg border border-brand-light/40 bg-brand-light/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-brand-navy">Multi-point · RO#1038</p>
                <span className="text-[10px] font-bold text-brand-light">10/12</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-navy/10">
                <div
                  className={cn(
                    "h-full w-[83%] rounded-full bg-brand-light",
                    cinematic && "sr-hero-bar",
                  )}
                />
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
                <p className="text-xs font-semibold text-emerald-900">Photo markup ready</p>
                <p className="text-[10px] text-emerald-700">3 items added to estimate</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:col-span-2 xl:col-span-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-navy/60">
              Estimates &amp; ops
            </p>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-brand-navy/20 bg-brand-navy/[0.05] px-3 py-2">
                <Package className="size-3.5 shrink-0 text-brand-navy" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-brand-navy">PartsTech</p>
                  <p className="text-[10px] text-slate-500">
                    Catalog punchout · included with Ignition
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-brand-light/50 bg-brand-light/10 px-3 py-2">
                <Mail className="size-3.5 shrink-0 text-brand-navy" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-brand-navy">Estimate emailed</p>
                  <p className="text-[10px] text-slate-500">Mike Johnson · approval link · 2m ago</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <Calendar className="size-3.5 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900">Appointment</p>
                  <p className="text-[10px] text-emerald-700">Thu 9:00 AM · Oil change</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-brand-navy/10 bg-brand-navy/[0.03] px-3 py-2">
                <BarChart3 className="size-3.5 shrink-0 text-brand-navy" />
                <div>
                  <p className="text-xs font-semibold text-brand-navy">Operations Daily Snapshot</p>
                  <p className="text-[10px] text-slate-500">6 ROs · 3 appts · next up today</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900">Payment recorded</p>
                  <p className="text-[10px] text-emerald-700">Cash · $640 · RO#1038</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!cinematic ? (
          <div className="border-t border-brand-navy/10 bg-brand-light/[0.12] px-4 py-3">
            <div className="flex flex-wrap justify-center gap-1.5">
              {FEATURE_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-brand-navy/10 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-brand-navy shadow-sm"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-navy/10 bg-brand-navy px-4 py-2.5 text-[11px] text-white/90">
          <span className="font-medium">
            {cinematic
              ? "CRM · PartsTech · inspections · job board · Daily Snapshot"
              : "CRM · job board · PartsTech · digital inspections · email estimates · appointments · Daily Snapshot"}
          </span>
          <span className="rounded bg-brand-light px-2.5 py-0.5 text-[10px] font-bold text-brand-navy">
            Ignition
          </span>
        </div>
      </div>
    </div>
  );
}
