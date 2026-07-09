"use client";

import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const HEADER_TABS = [
  "Dashboard",
  "Customers",
  "Schedule",
  "Reports",
  "Catalog",
  "Growth Engine",
  "Settings",
];

const CURRENT_SIDEBAR = [
  "Overview",
  "Job Board",
  "Tech Board",
  "Tires",
  "Quick Labor",
  "Messages",
  { label: "Create Maintenance Plan", issue: "cross-section" },
  "Payments",
];

const PROPOSED_SIDEBAR = [
  "Overview",
  "Job Board",
  "Workflow",
  "Tech Board",
  "Tires",
  "Quick Labor",
  "Messages",
  "Reports",
  "Payments",
];

const GROWTH_SUBNAV_PROPOSED = [
  "Overview",
  "Outreach",
  "Automations",
  "Book Online",
  "Maintenance Programs",
  "Reviews",
  "ShopSite",
  "SEO Autopilot",
  "Lead Sources",
];

const SETTINGS_TABS_CURRENT = [
  "Shop Profile",
  "RO Settings",
  "Appointments",
  { label: "Online Booking", issue: "external" },
  "Markups",
  "Estimates/Invoices",
  "Estimate Terms",
  { label: "Lead Sources", issue: "external" },
  "Customers",
  "Commissions",
  "Integrations",
  "Phone & SMS",
  "Email",
  "Notifications",
  "Legal",
  "QuickBooks",
  { label: "Billing", issue: "external" },
];

const SETTINGS_TABS_PROPOSED = [
  "Shop Profile",
  "RO Settings",
  "Appointments",
  "Markups",
  "Estimates/Invoices",
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
  "Subscription",
];

