import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  Package,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Tiny still peeks of real CRM surfaces — curiosity bait under the lifecycle dial.
 * No browser chrome / white window wrapping the ring.
 */
export function HeroCrmPeeks({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      {/* Bridge: dial → peeks — speed contrast + single walkthrough CTA */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-light/80">
            Same RO · real surfaces
          </p>
          <span className="hidden h-3 w-px bg-white/15 sm:block" aria-hidden />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex shrink-0 items-center rounded-full border border-dashed border-white/25 bg-white/[0.05] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/60 backdrop-blur-sm">
              ~8 days typical
            </span>
            <span className="text-[9px] font-bold text-brand-red" aria-hidden>
              →
            </span>
            <span className="inline-flex shrink-0 items-center rounded-full border border-brand-light/35 bg-brand-light/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-brand-light backdrop-blur-sm">
              One board · same day
            </span>
          </div>
        </div>

        <Link
          href="/demo"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-light underline-offset-2 hover:text-white hover:underline sm:ml-auto"
        >
          Try the walkthrough
          <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>

      <div className="-mx-1 mt-2 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:mt-2.5 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
        <JobBoardPeek className="w-[200px] shrink-0 sm:w-auto" />
        <EstimatePeek className="w-[200px] shrink-0 sm:w-auto" />
        <InspectionPeek className="hidden w-[200px] shrink-0 sm:block sm:w-auto" />
        <PartsApprovalPeek className="w-[200px] shrink-0 sm:w-auto lg:col-span-1" />
      </div>
    </div>
  );
}

function PeekShell({
  className,
  children,
  label,
}: {
  className?: string;
  children: ReactNode;
  label: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/15 bg-white/[0.07] p-2.5 shadow-lg shadow-black/20 backdrop-blur-sm",
        className,
      )}
    >
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-white/45">{label}</p>
      {children}
    </div>
  );
}

function JobBoardPeek({ className }: { className?: string }) {
  return (
    <PeekShell label="Job board" className={className}>
      <div className="rounded-lg border border-white/12 bg-brand-navy/80 p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded bg-sky-500/25 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-sky-200">
            Estimate
          </span>
          <span className="text-[9px] font-bold tabular-nums text-white/55">#1046</span>
        </div>
        <p className="mt-1.5 truncate text-[11px] font-semibold text-white">Luis Hernandez</p>
        <p className="truncate text-[9px] text-white/55">2020 Chevy Silverado</p>
        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5">
          <span className="text-[9px] text-white/45">Same day</span>
          <span className="text-[11px] font-bold tabular-nums text-brand-light">$1,240</span>
        </div>
      </div>
    </PeekShell>
  );
}

function EstimatePeek({ className }: { className?: string }) {
  return (
    <PeekShell label="Estimate lines" className={className}>
      <div className="space-y-1 rounded-lg border border-white/12 bg-white/[0.04] p-1.5">
        <LineRow
          type="Labor"
          name="Brake pads R&R"
          amount="$210"
          typeClass="bg-brand-light/20 text-brand-light"
        />
        <LineRow
          type="Part"
          name="Ceramic pads"
          amount="$86"
          typeClass="bg-brand-red/20 text-red-200"
        />
        <LineRow
          type="Labor"
          name="Fluid flush"
          amount="$70"
          typeClass="bg-brand-light/20 text-brand-light"
        />
      </div>
    </PeekShell>
  );
}

function LineRow({
  type,
  name,
  amount,
  typeClass,
}: {
  type: string;
  name: string;
  amount: string;
  typeClass: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-brand-navy/50 px-1.5 py-1">
      <span className={cn("rounded px-1 py-px text-[7px] font-bold uppercase", typeClass)}>
        {type}
      </span>
      <span className="min-w-0 flex-1 truncate text-[9px] text-white/80">{name}</span>
      <span className="text-[9px] font-bold tabular-nums text-white">{amount}</span>
    </div>
  );
}

function InspectionPeek({ className }: { className?: string }) {
  return (
    <PeekShell label="Digital inspection" className={className}>
      <div className="space-y-1 rounded-lg border border-white/12 bg-brand-navy/70 p-2">
        <InspectRow label="Front brakes" tone="red" note="Pads 2mm" />
        <InspectRow label="Battery" tone="yellow" note="12.1V load" />
        <InspectRow label="Tires" tone="green" note="6/32 OK" />
        <div className="mt-1.5 flex items-center gap-1 border-t border-white/10 pt-1.5 text-[8px] text-white/50">
          <ClipboardCheck className="size-2.5 text-brand-light" aria-hidden />
          Customer-ready DVI
        </div>
      </div>
    </PeekShell>
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
    tone === "red"
      ? "bg-brand-red"
      : tone === "yellow"
        ? "bg-amber-400"
        : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2 shrink-0 rounded-full", dot)} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-white/85">{label}</span>
      <span className="truncate text-[9px] text-white/45">{note}</span>
    </div>
  );
}

function PartsApprovalPeek({ className }: { className?: string }) {
  return (
    <PeekShell label="PartsTech · Approval" className={className}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 rounded-lg border border-brand-light/25 bg-brand-light/10 px-2 py-1.5">
          <Package className="size-3.5 shrink-0 text-brand-light" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold text-white">PartsTech punchout</p>
            <p className="truncate text-[8px] text-white/55">OE + aftermarket · on estimate</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/12 bg-brand-navy/70 px-2 py-1.5">
          <Mail className="size-3.5 shrink-0 text-white/70" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold text-white">Email approval sent</p>
            <p className="truncate text-[8px] text-white/55">Opened 9:38 · Approved 9:41</p>
          </div>
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" aria-hidden />
        </div>
        <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
          <span className="text-[8px] font-bold uppercase tracking-wide text-white/45">
            Daily Snapshot
          </span>
          <span className="text-[9px] font-bold tabular-nums text-brand-light">12 ROs · $8.4k</span>
        </div>
      </div>
    </PeekShell>
  );
}
