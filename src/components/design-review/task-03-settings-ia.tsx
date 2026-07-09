"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SETTINGS_TABS_CURRENT = [
  "Shop Profile",
  "RO Settings",
  "Appointments",
  "Markups",
  { label: "Estimates/Invoices", issue: "duplicate" },
  "Estimate Terms",
  "Lead Sources",
  "Customers",
  "Commissions",
  "Integrations",
  "Phone & SMS",
  "Email",
  "Notifications",
  "Legal",
  "QuickBooks",
  { label: "Billing", issue: "redirect" },
];

const SETTINGS_TABS_PROPOSED = [
  "Shop Profile",
  "RO Settings",
  "Appointments",
  "Markups",
  "Estimate Terms",
  "Lead Sources",
  "Customers",
  "Commissions",
  "Integrations",
  "Payment account",
  "Phone & SMS",
  "Email",
  "Notifications",
  "Legal",
  "QuickBooks",
  "Subscription",
];

function SettingsChromeMock({
  variant,
  tabs,
  contentTitle,
  contentDetail,
  showMarkupsSubnav,
}: {
  variant: "current" | "proposed";
  tabs: Array<string | { label: string; issue?: string }>;
  contentTitle: string;
  contentDetail: string;
  showMarkupsSubnav?: boolean;
}) {
  const isProposed = variant === "proposed";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border-2 shadow-sm",
        isProposed ? "border-emerald-500/50" : "border-brand-red/40",
      )}
    >
      <div
        className={cn(
          "px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider",
          isProposed ? "bg-emerald-700 text-white" : "bg-brand-red text-white",
        )}
      >
        {isProposed ? "Proposed design" : "Current UI"}
      </div>

      <div className="bg-card p-3">
        <p className="mb-2 text-xs font-bold text-brand-navy">Shop Settings</p>
        <div className="mb-2 flex gap-0.5 overflow-x-auto border-b border-border pb-2 text-[8px]">
          {tabs.map((tab) => {
            const label = typeof tab === "string" ? tab : tab.label;
            const issue = typeof tab === "object" ? tab.issue : undefined;
            const active = label === "Subscription" || label === "Billing" || label === "Markups";
            return (
              <span
                key={label}
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5",
                  active ? "bg-brand-navy text-white" : "bg-muted text-muted-foreground",
                  issue === "duplicate" && !isProposed && "border border-brand-red/50 bg-brand-red/10",
                  issue === "redirect" && !isProposed && "border border-brand-red/50 bg-brand-red/10",
                  isProposed && label === "Payment account" && "border border-emerald-500/40",
                )}
              >
                {label}
                {issue === "redirect" && !isProposed ? (
                  <span className="ml-0.5 text-[7px] text-brand-red">↗ /billing</span>
                ) : null}
                {issue === "duplicate" && !isProposed ? (
                  <span className="ml-0.5 text-[7px] text-brand-red">= Transparency</span>
                ) : null}
              </span>
            );
          })}
        </div>

        {showMarkupsSubnav ? (
          <div className="mb-2 flex gap-1 text-[8px]">
            {["Parts Matrix", "Labor Matrix", "Transparency"].map((t) => (
              <span
                key={t}
                className={cn(
                  "rounded-full px-2 py-0.5",
                  t === "Transparency" ? "bg-brand-navy text-white" : "bg-muted",
                )}
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-[10px] text-muted-foreground">
          <p className="font-semibold text-brand-navy">{contentTitle}</p>
          <p className="mt-1">{contentDetail}</p>
        </div>
      </div>
    </div>
  );
}

const CHANGES = [
  {
    ok: true,
    title: "Subscription stays in settings shell",
    detail:
      "Render BillingModule at /settings/subscription. /billing becomes a redirect alias (not the primary surface).",
  },
  {
    ok: true,
    title: "Remove duplicate Estimates/Invoices tab",
    detail:
      "Transparency lives under Markups sub-nav only (Parts / Labor / Transparency). One path to estimate display rules.",
  },
  {
    ok: true,
    title: "Payment account tab (Stripe Connect)",
    detail:
      "New /settings/payments tab renders Stripe Connect inline. Stop /settings/integrations/stripe → /payments/account hop.",
  },
  {
    ok: true,
    title: "Align Settings section subnav",
    detail:
      "CRM Settings sidebar: Billing → /settings/subscription (matches tab). Employees + Help stay as quick links.",
  },
  {
    ok: true,
    title: "Legacy aliases only",
    detail:
      "/settings/billing, /settings/subscription redirects, /settings/estimates-invoices keep working as aliases.",
  },
  {
    ok: false,
    title: "Out of scope for Task 3",
    detail:
      "Grouped tab rows (Shop / Ops / Admin), moving /employees into settings routes, or redesigning /payments module.",
  },
];

export function Task03SettingsIaReview() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-emerald-600 text-emerald-700">
          Approved & implemented
        </Badge>
          <Link
            href="/design-review/task-02-auth"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            ← Task 2 (done)
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Settings information architecture
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Task 1 fixed Online Booking + Lead Sources in the settings shell. Task 3 finishes the
          remaining chrome breaks: billing redirect, duplicate transparency tab, and Stripe Connect
          leaving settings. Approve to implement in{" "}
          <code className="text-xs">settings-tabs.tsx</code>, settings routes, and{" "}
          <code className="text-xs">crm-nav.ts</code>.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-navy">
          A — Settings tab bar
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <SettingsChromeMock
            variant="current"
            tabs={SETTINGS_TABS_CURRENT}
            contentTitle="Billing tab clicked"
            contentDetail="User leaves Shop Settings chrome — redirected to /billing (no settings tabs)."
          />
          <SettingsChromeMock
            variant="proposed"
            tabs={SETTINGS_TABS_PROPOSED}
            contentTitle="Subscription tab"
            contentDetail="Plan, invoices, and upgrade stay inside Shop Settings layout."
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-navy">
          B — Markups vs transparency (dedupe)
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <SettingsChromeMock
            variant="current"
            tabs={SETTINGS_TABS_CURRENT}
            showMarkupsSubnav
            contentTitle="Two ways to Transparency"
            contentDetail="Top tab Estimates/Invoices AND Markups → Transparency — same page, confusing labels."
          />
          <SettingsChromeMock
            variant="proposed"
            tabs={SETTINGS_TABS_PROPOSED}
            showMarkupsSubnav
            contentTitle="Single transparency path"
            contentDetail="Markups tab → sub-nav Transparency. No duplicate top-level tab."
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-navy">
          C — Stripe / payment account
        </h2>
        <div className="grid gap-4 gap-y-3 lg:grid-cols-2">
          <SettingsChromeMock
            variant="current"
            tabs={SETTINGS_TABS_CURRENT}
            contentTitle="Integrations → Stripe"
            contentDetail="Redirect to /payments/account — settings tabs disappear mid-flow (Connect onboarding)."
          />
          <SettingsChromeMock
            variant="proposed"
            tabs={SETTINGS_TABS_PROPOSED}
            contentTitle="Payment account tab"
            contentDetail="Stripe Connect panel inline at /settings/payments. /payments/account remains for deep links."
          />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold text-brand-navy">What changes if you approve</h2>
        <ul className="mt-4 space-y-3">
          {CHANGES.map((c) => (
            <li key={c.title} className="flex gap-3 text-sm">
              {c.ok ? (
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : (
                <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">{c.title}</p>
                <p className="text-muted-foreground">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-muted-foreground">
          Task 3 is live.{" "}
          <Link
            href="/design-review/task-04-ro-workspace"
            className="font-semibold text-brand-navy underline-offset-2 hover:underline"
          >
            Continue → Task 4 RO workspace
          </Link>
        </p>
      </section>
    </div>
  );
}
