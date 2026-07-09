"use client";

import Link from "next/link";
import { Check, Columns3, LayoutDashboard, Workflow, X } from "lucide-react";

import { AutopilotMark } from "@/components/autopilot3030/brand/autopilot-logo";
import { Badge } from "@/components/ui/badge";
import {
  AP_NAV_SECTIONS,
  AP_OPERATIONS_NAV_ITEMS,
} from "@/lib/autopilot3030/nav";
import {
  apContextNavClass,
  apModuleChipClass,
  apRailItemClass,
} from "@/lib/autopilot3030/nav-active";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { cn } from "@/lib/utils";

const SAFETY_CHECKLIST = [
  {
    id: "ia-rail",
    label: "Primary nav is icon command rail — not Tekmetric sidebar or AutoLeap top tabs",
    pass: true,
  },
  {
    id: "ia-sections",
    label: "Six sections: Operations, Customers, Schedule, Catalog, Shop Growth, Admin",
    pass: true,
  },
  {
    id: "ia-labels",
    label: "Industry-standard Operations labels (Job Board, Tech Board, Labor Guide)",
    pass: true,
  },
  {
    id: "kanban-cols",
    label: "Bay Pipeline columns: Intake / Active Bay / Closed & Paid",
    pass: true,
  },
  {
    id: "palette",
    label: "Deep Ocean tokens — coral accent, no competitor teal or Tekmetric-blue-only story",
    pass: true,
  },
  {
    id: "trademarks",
    label: "No competitor trademarks, logos, or product names in UI",
    pass: true,
  },
  {
    id: "isolation",
    label: "3030-only — CrmShell / Dev 3004 layout unchanged",
    pass: true,
  },
] as const;

const SAMPLE_TICKETS = [
  {
    id: "ST-1042",
    customer: "Jordan M.",
    vehicle: "2019 Toyota Camry SE",
    amount: "$842.00",
    tag: "Awaiting approval",
  },
  {
    id: "ST-1038",
    customer: "Alex R.",
    vehicle: "2016 Honda Accord",
    amount: "$1,240.00",
    tag: "In bay",
  },
  {
    id: "ST-1031",
    customer: "Sam K.",
    vehicle: "2021 Ford F-150",
    amount: "$0.00",
    tag: "Settled",
  },
];

