"use client";

import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Car,
  CircleDollarSign,
  DollarSign,
  Receipt,
  TrendingUp,
  Wrench,
} from "lucide-react";

import { collectionRatePct, type DashboardData } from "@/lib/dashboard";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

type KpiTileProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: "navy" | "emerald" | "red" | "amber" | "rose";
};

const ACCENT_ICON = {
  navy: "bg-brand-light/35 text-brand-navy",
  emerald: "bg-emerald-100 text-emerald-600",
  red: "bg-brand-red/10 text-brand-red",
  amber: "bg-amber-100 text-amber-600",
  rose: "bg-rose-100 text-rose-600",
} as const;

function KpiTile({ label, value, hint, icon: Icon, accent = "navy" }: KpiTileProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-card px-3 py-2 shadow-sm">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          ACCENT_ICON[accent],
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-lg font-bold leading-tight text-brand-navy">{value}</p>
        {hint ? (
          <p className="truncate text-xs leading-snug text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function HomeKpiStrip({ data }: { data: DashboardData }) {
  const { kpis, rangeLabel } = data;
  const collectionRate = collectionRatePct(kpis.invoicedCents, kpis.collectedCents);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-4">
      <KpiTile
        label="Cars in shop"
        value={String(kpis.carsInShop)}
        hint="Approved + WIP"
        icon={Car}
        accent="navy"
      />
      <KpiTile
        label="Gross volume"
        value={formatCents(kpis.grossVolumeCents)}
        hint={rangeLabel}
        icon={DollarSign}
        accent="emerald"
      />
      <KpiTile
        label="Open ROs"
        value={String(kpis.openRoCount)}
        hint={`${kpis.estimatesCount} est · ${kpis.wipCount} wip`}
        icon={Receipt}
        accent="red"
      />
      <KpiTile
        label="Completed"
        value={String(kpis.completedInPeriod)}
        hint={rangeLabel}
        icon={Wrench}
        accent="amber"
      />
      <KpiTile
        label="ARO"
        value={kpis.aroCents > 0 ? formatCents(kpis.aroCents) : "—"}
        hint="Avg RO value"
        icon={TrendingUp}
        accent="navy"
      />
      <KpiTile
        label="Outstanding AR"
        value={formatCents(kpis.outstandingArCents)}
        hint="Open balances"
        icon={CircleDollarSign}
        accent="rose"
      />
      <KpiTile
        label="Appointments"
        value={String(kpis.appointmentsToday)}
        hint={`${kpis.appointmentsThisWeek} this wk`}
        icon={Calendar}
        accent="navy"
      />
      <KpiTile
        label="Collection"
        value={collectionRate !== null ? `${collectionRate}%` : "—"}
        hint={
          kpis.invoicedCents > 0
            ? `${formatCents(kpis.collectedCents)} collected`
            : "No invoices"
        }
        icon={TrendingUp}
        accent="emerald"
      />
    </div>
  );
}
