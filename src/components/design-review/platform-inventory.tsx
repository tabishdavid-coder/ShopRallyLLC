import Link from "next/link";
import { ArrowRight, Building2, ExternalLink, Link2, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SHOPRALLY_CRM_DEV_ORIGIN } from "@/lib/design-mode-tokens";
import { PLATFORM_NAV_GROUPS } from "@/lib/nav";

/** Demo shop from seed — used for detail / enter-shop deep links. */
const DEMO_SHOP_ID = "shop_demo";

type PlatformInventoryGroup =
  | "Operations"
  | "Revenue"
  | "Compliance"
  | "System"
  | "Flows";

type PlatformInventoryEntry = {
  order: number;
  name: string;
  description: string;
  /** Path under Master CRM (or public onboard). Full URL built at render. */
  path: string;
  group: PlatformInventoryGroup;
  external?: boolean;
  note?: string;
};

const GROUP_ORDER: PlatformInventoryGroup[] = [
  "Operations",
  "Revenue",
  "Compliance",
  "System",
  "Flows",
];

/** Nav-backed entries + detail/flow surfaces not in the sidebar. */
const PLATFORM_INVENTORY: PlatformInventoryEntry[] = [
  // Operations (nav)
  {
    order: 1,
    group: "Operations",
    name: "Overview",
    description: "Growth KPIs, shop health snapshot, and operator shortcuts.",
    path: "/platform",
  },
  {
    order: 2,
    group: "Operations",
    name: "Shops",
    description: "Cross-tenant shop list — plan, Stripe Connect, enter CRM, invite intake.",
    path: "/platform/shops",
  },
  {
    order: 3,
    group: "Operations",
    name: "Onboarding",
    description: "Per-shop checklist — legal, billing, website build, go-live pipeline.",
    path: "/platform/onboarding",
  },
  {
    order: 4,
    group: "Operations",
    name: "Customer websites",
    description: "ShopSite build pipeline — intake, in-build, launch, and upkeep stages.",
    path: "/platform/websites",
  },
  {
    order: 5,
    group: "Operations",
    name: "Support",
    description: "Platform support inbox — tickets escalated from shops and leads.",
    path: "/platform/support",
  },
  // Revenue (nav)
  {
    order: 6,
    group: "Revenue",
    name: "Billing & Plans",
    description: "Subscription tiers, trial status, and cross-shop billing overview.",
    path: "/platform/billing",
  },
  {
    order: 7,
    group: "Revenue",
    name: "Sales Leads",
    description: "Inbound marketing leads and drip-campaign stub for operator follow-up.",
    path: "/platform/leads",
  },
  // Compliance (nav)
  {
    order: 8,
    group: "Compliance",
    name: "Legal & Compliance",
    description: "Platform-wide MSA status, operator access feed, and shop compliance rollup.",
    path: "/platform/legal",
  },
  {
    order: 9,
    group: "Compliance",
    name: "SEO Autopilot",
    description: "Cross-shop SEO automation — crawl status, GSC hooks, and review queue.",
    path: "/platform/seo-automation",
  },
  // System (nav)
  {
    order: 10,
    group: "System",
    name: "Release review",
    description: "Master CRM release batches — current vs planned operator UI changes.",
    path: "/platform/review",
  },
  {
    order: 11,
    group: "System",
    name: "System",
    description: "Platform settings stub, retention runs, and compliance audit tooling.",
    path: "/platform/system",
  },
  // Flows & detail (not in sidebar)
  {
    order: 12,
    group: "Flows",
    name: "Shop detail",
    description: "Single-tenant summary — plan, onboarding checklist, CRM access log.",
    path: `/platform/shops/${DEMO_SHOP_ID}`,
    note: `Uses seed shop ${DEMO_SHOP_ID} (In & Out AutoHaus Garage).`,
  },
  {
    order: 13,
    group: "Flows",
    name: "Add shop",
    description: "Operator-provisioned shop intake — MSA consent, plan assignment, invite link.",
    path: "/platform/shops/new",
  },
  {
    order: 14,
    group: "Flows",
    name: "Enter shop CRM",
    description: "Deep link — sets active tenant cookie then opens Shop CRM dashboard.",
    path: `/platform/enter?shop=${DEMO_SHOP_ID}`,
    note: "Requires PLATFORM_ADMIN_EMAIL session; redirects to /dashboard.",
  },
  {
    order: 15,
    group: "Flows",
    name: "Website detail",
    description: "Per-shop ShopSite ops — build status, operator notes, launch controls.",
    path: `/platform/websites/${DEMO_SHOP_ID}`,
    note: `Uses seed shop ${DEMO_SHOP_ID}.`,
  },
  {
    order: 16,
    group: "Flows",
    name: "Shop legal (detail)",
    description: "Per-shop MSA, custom terms, and compliance artifacts.",
    path: `/platform/shops/${DEMO_SHOP_ID}/legal`,
  },
  {
    order: 17,
    group: "Flows",
    name: "Release review — Batch 4",
    description: "Approved Master CRM platform tools tour (Stripe, billing, add-shop, websites).",
    path: "/platform/review/batch-04",
  },
  {
    order: 18,
    group: "Flows",
    name: "Public shop intake",
    description: "Tokenized onboarding form shops complete before provisioning.",
    path: "/onboard/shop/demo-token",
    external: true,
    note: "Generate a live token from Shops → Send intake link; demo path 404s without token.",
  },
];

function fullUrl(path: string): string {
  return `${SHOPRALLY_CRM_DEV_ORIGIN}${path}`;
}

function entriesForGroup(group: PlatformInventoryGroup): PlatformInventoryEntry[] {
  return PLATFORM_INVENTORY.filter((e) => e.group === group).sort((a, b) => a.order - b.order);
}

