import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PLANS,
  PHASE_ONE_LAUNCH,
  PUBLIC_PLAN_ORDER,
  billingStatusLabel,
  formatPriceFromCents,
  resolvePlanFeatures,
  type PlanFeature,
} from "@/lib/plans";
import { subscriptionFeatureLabelsForPlan, settingsUpgradeLabel } from "@/lib/settings-plan-gates";
import { BILLING_PLAN_FEATURES } from "@/lib/billing-shared";
import { nextPlanTier } from "@/lib/subscription";
import type { BillingStatus, ShopPlan } from "@/generated/prisma";

const FEATURE_LABELS: Record<PlanFeature, string> = {
  cannedJobs: "Canned jobs",
  markupMatrices: "Markup matrices",
  partsTech: "PartsTech catalog",
  laborGuide: "Labor guide & estimate tooling",
  customerEmail: "Customer email",
  customerSms: "Two-way SMS",
  digitalInspections: "Digital vehicle inspections",
  appointments: "Appointments",
  reports: "Operations Daily Snapshot",
  integrations: "Integrations (Stripe, QuickBooks sync)",
  multiLocation: "Multi-location",
  approvalLinks: "Text-to-approve links",
  invoiceSharing: "Digital invoicing",
  advancedReports: "Advanced reporting",
  shopSite: "ShopSite (hosted website)",
  websiteSeo: "Local SEO · Growth Engine SEO",
  marketingCampaigns: "SMS & email campaigns",
  maintenancePrograms: "Maintenance programs",
  aiReviewReplies: "AI Google Review drafts",
  aiCampaignDrafting: "AI campaign drafting",
  aiSeoContent: "Growth Engine SEO content",
  aiCustomerInsights: "AI customer insights",
  aiReceptionist: "AI receptionist (SMS + voice after-hours)",
  motorLabor: "Licensed MOTOR labor data",
};

