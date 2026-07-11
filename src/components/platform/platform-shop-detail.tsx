"use client";

import Link from "next/link";
import { ArrowRight, Building2, ExternalLink, FileText, Globe, Radar } from "lucide-react";

import { EnterShopCrmButton } from "@/components/platform/enter-shop-crm-button";
import { StripeConnectStatusPill } from "@/components/platform/stripe-connect-status-pill";
import { Button } from "@/components/ui/button";
import { PlatformShopCompliancePanel } from "@/components/platform/platform-shop-compliance-panel";
import { PlatformClerkOrgPanel } from "@/components/platform/platform-clerk-org-panel";
import { PlatformShopReleaseFlags } from "@/components/platform/platform-shop-release-flags";
import type { OnboardingStep } from "@/server/platform/onboarding";
import type { PlatformShopDetail } from "@/server/platform/shop-detail";

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function PlatformShopDetailView({
  shop,
  compliance,
}: {
  shop: PlatformShopDetail;
  compliance?: {
    complianceSteps: OnboardingStep[];
    auditEvents: {
      id: string;
      eventType: string;
      actorEmail: string | null;
      method: string | null;
      createdAt: Date;
    }[];
    provisionMethod: string | null;
    legalEntityName: string | null;
  };
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/platform/shops" className="text-brand-navy hover:underline">
              Shops
            </Link>
            {" / "}
            {shop.name}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">{shop.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {shop.code} · Master ID {shop.masterId} · {shop.city ?? "—"}
            {shop.state ? `, ${shop.state}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/platform/shops/${shop.id}/legal`}>
              <FileText className="mr-1.5 size-4" />
              Legal / MSA
            </Link>
          </Button>
          <EnterShopCrmButton shopId={shop.id} shopName={shop.name} className="bg-brand-navy" />
        </div>
      </div>

      <div className="rounded-xl border border-brand-light/40 bg-brand-light/10 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-navy">Shop CRM</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Customers, repair orders, reports, and day-to-day operations live in the tenant CRM — not
              here.
            </p>
          </div>
          <EnterShopCrmButton
            shopId={shop.id}
            shopName={shop.name}
            variant="outline"
            className="border-brand-navy/30 text-brand-navy"
          >
            View customers &amp; reports in shop CRM
            <ArrowRight className="ml-1.5 size-4" />
          </EnterShopCrmButton>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Plan" value={shop.planLabel} sub={shop.billingLabel} />
        <StatCard icon={Building2} label="MRR (stub)" value={fmtMoney(shop.mrrCents)} sub={`Trial ends ${fmtDate(shop.trialEndsAt)}`} />
        <StatCard icon={Building2} label="Shop status" value={shop.status} sub={`Last active ${fmtDate(shop.lastActiveAt)}`} />
        <StatCard icon={FileText} label="Open tickets" value={String(shop.openTicketCount)} sub={`${shop.membershipCount} team member${shop.membershipCount === 1 ? "" : "s"}`} />
      </div>

      {compliance ? (
        <PlatformShopCompliancePanel
          complianceSteps={compliance.complianceSteps}
          auditEvents={compliance.auditEvents}
          provisionMethod={compliance.provisionMethod}
          legalEntityName={compliance.legalEntityName}
        />
      ) : null}

      <PlatformShopReleaseFlags
        shopId={shop.id}
        releaseFlags={shop.releaseFlags}
        releaseFlagsDefaultOpen={shop.releaseFlagsDefaultOpen}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold text-brand-navy">Contact & status</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <Row label="Email" value={shop.email ?? "—"} />
            <Row label="Phone" value={shop.phone ?? "—"} />
            <Row label="Address" value={shop.address ?? "—"} />
            <Row label="Created" value={fmtDate(shop.createdAt)} />
          </dl>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold text-brand-navy">Integrations</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <Row label="Clerk org" value={shop.clerkOrgId ?? "Not linked"} />
            <Row label="SMS" value={shop.twilioPhoneNumber ?? "Not configured"} />
            <Row label="Stripe Billing" value={shop.stripeSubscriptionId ? "Subscription linked" : "Not linked"} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-muted-foreground">Stripe Connect</dt>
              <dd>
                <StripeConnectStatusPill
                  status={shop.stripeConnectStatus}
                  accountId={shop.stripeConnectAccountId}
                  compact
                />
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/platform/websites/${shop.id}`}>
                <Globe className="mr-1.5 size-3.5" />
                Customer website
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/platform/onboarding">
                <Building2 className="mr-1.5 size-3.5" />
                Onboarding
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/platform/seo-automation">
                <Radar className="mr-1.5 size-3.5" />
                SEO admin
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/platform/support">
                <ExternalLink className="mr-1.5 size-3.5" />
                Support inbox
              </Link>
            </Button>
          </div>
        </section>
      </div>

      <PlatformClerkOrgPanel shopId={shop.id} clerkOrgId={shop.clerkOrgId} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 text-brand-navy" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums text-brand-navy">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
