import Link from "next/link";
import { ArrowRight, ExternalLink, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { designModeHref } from "@/lib/design-mode-merged-crm";
import { SHOPRALLY_CRM_DEV_ORIGIN } from "@/lib/design-mode-tokens";

type CrmVersionStatus = "Active" | "Preview" | "Prototype" | "Deprecated" | "Archive";

type CrmInventoryEntry = {
  order: number;
  name: string;
  purpose: string;
  href: string;
  /** npm script or command to start the server */
  startCommand: string;
  /** Port the surface runs on (for grouping); null = no dev server */
  port: number | null;
  shell: string;
  status: CrmVersionStatus;
  optional?: boolean;
  deprecated?: boolean;
  note?: string;
};

const CRM_INVENTORY: CrmInventoryEntry[] = [
  {
    order: 1,
    name: "ShopRally Shop CRM — Dev 3031",
    purpose:
      "Primary merged ShopRally shop shell — AutopilotShell, Tekmetric IA nav, job board, customers, repair orders, jobs layout toggle.",
    href: `${SHOPRALLY_CRM_DEV_ORIGIN}/dashboard`,
    startCommand: "npm run dev",
    port: 3031,
    shell: "AutopilotShell (Operations + top section nav)",
    status: "Active",
  },
  {
    order: 2,
    name: "Design mode overlay — Dev 3004 (legacy)",
    purpose:
      "Legacy dev port with design dock enabled — same CRM features as :3031 but with Ctrl+Shift+D design panel.",
    href: "http://localhost:3004/dashboard?design=open",
    startCommand: "npm run dev:3004",
    port: 3004,
    shell: "AutopilotShell + design dock",
    status: "Deprecated",
    optional: true,
    note: "Use npm run dev:3004 · design mode off on canonical :3031.",
  },
  {
    order: 3,
    name: "Platform / Master CRM — Dev 3031",
    purpose:
      "Platform operator console — shop list, billing, onboarding, enter any shop CRM as admin.",
    href: `${SHOPRALLY_CRM_DEV_ORIGIN}/platform`,
    startCommand: "npm run dev",
    port: 3031,
    shell: "PlatformSidebar (PLATFORM_NAV_GROUPS)",
    status: "Active",
  },
  {
    order: 4,
    name: "Autopilot Preview — 3030",
    purpose:
      "Separate Next.js build for Project 3030 — alternate shell, context panel, and dashboard UX experiments.",
    href: "http://localhost:3030/dashboard",
    startCommand: "npm run dev:3030",
    port: 3030,
    shell: "Autopilot3030 shell (isolated build)",
    status: "Preview",
  },
  {
    order: 5,
    name: "Design review hub — Dev 3031",
    purpose:
      "Archive of approved batches 1–6 — trade dress, RBAC, RO workspace, platform, intake, Clerk merge.",
    href: `${SHOPRALLY_CRM_DEV_ORIGIN}/design-review`,
    startCommand: "npm run dev",
    port: 3031,
    shell: "Within Shop CRM shell",
    status: "Active",
  },
  {
    order: 6,
    name: "Autopilot menu mockup — Dev 3031",
    purpose:
      "Side-by-side menu layout comparison and commercial-safety checklist for Project 3030 (static design review).",
    href: `${SHOPRALLY_CRM_DEV_ORIGIN}/design-review/menu-mockup-3030`,
    startCommand: "npm run dev",
    port: 3031,
    shell: "Static mockup (no 3030 server required)",
    status: "Preview",
  },
  {
    order: 7,
    name: "Estimate Building Lab — Dev 3031",
    purpose:
      "Isolated Tekmetric + AutoLeap estimate builder on live ROs — right rail, sticky totals, parts slide-over.",
    href: `${SHOPRALLY_CRM_DEV_ORIGIN}${designModeHref("/design-review/estimate-building")}`,
    startCommand: "npm run dev",
    port: 3031,
    shell: "Shop CRM + design dock",
    status: "Active",
    note: "Open with design dock (Ctrl+Shift+D) · RO picker in header.",
  },
  {
    order: 8,
    name: "Preview concepts — Dev 3031",
    purpose:
      "Legacy preview routes (/preview, /preview/concepts, /preview/nav-concepts) — kept for bookmarks; all redirect to dashboard.",
    href: `${SHOPRALLY_CRM_DEV_ORIGIN}/preview/concepts`,
    startCommand: "npm run dev",
    port: 3031,
    shell: "Redirect only (was ui-preview shell)",
    status: "Preview",
    note: "Routes exist but redirect to /dashboard.",
  },
  {
    order: 9,
    name: "Intake Lab — 3010",
    purpose:
      "Static HTML/JS prototype for Create RO intake flows — mock data only, iterate before merging into :3031.",
    href: "http://localhost:3010",
    startCommand: "npm run intake-lab",
    port: 3010,
    shell: "Static HTML/JS (prototypes/intake-lab)",
    status: "Prototype",
    optional: true,
  },
  {
    order: 10,
    name: "Legacy CrmShell — 3001",
    purpose:
      "Deprecated pre-merge shop chrome (CrmShell layout) — use only to compare old vs :3031 shell.",
    href: "http://localhost:3001/dashboard",
    startCommand: "npm run dev:3001",
    port: 3001,
    shell: "CrmShell (deprecated)",
    status: "Deprecated",
    optional: true,
    deprecated: true,
  },
];

/** Archive-only row — no dev server; shown in glance table + footer. */
const ARCHIVE_REFERENCE: CrmInventoryEntry = {
  order: 0,
  name: "Archive RepairPilot — :3000 reference",
  purpose:
    "Read-only snapshot in _archive-repairpilot/ — historical sidebar layout reference. Do not run unless explicitly comparing.",
  href: "#",
  startCommand: "— (no server)",
  port: null,
  shell: "Legacy RepairPilot sidebar",
  status: "Archive",
};

const STATUS_BADGE: Record<
  CrmVersionStatus,
  { label: string; className: string }
> = {
  Active: { label: "Active", className: "border-emerald-500/50 text-emerald-700" },
  Preview: { label: "Preview", className: "border-sky-500/50 text-sky-700" },
  Prototype: { label: "Prototype", className: "border-violet-500/50 text-violet-700" },
  Deprecated: { label: "Deprecated", className: "border-amber-500/50 text-amber-700" },
  Archive: { label: "Archive", className: "border-muted-foreground/40 text-muted-foreground" },
};

function ServerBadge({ entry }: { entry: CrmInventoryEntry }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
      <Server className="size-3 shrink-0" aria-hidden />
      {entry.port != null ? `:${entry.port}` : "no port"} · {entry.startCommand}
    </span>
  );
}