const SORTED_INVENTORY = [...PLATFORM_INVENTORY].sort((a, b) => a.order - b.order);

function PlatformTourAnchor({
  entry,
  className,
  showUrl = false,
}: {
  entry: PlatformInventoryEntry;
  className?: string;
  showUrl?: boolean;
}) {
  const href = fullUrl(entry.path);

  return (
    <a
      href={href}
      target={entry.external ? "_blank" : undefined}
      rel={entry.external ? "noopener noreferrer" : undefined}
      className={cn(
        buttonVariants({ variant: "default", size: "sm" }),
        "shrink-0 bg-brand-navy text-white hover:bg-brand-navy/90",
        className,
      )}
    >
      Open
      <ArrowRight className="size-4" aria-hidden />
      {entry.external ? <ExternalLink className="size-3.5 opacity-80" aria-hidden /> : null}
      {showUrl ? (
        <span className="sr-only">{href}</span>
      ) : null}
    </a>
  );
}

export function PlatformInventoryTour() {
  const navGroupLabels = PLATFORM_NAV_GROUPS.map((g) => g.label);

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <header className="space-y-3">
        <Badge variant="outline" className="border-brand-navy text-brand-navy">
          Platform inventory
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Master CRM surfaces
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Every <strong className="font-medium text-foreground">Platform / Master CRM</strong> route
          on Dev 3031, grouped like the operator sidebar. Sign in as the platform admin (
          <code className="rounded bg-muted px-1 py-0.5 text-xs">PLATFORM_ADMIN_EMAIL</code>) before
          opening <code className="text-xs">/platform/**</code> links.
        </p>
        <p className="text-sm font-medium text-brand-navy">
          <Link2 className="mr-1.5 inline size-4 align-text-bottom" aria-hidden />
          Use the navy <strong>Open →</strong> buttons — each link goes to{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">http://localhost:3031/platform/…</code>.
        </p>
      </header>

      <section
        id="quick-links"
        className="scroll-mt-4 rounded-xl border-2 border-brand-navy/35 bg-brand-light/15 p-4 shadow-sm"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-brand-navy">
          Quick open — all routes
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan and click any link. Full URLs shown for copy/paste.
        </p>
        <ul className="mt-4 divide-y rounded-lg border bg-card">
          {SORTED_INVENTORY.map((entry) => {
            const href = fullUrl(entry.path);
            return (
              <li
                key={`quick-${entry.path}`}
                className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{entry.order}.</span>
                    {entry.name}
                    <Badge variant="outline" className="ml-2 text-[10px] text-muted-foreground">
                      {entry.group}
                    </Badge>
                  </p>
                  <a
                    href={href}
                    target={entry.external ? "_blank" : undefined}
                    rel={entry.external ? "noopener noreferrer" : undefined}
                    className="mt-0.5 block truncate font-mono text-xs text-brand-navy underline-offset-2 hover:underline"
                  >
                    {href}
                  </a>
                </div>
                <PlatformTourAnchor entry={entry} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-brand-navy/20 bg-brand-light/10 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-brand-navy">
          <Shield className="size-4 shrink-0" aria-hidden />
          Suggested viewing order
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow the numbered cards below — Operations first (shops & onboarding), then Revenue,
          Compliance, System, and detail flows.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Sidebar groups: {navGroupLabels.join(" · ")} · plus Flows for deep links.
        </p>
      </section>

      {GROUP_ORDER.map((group) => {
        const entries = entriesForGroup(group);
        if (entries.length === 0) return null;

        return (
          <section key={group} className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-brand-navy" aria-hidden />
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand-navy">{group}</h2>
              {group !== "Flows" && navGroupLabels.includes(group) ? (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Sidebar
                </Badge>
              ) : group === "Flows" ? (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Detail & deep links
                </Badge>
              ) : null}
            </div>

            <ol className="space-y-3">
              {entries.map((entry) => {
                const href = fullUrl(entry.path);
                return (
                  <li
                    key={entry.path}
                    className="rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-lg font-bold text-white"
                        aria-hidden
                      >
                        {entry.order}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h3 className="text-base font-semibold text-brand-navy">{entry.name}</h3>
                          <PlatformTourAnchor entry={entry} />
                        </div>
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                        {entry.note ? (
                          <p className="text-xs text-muted-foreground">{entry.note}</p>
                        ) : null}

                        <a
                          href={href}
                          target={entry.external ? "_blank" : undefined}
                          rel={entry.external ? "noopener noreferrer" : undefined}
                          className="inline-flex items-center gap-1 font-mono text-xs text-brand-navy underline-offset-2 hover:underline"
                        >
                          {href}
                          {entry.external ? (
                            <ExternalLink className="size-3 text-muted-foreground" aria-hidden />
                          ) : null}
                        </a>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      <footer className="space-y-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Related surfaces</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <Link href="/design-review/crm-inventory" className="font-medium text-brand-navy hover:underline">
              CRM inventory tour
            </Link>
            {" — "}
            all shells and ports (Shop CRM, 3030, Intake Lab).
          </li>
          <li>
            <Link href="/design-review/batch-04-platform" className="font-medium text-brand-navy hover:underline">
              Batch 4 design review archive
            </Link>
            {" — "}
            before/after composites for platform tools.
          </li>
          <li>
            <code className="text-xs">/platform/customers</code> redirects to{" "}
            <code className="text-xs">/platform/shops</code> (legacy route).
          </li>
        </ul>
        <p>
          <Link href="/design-review" className="font-medium text-brand-navy hover:underline">
            ← Back to design review hub
          </Link>
        </p>
      </footer>
    </div>
  );
}
