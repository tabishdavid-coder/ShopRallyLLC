"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Car,
  LayoutDashboard,
  Receipt,
  TrendingUp,
} from "lucide-react";

import type { DashboardData } from "@/lib/dashboard";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent: "navy" | "light" | "red" | "emerald";
  href?: string;
  className?: string;
};

const ACCENT = {
  navy: "border-t-brand-navy bg-card",
  light: "border-t-brand-light bg-card",
  red: "border-t-brand-red bg-card",
  emerald: "border-t-emerald-500 bg-card",
} as const;

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  href,
  className,
}: StatTileProps) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-border/80 border-t-[3px] p-4 shadow-sm transition-shadow hover:shadow-md",
        ACCENT[accent],
        href && "cursor-pointer",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-md",
            accent === "navy" && "bg-brand-navy/10 text-brand-navy",
            accent === "light" && "bg-brand-light/30 text-brand-navy",
            accent === "red" && "bg-brand-red/10 text-brand-red",
            accent === "emerald" && "bg-emerald-100 text-emerald-700",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-brand-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    );
  }
  return body;
}

export function BentoStats({ data }: { data: DashboardData }) {
  const { kpis, rangeLabel } = data;
  const todayVolume =
    data.revenueTrend.length > 0
      ? data.revenueTrend[data.revenueTrend.length - 1]?.cents ?? 0
      : kpis.grossVolumeCents;

  return (
    <div className="grid h-full grid-cols-2 gap-3 lg:grid-cols-3">
      <StatTile
        label="Cars in shop"
        value={String(kpis.carsInShop)}
        hint="Approved + in progress"
        icon={Car}
        accent="light"
      />
      <StatTile
        label="Collected"
        value={formatCents(kpis.grossVolumeCents)}
        hint={`${rangeLabel} · today ${formatCents(todayVolume)}`}
        icon={TrendingUp}
        accent="emerald"
      />
      <StatTile
        label="Open ROs"
        value={String(kpis.openRoCount)}
        hint={`${kpis.estimatesCount} est · ${kpis.wipCount} WIP`}
        icon={Receipt}
        accent="red"
      />
      <StatTile
        label="Appointments"
        value={String(kpis.appointmentsToday)}
        hint={`${kpis.appointmentsThisWeek} this week`}
        icon={Calendar}
        accent="navy"
      />
      <StatTile
        label="Full dashboard"
        value="Charts & export"
        hint="Revenue, AR, payment mix"
        icon={LayoutDashboard}
        accent="light"
        href="/dashboard"
        className="col-span-2 border-dashed border-brand-light/80 bg-brand-light/5 lg:col-span-1"
      />
    </div>
  );
}