function ChromeMock({
  variant,
  activeHeader = "Dashboard",
  sidebarItems,
  activeSidebar = "Overview",
  subnavItems,
  activeSubnav,
  settingsRow,
}: {
  variant: "current" | "proposed";
  activeHeader?: string;
  sidebarItems: Array<string | { label: string; issue?: string }>;
  activeSidebar?: string;
  subnavItems?: string[];
  activeSubnav?: string;
  settingsRow?: Array<string | { label: string; issue?: string }>;
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

      <div className="bg-brand-navy text-white">
        <div className="flex flex-wrap items-center gap-1 px-2 py-2 text-[10px]">
          <span className="mr-1 font-bold">ShopRally</span>
          {HEADER_TABS.map((tab) => (
            <span
              key={tab}
              className={cn(
                "rounded px-1.5 py-0.5",
                tab === activeHeader ? "bg-white/20 font-semibold" : "text-white/70",
              )}
            >
              {tab}
            </span>
          ))}
          <span className="ml-auto rounded bg-brand-light px-1.5 py-0.5 font-semibold text-brand-navy">
            + New RO
          </span>
        </div>
        <div className="border-t border-white/15 px-2 py-1.5 text-[10px] text-white/80">
          <span className="font-semibold text-white">{activeHeader === "Settings" ? "Shop Settings" : "Overview"}</span>
          <span className="mx-2 text-white/40">|</span>
          <span className="text-white/60">Search customers, vehicles, ROs…</span>
          {isProposed ? (
            <span className="ml-2 rounded bg-brand-light/20 px-1 text-[9px] text-brand-light">
              + RO# · plate · VIN
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-[220px] bg-[oklch(0.985_0.008_247)]">
        <div className="w-[130px] shrink-0 border-r border-brand-navy/20 bg-brand-navy/95 p-2 text-[9px] text-white">
          <p className="mb-1.5 font-bold uppercase tracking-wide text-brand-light">Dashboard</p>
          {sidebarItems.map((item) => {
            const label = typeof item === "string" ? item : item.label;
            const issue = typeof item === "object" ? item.issue : undefined;
            const active = label === activeSidebar;
            return (
              <div
                key={label}
                className={cn(
                  "mb-0.5 truncate rounded px-1.5 py-1",
                  active ? "bg-white/15 font-semibold" : "text-white/75",
                  issue === "cross-section" && !isProposed && "ring-1 ring-brand-red/60",
                  issue === "removed" && isProposed && "line-through opacity-40",
                )}
              >
                {label}
                {issue === "cross-section" && !isProposed ? (
                  <span className="ml-0.5 text-[8px] text-brand-red">↗ Growth</span>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 p-2">
          {subnavItems ? (
            <div className="mb-2 flex flex-wrap gap-1 border-b border-border pb-2 text-[9px]">
              {subnavItems.map((item) => (
                <span
                  key={item}
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    item === activeSubnav
                      ? "bg-brand-navy font-semibold text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          {settingsRow ? (
            <div className="mb-2 flex gap-0.5 overflow-x-auto border-b border-border pb-2 text-[8px]">
              {settingsRow.map((tab) => {
                const label = typeof tab === "string" ? tab : tab.label;
                const issue = typeof tab === "object" ? tab.issue : undefined;
                return (
                  <span
                    key={label}
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5",
                      label === "Shop Profile" ? "bg-brand-navy text-white" : "bg-muted",
                      issue === "external" && !isProposed && "border border-brand-red/50 bg-brand-red/10",
                      isProposed && issue !== "external" && "border border-emerald-500/30",
                    )}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          ) : null}

          <div className="rounded-lg border border-dashed border-border bg-white/80 p-3 text-[10px] text-muted-foreground">
            {activeHeader === "Growth Engine" && isProposed ? (
              <>
                <p className="font-semibold text-brand-navy">Maintenance Programs hub</p>
                <p className="mt-1">Create plan · Subscribers · Redeem — all under Growth, not Dashboard sidebar.</p>
              </>
            ) : activeHeader === "Settings" ? (
              <>
                <p className="font-semibold text-brand-navy">Settings content</p>
                <p className="mt-1">
                  {isProposed
                    ? "Every tab stays inside Shop Settings chrome — no jump to /marketing/*."
                    : "Online Booking & Lead Sources leave settings layout when clicked."}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-brand-navy">Dashboard / shop floor</p>
                <p className="mt-1">KPI cards, pipeline, charts — unchanged in this task.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const CHANGES = [
  {
    ok: true,
    title: "Dashboard sidebar = shop floor only",
    detail: "Remove Create Maintenance Plan from Dashboard nav. Add Workflow + Reports here.",
  },
  {
    ok: true,
    title: "Maintenance plans live under Growth Engine",
    detail: "Subnav: Maintenance Programs → plans, subscribers, create.",
  },
  {
    ok: true,
    title: "Online Booking under Shop Growth",
    detail: "Online Booking → /marketing/online-booking (Shop Growth subnav). Lead Sources → /settings/marketing inline form.",
  },
  {
    ok: true,
    title: "Global search scope",
    detail: "Header search matches customers, RO#, plate, VIN — not customers-only.",
  },
  {
    ok: false,
    title: "Hide until built",
    detail: "Catalog → Orders stays stubbed; remove link or keep Soon badge only in Catalog subnav.",
  },
];

export function Task01NavIaReview() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <header className="space-y-2">
        <Badge variant="outline" className="border-emerald-600 text-emerald-700">
          Approved & implemented
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Navigation & information architecture</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Review the current chrome vs the proposed layout. Approve to implement in{" "}
          <code className="text-xs">crm-nav.ts</code>,{" "}
          <code className="text-xs">settings-tabs.tsx</code>, and global search — no other modules yet.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-navy">
          A — Dashboard section (primary change)
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChromeMock
            variant="current"
            sidebarItems={CURRENT_SIDEBAR}
            activeSidebar="Overview"
          />
          <ChromeMock
            variant="proposed"
            sidebarItems={PROPOSED_SIDEBAR}
            activeSidebar="Overview"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-navy">
          B — Growth Engine (where maintenance plans belong)
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChromeMock
            variant="current"
            activeHeader="Growth Engine"
            sidebarItems={CURRENT_SIDEBAR}
            activeSidebar="Create Maintenance Plan"
            subnavItems={["Overview", "Outreach", "Automations", "Book Online", "Maintenance Programs", "Reviews"]}
            activeSubnav="Overview"
          />
          <ChromeMock
            variant="proposed"
            activeHeader="Growth Engine"
            sidebarItems={PROPOSED_SIDEBAR}
            subnavItems={GROWTH_SUBNAV_PROPOSED}
            activeSubnav="Maintenance Programs"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-navy">
          C — Settings tab bar (chrome consistency)
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChromeMock
            variant="current"
            activeHeader="Settings"
            sidebarItems={[]}
            settingsRow={SETTINGS_TABS_CURRENT}
          />
          <ChromeMock
            variant="proposed"
            activeHeader="Settings"
            sidebarItems={[]}
            settingsRow={SETTINGS_TABS_PROPOSED}
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
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          Task 1 is live on <code className="text-xs">feature/master-crm</code>.
          <ArrowRight className="size-4" />
          continue with{" "}
          <Link href="/design-review/task-02-auth" className="font-semibold text-brand-navy underline-offset-2 hover:underline">
            Task 2 — Auth & permissions
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