function StatusBadge({ status }: { status: CrmVersionStatus }) {
  const { label, className } = STATUS_BADGE[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

function CrmVersionsAtAGlance() {
  const rows = [...CRM_INVENTORY, ARCHIVE_REFERENCE].sort((a, b) => {
    if (a.status === "Archive") return 1;
    if (b.status === "Archive") return -1;
    return a.order - b.order;
  });

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-brand-light/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-brand-navy">CRM versions at a glance</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          All active shells, previews, and prototypes — then the numbered tour below.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Port</th>
              <th className="px-4 py-2.5 font-medium">Shell</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.name} className="border-b last:border-b-0">
                <td className="px-4 py-2.5 font-medium text-brand-navy">
                  {entry.href !== "#" ? (
                    <Link href={entry.href} className="hover:underline">
                      {entry.name}
                    </Link>
                  ) : (
                    entry.name
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                  {entry.port != null ? `:${entry.port}` : "—"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{entry.shell}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={entry.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CrmInventoryTour() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <header className="space-y-3">
        <Badge variant="outline" className="border-brand-navy text-brand-navy">
          CRM inventory
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Which CRM is which?
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          ShopRally runs several shells and prototypes on different ports. Follow the numbered order below
          to tour each one.{" "}
          <strong className="font-medium text-foreground">Dev 3031</strong> is the active merged build;
          everything else is comparison, archive, or experiment.
        </p>
      </header>

      <CrmVersionsAtAGlance />

      <section className="rounded-xl border border-brand-navy/20 bg-brand-light/10 p-4">
        <p className="text-sm font-medium text-brand-navy">Quick start</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>
            Terminal 1: <code className="rounded bg-white/60 px-1 py-0.5 text-xs">npm run dev</code> →
            Shop + Platform CRM on{" "}
            <Link href={`${SHOPRALLY_CRM_DEV_ORIGIN}/dashboard`} className="font-medium text-brand-navy hover:underline">
              localhost:3031
            </Link>
          </li>
          <li>
            Terminal 2 (Autopilot):{" "}
            <code className="rounded bg-white/60 px-1 py-0.5 text-xs">npm run dev:3030</code> →{" "}
            <Link href="http://localhost:3030/dashboard" className="font-medium text-brand-navy hover:underline">
              localhost:3030
            </Link>
          </li>
          <li>
            Optional — Intake Lab:{" "}
            <code className="rounded bg-white/60 px-1 py-0.5 text-xs">npm run intake-lab</code> →
            localhost:3010
          </li>
        </ol>
      </section>

      <ol className="space-y-4">
        {CRM_INVENTORY.map((entry) => (
          <li
            key={entry.order}
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
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-brand-navy">{entry.name}</h2>
                  <StatusBadge status={entry.status} />
                  {entry.optional ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      Optional
                    </Badge>
                  ) : null}
                </div>

                <p className="text-sm text-muted-foreground">{entry.purpose}</p>

                <div className="flex flex-wrap items-center gap-2">
                  <ServerBadge entry={entry} />
                  {entry.note ? (
                    <span className="text-xs text-muted-foreground">{entry.note}</span>
                  ) : null}
                </div>

                <Link
                  href={entry.href}
                  target={entry.port === 3031 || entry.port == null ? undefined : "_blank"}
                  rel={entry.port === 3031 || entry.port == null ? undefined : "noopener noreferrer"}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-navy hover:underline"
                >
                  Open
                  <ArrowRight className="size-4" aria-hidden />
                  <span className="font-mono text-xs font-normal text-muted-foreground">{entry.href}</span>
                  {entry.port != null && entry.port !== 3031 ? (
                    <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                  ) : null}
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <footer className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Also in repo (no dev server)</p>
        <p className="mt-1">
          <code className="text-xs">_archive-repairpilot/</code> — legacy :3000 reference snapshot (
          {ARCHIVE_REFERENCE.shell}), read-only. Do not run unless explicitly comparing historical layout.
        </p>
        <p className="mt-2">
          <Link href="/design-review/platform-inventory" className="font-medium text-brand-navy hover:underline">
            Platform / Master CRM inventory tour
          </Link>
          {" · "}
          <Link href="/design-review" className="font-medium text-brand-navy hover:underline">
            ← Back to design review hub
          </Link>
        </p>
      </footer>
    </div>
  );
}
