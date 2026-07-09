"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { EnterShopCrmButton } from "@/components/platform/enter-shop-crm-button";
import { PlatformKpiCard } from "@/components/platform/platform-kpi-card";
import { PlatformPageIntro } from "@/components/platform/platform-page-intro";
import { StripeConnectStatusPill } from "@/components/platform/stripe-connect-status-pill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlatformBillingOverview } from "@/server/platform/billing";
import { AlertTriangle, Building2, Clock, DollarSign, XCircle } from "lucide-react";

function fmtMoney(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const FILTERS = [
  { id: "all", label: "All shops" },
  { id: "trial", label: "Trials" },
  { id: "active", label: "Active paid" },
  { id: "past_due", label: "Past due" },
  { id: "canceled", label: "Canceled" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function PlatformBillingOverview({
  data,
  activeShopId,
}: {
  data: PlatformBillingOverview;
  activeShopId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilter = (searchParams.get("filter") as FilterId) || "all";

  function setFilter(id: FilterId) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") params.delete("filter");
    else params.set("filter", id);
    router.push(`/platform/billing?${params.toString()}`);
  }

  const arrCents = data.mrrCents * 12;

  return (
    <div className="space-y-6">
      <PlatformPageIntro
        title="Billing & plans"
        description="Subscription status across all shops. MRR is estimated from the plan catalog until Stripe Billing is wired."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <PlatformKpiCard
          icon={DollarSign}
          label="MRR (stub)"
          value={fmtMoney(data.mrrCents)}
          sub={`${fmtMoney(arrCents)} ARR in view`}
          isMoney
        />
        <PlatformKpiCard icon={Clock} label="Trials" value={data.trialCount} />
        <PlatformKpiCard icon={Building2} label="Active paid" value={data.activePaidCount} />
        <PlatformKpiCard icon={AlertTriangle} label="Past due" value={data.pastDueCount} />
        <PlatformKpiCard icon={XCircle} label="Canceled" value={data.canceledCount} />
      </div>

      {data.planMix.length > 0 ? (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-navy">Plan mix (current filter)</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.planMix.map((row) => (
              <li
                key={row.plan}
                className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-brand-navy">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.count} shop{row.count === 1 ? "" : "s"}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-brand-navy">{fmtMoney(row.mrrCents)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              activeFilter === f.id
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        className="overflow-x-auto rounded-xl border bg-card shadow-sm"
        data-planned-change="PLAT-02"
      >
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Billing</th>
              <th className="px-4 py-3">Trial ends</th>
              <th className="px-4 py-3 text-right">MRR</th>
              <th className="px-4 py-3">Stripe Connect</th>
              <th className="px-4 py-3">Subscription</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.shops.map((shop) => (
              <tr key={shop.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/platform/shops/${shop.id}`} className="font-medium text-brand-navy hover:underline">
                    {shop.name}
                  </Link>
                  <span className="ml-1 text-xs text-muted-foreground">({shop.code})</span>
                  {activeShopId && shop.id === activeShopId ? (
                    <p className="text-xs text-brand-navy">Active context</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">{shop.planLabel}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                      shop.billingStatus === "PAST_DUE" && "bg-red-100 text-red-800",
                      shop.billingStatus === "TRIAL" && "bg-amber-100 text-amber-900",
                      shop.billingStatus === "ACTIVE" && "bg-emerald-100 text-emerald-800",
                      shop.billingStatus === "CANCELED" && "bg-slate-100 text-slate-600",
                    )}
                  >
                    {shop.billingLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(shop.trialEndsAt)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtMoney(shop.mrrCents)}</td>
                <td className="px-4 py-3">
                  <StripeConnectStatusPill
                    status={shop.stripeConnectStatus}
                    accountId={shop.stripeConnectAccountId}
                    compact
                  />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {shop.stripeSubscriptionId ? (
                    <span className="font-mono text-[10px]">Sub linked</span>
                  ) : shop.stripeCustomerId ? (
                    <span className="font-mono text-[10px]">Customer only</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <EnterShopCrmButton
                      shopId={shop.id}
                      shopName={shop.name}
                      size="sm"
                      variant="outline"
                      className="h-8 border-brand-navy/30 text-brand-navy"
                    >
                      Shop CRM
                    </EnterShopCrmButton>
                    <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                      <Link href={`/platform/shops/${shop.id}`}>Detail</Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {data.shops.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No shops in this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
