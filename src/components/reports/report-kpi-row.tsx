"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Car,
  CircleDollarSign,
  Clock,
  DollarSign,
  Hash,
  Percent,
  Receipt,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import type { ReportKpi } from "@/lib/reports";

type KpiStyle = { icon: LucideIcon; tint: string };

function kpiStyleFor(label: string): KpiStyle {
  const lower = label.toLowerCase();

  if (lower.includes("revenue") || lower.includes("sales") || lower.includes("collected") || lower.includes("total value")) {
    return { icon: DollarSign, tint: "bg-emerald-100 text-emerald-600" };
  }
  if (lower.includes("profit") || lower.includes("gp") || lower.includes("margin")) {
    return { icon: TrendingUp, tint: "bg-brand-light/40 text-brand-navy" };
  }
  if (lower.includes("average") || lower.includes("avg") || lower.includes("aro")) {
    return { icon: BarChart3, tint: "bg-brand-light/30 text-brand-navy" };
  }
  if (lower.includes("car") || lower.includes("vehicle")) {
    return { icon: Car, tint: "bg-brand-light/40 text-brand-navy" };
  }
  if (lower.includes("hour") || lower.includes("aging") || lower.includes("days")) {
    return { icon: Clock, tint: "bg-amber-100 text-amber-600" };
  }
  if (lower.includes("customer") || lower.includes("technician") || lower.includes("tech")) {
    return { icon: Users, tint: "bg-brand-light/40 text-brand-navy" };
  }
  if (lower.includes("repair") || lower.includes("ro") || lower.includes("order") || lower.includes("job")) {
    return { icon: Wrench, tint: "bg-brand-red/10 text-brand-red" };
  }
  if (lower.includes("transaction") || lower.includes("invoice") || lower.includes("payment")) {
    return { icon: Receipt, tint: "bg-brand-red/10 text-brand-red" };
  }
  if (lower.includes("outstanding") || lower.includes("balance") || lower.includes("ar")) {
    return { icon: CircleDollarSign, tint: "bg-rose-100 text-rose-600" };
  }
  if (lower.includes("rate") || lower.includes("percent") || lower.includes("%")) {
    return { icon: Percent, tint: "bg-brand-light/30 text-brand-navy" };
  }
  if (lower.includes("count") || lower.includes("total") || lower.includes("status")) {
    return { icon: Hash, tint: "bg-brand-light/40 text-brand-navy" };
  }

  return { icon: BarChart3, tint: "bg-brand-light/40 text-brand-navy" };
}

type ReportKpiRowProps = {
  kpis: ReportKpi[];
};

export function ReportKpiRow({ kpis }: ReportKpiRowProps) {
  if (kpis.length === 0) return null;

  return (
    <section aria-label="Key metrics">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Summary
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const { icon, tint } = kpiStyleFor(kpi.label);
          return (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              hint={kpi.hint}
              icon={icon}
              tint={tint}
            />
          );
        })}
      </div>
    </section>
  );
}