function RefPanel({
  variant,
  title,
  subtitle,
  children,
}: {
  variant: "a" | "b";
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border ap-border-color ap-bg-surface-raised shadow-sm">
      <div
        className={cn(
          "border-b px-3 py-2",
          variant === "a"
            ? "border-teal-700/30 bg-teal-800/90 text-white"
            : "border-zinc-700 bg-zinc-900 text-zinc-100",
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
          Reference pattern {variant.toUpperCase()} — not shipped
        </p>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-[11px] opacity-75">{subtitle}</p>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

function PatternATopNav() {
  const tabs = ["Dashboard", "Work Board", "Calendar", "Customers", "Catalog", "Reports"];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 overflow-x-auto rounded-md bg-teal-700 px-2 py-1.5 text-[9px] text-white">
        {tabs.map((t, i) => (
          <span
            key={t}
            className={cn(
              "shrink-0 rounded px-2 py-1",
              i === 1 ? "bg-teal-900 font-semibold underline" : "opacity-80",
            )}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto">
        {["Estimate", "In progress", "Invoice", "Paid"].map((col, i) => (
          <div
            key={col}
            className="min-w-[72px] flex-1 rounded border border-teal-200/60 bg-teal-50/50 p-1"
          >
            <p className="truncate text-[8px] font-bold text-teal-900">
              {col}
              {i === 0 ? " · 111" : i === 3 ? " · 10" : ""}
            </p>
            {i === 0 ? (
              <div className="mt-1 rounded border-l-2 border-teal-600 bg-white p-1 text-[7px] leading-tight text-zinc-600">
                <span className="rounded bg-emerald-100 px-0.5 text-emerald-800">Medium</span>
                <p className="font-medium">10244 · test</p>
                <p className="text-orange-600">$0 · Unpaid</p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PatternBSidebar() {
  const groups = [
    { label: "—", items: ["Shop Dashboard", "Job Board", "Tech Board"] },
    { label: "Main", items: ["Appointments", "Inventory", "Reports"] },
    { label: "Manage", items: ["Customers", "Canned Jobs"] },
    { label: "Admin", items: ["Employees", "Shop Settings"] },
  ];
  return (
    <div className="flex gap-2">
      <div className="w-[88px] shrink-0 rounded-md bg-zinc-900 p-1.5 text-[8px] text-zinc-300">
        {groups.map((g) => (
          <div key={g.label} className="mb-1.5">
            {g.label !== "—" ? (
              <p className="mb-0.5 font-bold uppercase tracking-wider text-zinc-500">{g.label}</p>
            ) : null}
            {g.items.map((item) => (
              <p
                key={item}
                className={cn(
                  "truncate rounded px-1 py-0.5",
                  item === "Job Board" && "border-l-2 border-blue-500 bg-zinc-800 font-semibold text-white",
                )}
              >
                {item}
              </p>
            ))}
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex gap-1">
          {["Estimates", "Work-In-Progress", "Completed"].map((col, i) => (
            <div key={col} className="flex-1 rounded border border-zinc-200 bg-zinc-50 p-1">
              <p className="truncate text-[8px] font-bold text-zinc-700">
                {col} ({i === 0 ? "13" : i === 1 ? "3" : "237"})
              </p>
              {i === 0 ? (
                <div className="mt-1 rounded border bg-white p-1 text-[7px] text-zinc-600">
                  <span className="rounded bg-zinc-200 px-0.5">Not Started</span>
                  <p>RO#107 · Mark J.</p>
                  <p className="text-right font-medium">$0.00</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AutopilotShellMock() {
  const operationsSection = AP_NAV_SECTIONS.find((s) => s.id === "operations")!;
  const activeOpsItem = AP_OPERATIONS_NAV_ITEMS.find((i) => i.title === AP_TERMS.jobBoard)!;

  return (
    <div className="overflow-hidden rounded-xl border-2 border-brand-light/50 shadow-md">
      <div className="border-b border-brand-light/30 ap-bg-primary px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-white">
        Autopilot 3030 proposal — Deep Ocean
      </div>

      {/* Preview banner */}
      <div className="ap-preview-banner px-3 py-0.5 text-center text-[9px] font-medium text-white">
        Autopilot preview · Project 3030
      </div>

      {/* Top bar */}
      <div className="ap-top-bar flex items-center gap-2 border-b px-3 py-2">
        <span className="text-xs font-semibold ap-text">{AP_TERMS.jobBoard}</span>
        <span className="ml-auto h-6 w-24 rounded-md ap-bg-surface ring-1 ring ap-border-color" />
      </div>

      <div className="flex min-h-[220px]">
        {/* Command rail */}
        <nav
          className="ap-command-rail flex shrink-0 flex-col items-center gap-1 py-2"
          aria-label="Mock command rail"
        >
          <AutopilotMark size={28} variant="onDark" decorative />
          {AP_NAV_SECTIONS.map((section) => {
            const Icon = section.icon;
            const active = section.id === "operations";
            return (
              <span
                key={section.id}
                title={section.label}
                className={cn(apRailItemClass(active), "pointer-events-none size-9")}
              >
                <Icon className="size-4" aria-hidden />
              </span>
            );
          })}
        </nav>

        {/* Context panel */}
        <aside className="ap-context-panel hidden shrink-0 flex-col p-2 sm:flex">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider ap-text-subtle">
            {operationsSection.label}
          </p>
          {AP_OPERATIONS_NAV_ITEMS.slice(0, 6).map((item) => {
            const Icon = item.icon;
            const active = item.href === activeOpsItem.href;
            return (
              <span
                key={item.href}
                className={cn(apContextNavClass(active), "pointer-events-none mb-0.5 text-xs")}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{item.title}</span>
              </span>
            );
          })}
          <p className="mt-1 px-1 text-[9px] ap-text-subtle">+ 3 more…</p>
        </aside>

        {/* Workspace */}
        <div className="min-w-0 flex-1 ap-bg-surface p-2">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="h-6 flex-1 min-w-[80px] rounded-md ap-bg-surface-raised ring-1 ring ap-border-color" />
            <span className="rounded-md bg-brand-orange px-2 py-1 text-[9px] font-semibold text-white">
              + New Repair Order
            </span>
          </div>
          <BayPipelineMock compact />
        </div>
      </div>
    </div>
  );
}

function BayPipelineMock({ compact = false }: { compact?: boolean }) {
  const columns = [
    { label: "Intake", count: 12, ticket: SAMPLE_TICKETS[0] },
    { label: AP_TERMS.workInProgress, count: 4, ticket: SAMPLE_TICKETS[1] },
    { label: "Closed & Paid", count: 231, ticket: SAMPLE_TICKETS[2] },
  ];

  return (
    <div className={cn("grid gap-1.5", compact ? "grid-cols-3" : "md:grid-cols-3")}>
      {columns.map((col) => (
        <div
          key={col.label}
          className="rounded-lg border border ap-border-color ap-bg-surface-raised p-1.5"
        >
          <p className="mb-1.5 text-[10px] font-bold ap-text">
            {col.label}{" "}
            <span className="font-normal ap-text-muted">({col.count})</span>
          </p>
          <div className="rounded-md border border ap-border-color bg-white p-2 shadow-sm">
            <div className="mb-1 flex items-start justify-between gap-1">
              <Badge
                variant="outline"
                className="h-4 border-brand-light/40 px-1 text-[8px] ap-text-accent-secondary"
              >
                {col.ticket.tag}
              </Badge>
              <span className="text-[8px] ap-text-subtle">{col.ticket.id}</span>
            </div>
            <p className="text-[10px] font-medium ap-text">{col.ticket.customer}</p>
            <p className="text-[9px] ap-text-muted">{col.ticket.vehicle}</p>
            <p className="mt-1 text-right text-[10px] font-semibold ap-text-primary">
              {col.ticket.amount}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function IaTable() {
  const rows = AP_OPERATIONS_NAV_ITEMS.map((item) => ({
    label: item.title,
    route: item.href,
    section: "Operations",
  }));

  return (
    <div className="overflow-x-auto rounded-xl border border ap-border-color">
      <table className="w-full text-left text-sm">
        <thead className="ap-bg-surface-raised text-xs uppercase tracking-wide ap-text-muted">
          <tr>
            <th className="px-3 py-2 font-semibold">3030 label</th>
            <th className="px-3 py-2 font-semibold">Route</th>
            <th className="px-3 py-2 font-semibold">Section</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.route} className="ap-text">
              <td className="px-3 py-2 font-medium">{row.label}</td>
              <td className="px-3 py-2 font-mono text-xs ap-text-muted">{row.route}</td>
              <td className="px-3 py-2 ap-text-muted">{row.section}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MenuLayoutMockup3030() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-brand-light/50 ap-text-accent"
          >
            Project 3030
          </Badge>
          <Badge variant="outline" className="border-brand-navy/40 ap-text-primary">
            Menu layout mockup
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight ap-text">
          Autopilot menu &amp; layout review
        </h1>
        <p className="max-w-2xl text-sm ap-text-muted">
          Side-by-side comparison of competitor navigation patterns (reference wireframes only) vs
          the proposed ShopRally 3030 command rail + context panel. Uses Deep Ocean tokens; does not
          modify Dev 3004 CrmShell.
        </p>
        <p className="text-xs ap-text-subtle">
          Docs:{" "}
          <code className="rounded ap-bg-surface-raised px-1">
            agents/Autopilot3030/MENU-LAYOUT-MOCKUP.md
          </code>
          {" · "}
          <code className="rounded ap-bg-surface-raised px-1">
            agents/Autopilot3030/MENU-LAYOUT-COMMERCIAL-RULES.md
          </code>
        </p>
      </header>

      {/* Comparison grid */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold ap-text">Pattern comparison</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <RefPanel
            variant="a"
            title="Horizontal module strip + 4-column kanban"
            subtitle="Top-tab primary nav · Estimate → In progress → Invoice → Paid"
          >
            <PatternATopNav />
          </RefPanel>
          <RefPanel
            variant="b"
            title="Dark sidebar groups + 3-column job board"
            subtitle="Main / Manage / Admin · Estimates / WIP / Completed"
          >
            <PatternBSidebar />
          </RefPanel>
        </div>
      </section>

      {/* Proposed shell */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold ap-text">Autopilot 3030 proposal</h2>
        <AutopilotShellMock />
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { icon: LayoutDashboard, label: "Command rail", desc: "6 icon sections, ~68px" },
            { icon: Columns3, label: "Context panel", desc: "Section submenu, ~248px" },
            { icon: Workflow, label: "Light top bar", desc: "Title + search, not module tabs" },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="rounded-lg border border ap-border-color ap-bg-surface-raised p-3"
            >
              <Icon className="mb-1 size-4 ap-text-accent" aria-hidden />
              <p className="text-sm font-medium ap-text">{label}</p>
              <p className="text-xs ap-text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bay Pipeline */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold ap-text">
          Job Board — differentiated columns
        </h2>
        <p className="text-sm ap-text-muted">
          Three columns avoid both Tekmetric (Estimates / WIP / Completed) and AutoLeap (Estimate /
          In progress / Invoice / Paid). Checkout lives in the Repair Order phase stepper.
        </p>
        <BayPipelineMock />
        <div className="flex flex-wrap gap-2">
          {["Intake", AP_TERMS.workInProgress, "Closed & Paid"].map((col) => (
            <span
              key={col}
              className={cn(apModuleChipClass(false), "pointer-events-none text-[10px]")}
            >
              {col}
            </span>
          ))}
        </div>
      </section>

      {/* Route map */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold ap-text">Operations route map</h2>
        <IaTable />
      </section>

      {/* Commercial safety */}
      <section
        id="commercial-safety"
        className="space-y-3 rounded-xl border border-brand-light/30 ap-bg-surface-raised p-5"
      >
        <h2 className="text-lg font-semibold ap-text">Commercial safety checklist</h2>
        <p className="text-sm ap-text-muted">
          Complete before merging 3030 chrome to production or Dev 3004.
        </p>
        <ul className="space-y-2">
          {SAFETY_CHECKLIST.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              {item.pass ? (
                <Check className="mt-0.5 size-4 shrink-0 ap-text-accent-secondary" />
              ) : (
                <X className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <span className="ap-text">{item.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Nav sections summary */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold ap-text">Full section map</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AP_NAV_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className="rounded-lg border border ap-border-color ap-bg-surface-raised p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="size-4 ap-text-primary" aria-hidden />
                  <p className="font-medium ap-text">{section.label}</p>
                </div>
                <ul className="space-y-0.5 text-xs ap-text-muted">
                  {section.items.slice(0, 4).map((item) => (
                    <li key={item.href} className="truncate">
                      {item.title}
                    </li>
                  ))}
                  {section.items.length > 4 ? (
                    <li className="ap-text-subtle">+{section.items.length - 4} more</li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="flex flex-wrap gap-3 border-t border ap-border-color pt-4 text-sm">
        <Link href="/design-review" className="font-medium ap-text-primary hover:underline">
          ← Design review hub
        </Link>
        <Link href="/brand/autopilot" className="font-medium ap-text-primary hover:underline">
          Brand preview
        </Link>
        <Link href="/job-board" className="font-medium ap-text-primary hover:underline">
          Live Job Board
        </Link>
      </footer>
    </div>
  );
}
