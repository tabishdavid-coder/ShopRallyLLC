import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  DollarSign,
  Globe,
  Megaphone,
  Rocket,
  Sparkles,
  TrendingUp,
  UserMinus,
  UserPlus,
} from "lucide-react";

import { PlatformKpiCard } from "@/components/platform/platform-kpi-card";
import { PlatformCurrentBatchCallout } from "@/components/platform/platform-review-hub";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";
import { billingStatusLabel, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import {
  getPlatformShopHealth,
  platformShopHealthLabel,
  type PlatformDashboard,
} from "@/server/platform/dashboard";
import { aiFeatureLabel } from "@/server/platform/ai-usage";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysSince(d: Date): number {
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

function healthStyles(health: ReturnType<typeof getPlatformShopHealth>) {
  switch (health) {
    case "healthy":
      return "bg-emerald-100 text-emerald-700";
    case "watch":
      return "bg-amber-100 text-amber-700";
    case "at-risk":
      return "bg-brand-red/10 text-brand-red";
  }
}

export function PlatformHome({ data }: { data: PlatformDashboard }) {
  const g = data.growth;
  const ai = data.aiUsage;
  const w = data.websites;
  const maxTrendShops = Math.max(1, ...g.growthTrend.map((p) => p.newShops));
  const maxTrendMrr = Math.max(1, ...g.growthTrend.map((p) => p.newMrrCents));

  return (
    <div className="space-y-8">
      <PlatformCurrentBatchCallout />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-navy">Overview</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Grow ShopRally — track subscribing shops, recurring revenue, onboarding velocity, and
            pipeline health. Open a shop CRM from Shops for tenant-level customer or report detail.
          </p>
        </div>
        <Button asChild className="bg-brand-navy">
          <Link href="/platform/onboarding">
            Onboarding pipeline
            <ArrowRight className="ml-1.5 size-4" />
          </Link>
        </Button>
      </div>

      {data.alerts.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.alerts.map((alert) => (
            <li key={alert.id}>
              <Link
                href={alert.href}
                className={cn(
                  "block rounded-xl border p-4 transition-shadow hover:shadow-md",
                  alert.tone === "warning"
                    ? "border-amber-200 bg-amber-50"
                    : "border-brand-light/50 bg-brand-light/10",
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      alert.tone === "warning" ? "text-amber-600" : "text-brand-navy",
                    )}
                  />
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">{alert.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <PlatformKpiCard
          icon={Building2}
          label="Active shops"
          value={g.activeShopCount}
          sub={`${g.payingShopCount} paid · ${g.trialShopCount} trial`}
          tint="bg-brand-light/40 text-brand-navy"
          current={g.activeShopCount}
          prior={g.activeShopPrior30d}
        />
        <PlatformKpiCard
          icon={DollarSign}
          label="MRR (plan catalog)"
          value={formatCents(g.mrrCents)}
          sub={`${formatCents(g.arrCents)} ARR · Stripe TBD`}
          isMoney
          tint="bg-emerald-100 text-emerald-600"
          current={g.mrrCents}
          prior={g.mrrPrior30dCents}
        />
        <PlatformKpiCard
          icon={UserPlus}
          label="New shops (30d)"
          value={g.newShops30d}
          sub="Onboarding velocity"
          tint="bg-brand-navy/10 text-brand-navy"
        />
        <PlatformKpiCard
          icon={Rocket}
          label="Trials ending soon"
          value={g.trialsEndingSoon7d}
          sub={`${g.paidShopCount} paid · ${g.trialShopCount} on trial`}
          tint="bg-amber-100 text-amber-600"
        />
        <PlatformKpiCard
          icon={Megaphone}
          label="Open leads"
          value={g.openLeadCount}
          sub="Demo & trial signups"
          tint="bg-brand-red/10 text-brand-red"
        />
        <PlatformKpiCard
          icon={UserMinus}
          label="Churn / at-risk"
          value={g.atRiskCount}
          sub={`${g.pastDueCount} past due · ${g.suspendedCount} suspended · ${g.canceledCount} canceled`}
          tint="bg-rose-100 text-rose-600"
        />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-brand-navy">
              <Sparkles className="size-4" />
              {PLANS.ENTERPRISE.name} AI usage
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Anthropic calls logged per shop — last 30 days · {ai.last24Hours} in the last 24h
            </p>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            <span className="font-semibold text-brand-navy">{ai.last30Days.totalCalls.toLocaleString()}</span>{" "}
            calls ·{" "}
            <span className="font-semibold text-brand-navy">
              {ai.last30Days.totalTokens.toLocaleString()}
            </span>{" "}
            tokens
          </p>
        </div>
        {ai.last30Days.byFeature.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {ai.last30Days.byFeature.map((row) => (
              <li
                key={row.feature}
                className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs"
              >
                <span className="font-medium text-brand-navy">{aiFeatureLabel(row.feature)}</span>
                <span className="ml-1.5 text-muted-foreground">
                  {row.calls} · {row.tokens.toLocaleString()} tok
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No AI usage logged yet. Review drafts and campaign generation appear here after{" "}
            {PLANS.ENTERPRISE.name} shops use them.
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-brand-navy">Revenue & plan mix</h3>
            <Link href="/platform/billing" className="text-xs font-medium text-brand-navy hover:underline">
              Billing →
            </Link>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            MRR by tier from plan catalog — not live Stripe billing yet.
          </p>
          <ul className="mt-4 space-y-3">
            {g.revenueByPlan.map((row) => (
              <li key={row.plan}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="font-medium">{row.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {row.shopCount} shop{row.shopCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums text-brand-navy">
                    {formatCents(row.mrrCents)}/mo
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-brand-navy"
                    style={{
                      width: `${g.mrrCents > 0 ? Math.round((row.mrrCents / g.mrrCents) * 100) : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
            {g.revenueByPlan.length === 0 ? (
              <li className="text-sm text-muted-foreground">No shops yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-brand-navy">Onboarding pipeline</h3>
            <Link
              href="/platform/onboarding"
              className="text-xs font-medium text-brand-navy hover:underline"
            >
              View pipeline →
            </Link>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg border bg-muted/30 p-3">
              <dt className="text-xs text-muted-foreground">In pipeline</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-brand-navy">
                {g.onboarding.inPipelineCount}
              </dd>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <dt className="text-xs text-muted-foreground">On trial</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-amber-600">
                {g.onboarding.trialInPipelineCount}
              </dd>
            </div>
            <div className="rounded-lg border bg-brand-light/20 p-3">
              <dt className="text-xs text-muted-foreground">Ready to launch</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
                {g.onboarding.readyToLaunchCount}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Shops not yet live — track setup, billing, and go-live readiness before they convert to
            paid MRR.
          </p>
        </section>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-brand-navy" />
            <h3 className="font-semibold text-brand-navy">Customer websites</h3>
          </div>
          <Link href="/platform/websites" className="text-xs font-medium text-brand-navy hover:underline">
            Manage pipeline →
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          ShopSite builds you operate — separate from SEO Autopilot tooling.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">In pipeline</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-brand-navy">{w.pipeline}</dd>
          </div>
          <div className="rounded-lg border bg-emerald-50 p-3">
            <dt className="text-xs text-muted-foreground">Live</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">{w.live}</dd>
          </div>
          <div className="rounded-lg border bg-brand-light/20 p-3">
            <dt className="text-xs text-muted-foreground">Open requests</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-brand-navy">{w.openRequests}</dd>
          </div>
          <div
            className={cn(
              "rounded-lg border p-3",
              w.upkeepDue > 0 ? "border-brand-red/30 bg-brand-red/5" : "bg-muted/30",
            )}
          >
            <dt className="text-xs text-muted-foreground">Upkeep due</dt>
            <dd
              className={cn(
                "mt-1 text-2xl font-bold tabular-nums",
                w.upkeepDue > 0 ? "text-brand-red" : "text-brand-navy",
              )}
            >
              {w.upkeepDue}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-brand-navy">Growth trends (4 weeks)</h3>
          <TrendingUp className="size-4 text-brand-navy" />
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              New shops
            </p>
            <div className="mt-3 flex items-end gap-2">
              {g.growthTrend.map((point) => (
                <div key={`shops-${point.label}`} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold tabular-nums text-brand-navy">
                    {point.newShops}
                  </span>
                  <div
                    className="w-full rounded-t bg-brand-navy/80"
                    style={{ height: `${Math.max(8, (point.newShops / maxTrendShops) * 72)}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{point.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              New MRR (stub)
            </p>
            <div className="mt-3 flex items-end gap-2">
              {g.growthTrend.map((point) => (
                <div key={`mrr-${point.label}`} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold tabular-nums text-emerald-600">
                    {point.newMrrCents > 0 ? formatCents(point.newMrrCents) : "—"}
                  </span>
                  <div
                    className="w-full rounded-t bg-emerald-500/70"
                    style={{ height: `${Math.max(8, (point.newMrrCents / maxTrendMrr) * 72)}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{point.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h3 className="font-semibold text-brand-navy">Recent shops</h3>
            <Link href="/platform/shops" className="text-xs font-medium text-brand-navy hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y">
            {data.recentShops.map((shop) => {
              const health = getPlatformShopHealth(shop);
              const planName = PLANS[shop.plan]?.name ?? shop.plan;
              return (
                <li key={shop.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <Link
                      href={`/platform/shops/${shop.id}`}
                      className="font-medium text-brand-navy hover:underline"
                    >
                      {shop.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {planName} · {billingStatusLabel(shop.billingStatus)} · day{" "}
                      {daysSince(shop.createdAt)} · joined {fmtDate(shop.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      healthStyles(health),
                    )}
                  >
                    {platformShopHealthLabel(health)}
                  </span>
                </li>
              );
            })}
            {data.recentShops.length === 0 ? (
              <li className="px-5 py-6 text-sm text-muted-foreground">No shops provisioned yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h3 className="font-semibold text-brand-navy">Recent support & leads</h3>
            <div className="flex gap-3 text-xs font-medium">
              <Link href="/platform/leads" className="text-brand-navy hover:underline">
                Sales leads
              </Link>
              <Link href="/platform/support" className="text-brand-navy hover:underline">
                Inbox
              </Link>
            </div>
          </div>
          <ul className="divide-y">
            {data.recentTickets.map((ticket) => (
              <li key={ticket.id} className="px-5 py-3 text-sm">
                <Link
                  href={
                    ticket.shopId
                      ? `/platform/support?ticket=${ticket.id}`
                      : `/platform/leads?ticket=${ticket.id}`
                  }
                  className="font-medium text-brand-navy hover:underline"
                >
                  {ticket.subject}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ticket.name} · {ticket.shopName ?? "Marketing lead"} · {fmtDate(ticket.createdAt)}
                </p>
              </li>
            ))}
            {data.recentTickets.length === 0 ? (
              <li className="px-5 py-6 text-sm text-muted-foreground">No tickets yet.</li>
            ) : null}
          </ul>
        </section>
      </div>

    </div>
  );
}
