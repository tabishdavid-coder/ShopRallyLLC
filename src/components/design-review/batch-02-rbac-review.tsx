"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PanelVariant = "before" | "after";

function Panel({
  variant,
  label,
  children,
}: {
  variant: PanelVariant;
  label: string;
  children: React.ReactNode;
}) {
  const isAfter = variant === "after";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border-2 shadow-sm",
        isAfter ? "border-emerald-500/55" : "border-brand-red/45",
      )}
    >
      <div
        className={cn(
          "px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider",
          isAfter ? "bg-emerald-700 text-white" : "bg-brand-red text-white",
        )}
      >
        {label}
      </div>
      <div className="bg-muted/15 p-3 text-[11px] leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

function ReviewBlock({
  id,
  title,
  risk,
  fix,
  files,
  liveHref,
  testSteps,
  before,
  after,
}: {
  id: string;
  title: string;
  risk: string;
  fix: string;
  files: string[];
  liveHref?: string;
  testSteps?: string;
  before: React.ReactNode;
  after: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-6 space-y-3 rounded-xl border bg-card p-5" id={id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Badge variant="outline" className="mb-2 border-brand-navy/40 text-brand-navy">
            {id}
          </Badge>
          <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
        </div>
        {liveHref ? (
          <Link
            href={liveHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
          >
            Test live (planned) <ExternalLink className="size-3.5" />
          </Link>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Risk:</span> {risk}
      </p>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Fix:</span> {fix}
      </p>
      {testSteps ? (
        <p className="rounded-md border border-brand-navy/15 bg-brand-navy/5 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-brand-navy">How to test:</span> {testSteps}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel variant="before" label="Current (main)">
          {before}
        </Panel>
        <Panel variant="after" label="Planned (WIP on this branch)">
          {after}
        </Panel>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Files:</span> {files.join(", ")}
      </p>
    </section>
  );
}

function RoTabMock({
  tabs,
  highlight,
  note,
}: {
  tabs: string[];
  highlight?: string;
  note?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b bg-muted/40 px-2 py-1.5">
        {tabs.map((tab) => (
          <span
            key={tab}
            className={cn(
              "rounded px-2 py-0.5 text-[10px]",
              highlight === tab
                ? "bg-brand-red/15 text-brand-red ring-1 ring-brand-red/40"
                : "bg-white text-muted-foreground shadow-sm",
            )}
          >
            {tab}
          </span>
        ))}
      </div>
      {note ? <p className="mt-2 text-[10px] text-muted-foreground">{note}</p> : null}
    </div>
  );
}

const BASELINE = [
  "Layout route guard → /dashboard?access=denied",
  "CRM header + sidebar hide items by permission",
  "Access denied banner on dashboard",
  "Growth routes blocked by plan (not permission alone)",
] as const;

export function Batch02RbacReview() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-brand-navy text-white">Batch 2 — RBAC</Badge>
          <Badge variant="outline">Batch 2 approved ✓</Badge>
          <Badge variant="outline">Merged on feature/master-crm</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Role permissions — current vs planned
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Baseline nav + route gates already ship on <strong className="text-foreground">main</strong>.
          This batch adds <strong className="text-foreground">RO workspace tab</strong> enforcement so
          technicians and front desk staff don&apos;t see tabs they can&apos;t use — and can&apos;t deep-link
          past them.
        </p>
        <nav className="flex flex-wrap gap-2 text-xs">
          {[
            ["baseline", "Baseline (live)"],
            ["RBAC-05", "RO tab visibility"],
            ["RBAC-06", "RO deep links"],
            ["RBAC-07", "Server guard"],
            ["personas", "Test personas"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-md border border-border bg-muted/40 px-2 py-1 hover:bg-brand-light/20"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <section
        id="baseline"
        className="scroll-mt-6 rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-5"
      >
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <h2 className="text-sm font-semibold text-brand-navy">Already live on main — no re-review</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {BASELINE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              See{" "}
              <Link href="/design-review/task-02-auth" className="text-brand-navy hover:underline">
                Task 2 summary
              </Link>{" "}
              · docs in <code className="text-[10px]">docs/BATCH-02-RBAC.md</code>
            </p>
          </div>
        </div>
      </section>

      <ReviewBlock
        id="RBAC-05"
        title="RO tab visibility by permission"
        risk="Technician sees Payment tab but lacks payments.view — confusing and implies access."
        fix="Server computes allowedSegments; RoTabs hides Estimate / Work in Progress / Payment when keys missing. Overview always visible; /inspections URL allowed but not a phase step."
        files={[
          "src/lib/crm-access.ts (RO_TAB_SEGMENT_PERMISSIONS)",
          "src/components/repair-order/ro-tabs.tsx",
          "src/components/repair-order/ro-workspace-panel.tsx",
          "src/app/(app)/repair-orders/[id]/layout.tsx",
        ]}
        liveHref="/repair-orders"
        testSteps="Assign user to Technician group → open any RO → Payment tab should not render. Service Advisor should see all tabs."
        before={
          <RoTabMock
            tabs={["Overview", "Estimate", "Work in Progress", "Payment"]}
            highlight="Payment"
            note="Technician (no payments.view) still sees Payment tab — clicking may error or show data they shouldn't manage."
          />
        }
        after={
          <RoTabMock
            tabs={["Overview", "Estimate", "Work in Progress"]}
            note="Technician: Payment hidden. Front Desk: Work in Progress hidden (no wip.view). Owner / Shop Admin: all steps."
          />
        }
      />

      <ReviewBlock
        id="RBAC-06"
        title="RO tab deep-link redirect"
        risk="Bookmark or shared URL /repair-orders/…/payment bypasses hidden tab UI."
        fix="RO layout reads pathname segment; if not in allowedSegments → redirect to RO overview (same shop, same RO)."
        files={["src/app/(app)/repair-orders/[id]/layout.tsx", "src/lib/crm-access.ts"]}
        liveHref="/repair-orders"
        testSteps="As Technician, paste /repair-orders/{id}/payment in the address bar → should land on RO overview, not payment panel."
        before={
          <div className="space-y-2">
            <p className="font-mono text-[10px] text-brand-red">/repair-orders/abc123/payment</p>
            <p>User lands on Payment tab content even without payments.view.</p>
          </div>
        }
        after={
          <div className="space-y-2">
            <p className="font-mono text-[10px] text-emerald-800">/repair-orders/abc123/payment</p>
            <p className="text-emerald-900">→ redirect →</p>
            <p className="font-mono text-[10px]">/repair-orders/abc123</p>
            <p>Overview tab loads; no error page.</p>
          </div>
        }
      />

      <ReviewBlock
        id="RBAC-07"
        title="Server route guard for RO segments"
        risk="Layout guard matches /repair-orders prefix with job_board keys only — payment segment not checked."
        fix="checkCrmRouteAccess also calls roTabSegmentAllowed for estimate, work-in-progress, payment segments."
        files={["src/server/crm-access.ts", "src/lib/crm-access.ts"]}
        testSteps="Same as RBAC-06 — defense in depth before RO layout renders."
        before={
          <div className="space-y-1 text-[10px]">
            <p>
              <strong>Rule matched:</strong> /repair-orders → job_board.view ✓
            </p>
            <p className="text-brand-red">Segment /payment never checked → page loads.</p>
          </div>
        }
        after={
          <div className="space-y-1 text-[10px]">
            <p>
              <strong>Prefix:</strong> /repair-orders → job_board.view ✓
            </p>
            <p>
              <strong>Segment:</strong> payment → payments.view ✗
            </p>
            <p className="text-emerald-800">→ redirect /dashboard?access=denied (layout) or RO overview (RO layout)</p>
          </div>
        }
      />

      <section id="personas" className="scroll-mt-6 rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold text-brand-navy">Test personas (permission groups)</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 pr-4 font-semibold">Group</th>
                <th className="pb-2 pr-4 font-semibold">RO tabs visible (planned)</th>
                <th className="pb-2 font-semibold">Missing keys</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4 font-medium text-foreground">Technician</td>
                <td className="py-2 pr-4">Overview · Estimate · Work in Progress</td>
                <td className="py-2">payments.view</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4 font-medium text-foreground">Front Desk</td>
                <td className="py-2 pr-4">Overview · Estimate · Payment</td>
                <td className="py-2">wip.view</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4 font-medium text-foreground">Service Advisor</td>
                <td className="py-2 pr-4">All tabs</td>
                <td className="py-2">—</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-foreground">Owner / Platform admin</td>
                <td className="py-2 pr-4">All tabs (unrestricted)</td>
                <td className="py-2">effective = all</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Configure under <Link href="/employees" className="text-brand-navy hover:underline">Employees</Link>{" "}
          → assign group or individual keys → sign in as that user (or use permission preview if available).
        </p>
      </section>

      <section className="rounded-xl border border-brand-light/50 bg-brand-light/10 p-5">
        <h2 className="text-sm font-semibold text-brand-navy">How to review</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Run <code className="text-xs">npm run dev</code> on <strong className="text-foreground">feature/master-crm</strong>{" "}
            (WIP must be in your working tree — not committed yet).
          </li>
          <li>Compare red/green mockups above with live RO tabs using a restricted employee.</li>
          <li>
            Approve: <strong className="text-foreground">APPROVED RBAC-05</strong> … or{" "}
            <strong className="text-foreground">APPROVE BATCH 2</strong>
          </li>
        </ol>
        <p className="mt-4 flex items-center gap-2 text-sm">
          Next after Batch 2: <strong className="text-brand-navy">Batch 3 — RO workspace UX</strong>
          <ArrowRight className="size-4" />
          <Link href="/design-review/batch-03-ro-workspace" className="text-brand-navy hover:underline">
            Batch 3 review
          </Link>
        </p>
      </section>
    </div>
  );
}