export function SubscriptionPanel({
  plan,
  billingStatus,
  trialEndsAt,
  planName,
  planTagline,
  upgradeFeature,
}: {
  plan: ShopPlan;
  billingStatus: BillingStatus;
  trialEndsAt: string | null;
  planName: string;
  planTagline: string;
  upgradeFeature?: PlanFeature | null;
}) {
  const features = resolvePlanFeatures({ plan });
  const def = PLANS[plan];
  const upgrade = nextPlanTier(plan);
  const includedFeatureKeys = subscriptionFeatureLabelsForPlan(plan);
  const isCore = plan === "STARTER";

  return (
    <div className="max-w-2xl space-y-6">
      {upgradeFeature ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">
            {settingsUpgradeLabel(upgradeFeature)} is on {PLANS.PROFESSIONAL.name} and above
          </p>
          <p className="mt-1 text-amber-900/85">
            Upgrade your plan to unlock this settings section, or contact support to add it to your shop.
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current plan
            </p>
            <h2 className="mt-1 text-2xl font-bold">{planName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{planTagline}</p>
          </div>
          <StatusBadge status={billingStatus} trialEndsAt={trialEndsAt} />
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {formatPriceFromCents(def.annualMonthlyCents)}
          </span>
          /mo per location (annual) · {formatPriceFromCents(def.monthlyCents)}/mo monthly
        </p>

        <p className="mt-3 text-xs text-muted-foreground">
          Stripe Billing self-serve checkout and customer portal coming soon. Contact support to upgrade today.
        </p>

        {upgrade ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-brand-light/40 bg-brand-light/10 px-3 py-3">
            <Sparkles className="size-4 text-brand-navy" />
            <p className="flex-1 text-sm text-on-brand-wash">
              Upgrade to <strong className="text-brand-navy">{PLANS[upgrade].name}</strong> — {PLANS[upgrade].tagline}
            </p>
            <Button size="sm" className="bg-brand-navy" disabled title="Stripe Billing checkout — coming soon">
              Upgrade
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">Plan limits</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Users</dt>
            <dd className="font-medium">
              {features.maxUsers === null ? "Unlimited" : `Up to ${features.maxUsers}`}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Repair orders / month</dt>
            <dd className="font-medium">
              {features.maxRepairOrdersPerMonth === null
                ? "Unlimited"
                : features.maxRepairOrdersPerMonth}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">What&apos;s included</h3>
        {BILLING_PLAN_FEATURES[plan].intro ? (
          <p className="mt-2 text-sm font-medium text-brand-navy">{BILLING_PLAN_FEATURES[plan].intro}</p>
        ) : null}
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {BILLING_PLAN_FEATURES[plan].items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-foreground">
              <span className="size-1.5 rounded-full bg-brand-navy" />
              {item}
            </li>
          ))}
        </ul>
        <h4 className="mt-6 text-sm font-semibold text-muted-foreground">
          {isCore ? "Included on Core" : "Feature gates"}
        </h4>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {(isCore ? includedFeatureKeys : (Object.keys(FEATURE_LABELS) as PlanFeature[])).map((key) => (
            <li
              key={key}
              className={`flex items-center gap-2 text-sm ${
                features[key] ? "text-foreground" : "text-muted-foreground line-through"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${features[key] ? "bg-brand-navy" : "bg-muted-foreground/40"}`}
              />
              {FEATURE_LABELS[key]}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">Add-on services</h3>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">AI Plus</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Freeform AI repair-order intake, labor-hour assist, and the ShopRally advisor mobile app — $20/mo.
            </p>
          </div>
          <Button variant="outline" size="sm" disabled title="Add-on checkout — coming soon">
            Add AI Plus
          </Button>
        </div>
        {!isCore ? (
          <>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3 border-t pt-3">
              <div>
                <p className="text-sm font-medium">ShopSite + Local SEO</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Monthly: ShopSite $99, Local SEO $129, or bundle $199. One-time launch setup when you start
                  ($349 / $299 / $549 bundle). Included on {PLANS.ENTERPRISE.name} (monthly + setup).
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/marketing/website">ShopSite</Link>
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3 border-t pt-3">
              <div>
                <p className="text-sm font-medium">Local SEO subscription</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Included on {PLANS.ENTERPRISE.name}; $129/mo add-on on other tiers. Audits, Search Console, and
                  monthly reports.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/marketing/seo-automation">Open Growth Engine SEO</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-3 border-t pt-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Need Pro features?</p>
            <p className="mt-1">
              Markup matrices, two-way SMS, PartsTech, Stripe payments, and Growth Engine tools are on{" "}
              {PLANS.PROFESSIONAL.name} and above.
            </p>
            {upgrade ? (
              <Button size="sm" className="mt-3 bg-brand-navy" disabled title="Stripe Billing checkout — coming soon">
                Upgrade to {PLANS[upgrade].name}
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" disabled title="Stripe customer portal — coming soon">
          Manage billing
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href="/pricing" target="_blank">
            {PHASE_ONE_LAUNCH ? "View pricing" : "View all plans"}
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href="/support">Contact support</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Cancellation &amp; data retention</p>
        <p className="mt-1">
          Upon subscription cancellation, ShopRally retains your shop data for 30 days to allow
          export and dispute resolution. After 30 days, tenant data is permanently deleted except
          where longer retention is required by law. Export your data anytime from{" "}
          <Link href="/settings/legal" className="font-medium text-brand-navy hover:underline">
            Settings → Legal
          </Link>
          .
        </p>
      </div>

      {PHASE_ONE_LAUNCH ? null : <PlanComparison current={plan} />}
    </div>
  );
}

function PlanComparison({ current }: { current: ShopPlan }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <h3 className="font-semibold">Compare plans</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {PUBLIC_PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const isCurrent = id === current;
          return (
            <div
              key={id}
              className={`rounded-md border p-3 text-sm ${isCurrent ? "border-brand-navy bg-brand-navy/5" : ""}`}
            >
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">{formatPriceFromCents(p.monthlyCents)}/mo</p>
              {isCurrent ? (
                <span className="mt-1 inline-block text-[10px] font-semibold uppercase text-brand-navy">
                  Current
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  trialEndsAt,
}: {
  status: BillingStatus;
  trialEndsAt: string | null;
}) {
  const styles =
    status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-800"
      : status === "TRIAL"
        ? "bg-amber-100 text-amber-800"
        : status === "PAST_DUE"
          ? "bg-red-100 text-red-800"
          : "bg-muted text-muted-foreground";

  return (
    <div className="text-right">
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
        {billingStatusLabel(status)}
      </span>
      {status === "TRIAL" && trialEndsAt ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Ends {new Date(trialEndsAt).toLocaleDateString()}
        </p>
      ) : null}
    </div>
  );
}
