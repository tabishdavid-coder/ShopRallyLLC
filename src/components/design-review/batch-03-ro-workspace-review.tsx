"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PanelVariant = "before" | "after" | "shipped";

function Panel({
  variant,
  label,
  children,
}: {
  variant: PanelVariant;
  label: string;
  children: React.ReactNode;
}) {
  const isAfter = variant === "after" || variant === "shipped";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border-2 shadow-sm",
        variant === "shipped"
          ? "border-brand-navy/40"
          : isAfter
            ? "border-emerald-500/55"
            : "border-brand-red/45",
      )}
    >
      <div
        className={cn(
          "px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider",
          variant === "shipped"
            ? "bg-brand-navy text-white"
            : isAfter
              ? "bg-emerald-700 text-white"
              : "bg-brand-red text-white",
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
  status,
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
  status?: "wip" | "shipped";
  before: React.ReactNode;
  after: React.ReactNode;
}) {
  const shipped = status === "shipped";
  return (
    <section className="scroll-mt-6 space-y-3 rounded-xl border bg-card p-5" id={id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Badge
            variant="outline"
            className={cn(
              "mb-2",
              shipped ? "border-brand-navy/40 text-brand-navy" : "border-brand-navy/40 text-brand-navy",
            )}
          >
            {id}
            {shipped ? " · shipped" : ""}
          </Badge>
          <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
        </div>
        {liveHref ? (
          <Link
            href={liveHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
          >
            Test live {shipped ? "" : "(planned)"} <ExternalLink className="size-3.5" />
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
        <Panel
          variant={shipped ? "shipped" : "after"}
          label={shipped ? "Shipped (Batch 2 merge)" : "Planned (WIP on branch)"}
        >
          {after}
        </Panel>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Files:</span> {files.join(", ")}
      </p>
    </section>
  );
}

export function Batch03RoWorkspaceReview() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-brand-navy text-white">Batch 3 — RO workspace</Badge>
          <Badge variant="outline">Batch 3 approved ✓</Badge>
          <Badge variant="outline">Merged on feature/master-crm</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          RO workspace UX — current vs planned
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Slim hero, Payment tab label, and tab permissions landed with Batch 2. This batch covers{" "}
          <strong className="text-foreground">focus mode</strong> (hide dashboard sidebar on RO pages),{" "}
          <strong className="text-foreground">intake wiring</strong>, and vehicle specs sidebar polish.
        </p>
        <nav className="flex flex-wrap gap-2 text-xs">
          {[
            ["RO-03", "Slim hero ✓"],
            ["RO-05", "Payment tab ✓"],
            ["RO-01", "Focus mode"],
            ["RO-02", "Intake wiring"],
            ["RO-06", "Specs sidebar"],
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

      <ReviewBlock
        id="RO-03"
        status="shipped"
        title="Slim estimate hero"
        risk="Canned jobs + parts hub duplicated in hero and estimate column — crowded Tekmetric-like composite."
        fix="Remove RoEstimateHeroToolbar from layout hero; keep odometer + lifecycle strip only. Builder stays in estimate work area."
        files={["src/app/(app)/repair-orders/[id]/layout.tsx"]}
        liveHref="/repair-orders"
        testSteps="Open RO → Estimate tab. Hero row should show odometer + lifecycle only — no canned job / parts hub strip in the navy hero."
        before={
          <div className="rounded bg-brand-navy/90 p-2 text-[10px] text-white">
            <p>Odometer · Lifecycle ·</p>
            <p className="mt-1 text-brand-red">+ Canned jobs · Parts hub · Labor guide · …</p>
          </div>
        }
        after={
          <div className="rounded bg-brand-navy/90 p-2 text-[10px] text-white">
            <p>Odometer · Lifecycle strip</p>
            <p className="mt-1 text-white/70">Estimate toolbar only in jobs column below.</p>
          </div>
        }
      />

      <ReviewBlock
        id="RO-05"
        status="shipped"
        title="Payment tab label"
        risk="Tab says Billing but route is /payment — confusing IA."
        fix="Rename tab to Payment (short: Pay)."
        files={["src/components/repair-order/ro-tabs.tsx"]}
        liveHref="/repair-orders"
        testSteps="Open any RO — last workspace tab reads Payment, not Billing."
        before={
          <span className="rounded bg-brand-red/10 px-2 py-1 text-brand-red">Billing /payment</span>
        }
        after={
          <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-800">Payment</span>
        }
      />

      <ReviewBlock
        id="RO-01"
        title="RO focus mode (hide dashboard sidebar)"
        risk="Three nav layers on RO pages — dashboard sidebar competes with context deck + estimate builder."
        fix="On /repair-orders/[id]/* hide CrmSecondaryNav + mobile dashboard pills; keep CRM header + RO workspace full width (like /workflow full bleed)."
        files={["src/components/crm/crm-shell.tsx", "src/components/crm/crm-secondary-nav.tsx"]}
        liveHref="/repair-orders"
        testSteps="Open any RO — dashboard sidebar (Job Board, Workflow, …) should not appear; header + RO tabs remain."
        before={
          <div className="flex gap-2">
            <div className="w-16 shrink-0 rounded bg-brand-navy/95 p-1 text-[8px] text-white/80">
              Dashboard nav
            </div>
            <div className="min-w-0 flex-1 rounded border p-2 text-[9px]">RO workspace squeezed</div>
          </div>
        }
        after={
          <div className="rounded border p-2 text-[9px]">
            <p className="font-semibold text-brand-navy">Full-width RO workspace</p>
            <p className="text-muted-foreground">Header only — no left dashboard column.</p>
          </div>
        }
      />

      <ReviewBlock
        id="RO-02"
        title="RoIntakeProvider wiring"
        risk="Create RO slide-over hooks exist but config not loaded — FAB / job board intake dead ends."
        fix="loadRoIntakeConfig in app layout → RoIntakeProvider wraps CrmShell."
        files={["src/app/(app)/layout.tsx", "src/components/crm/crm-shell.tsx"]}
        liveHref="/job-board"
        testSteps="Click Create RO FAB or intake entry on job board — slide-over should open with shop intake fields."
        before={
          <p className="text-brand-red">Intake config null — optional hooks no-op.</p>
        }
        after={
          <p className="text-emerald-800">Intake config loaded once per request; slide-over opens from FAB.</p>
        }
      />

      <ReviewBlock
        id="RO-06"
        title="Vehicle specs sidebar (light theme links)"
        risk="RO context deck uses light strip but sidebar links still use link-on-dark — low contrast."
        fix="specLinkClass(lightTheme) on recalls, tire last-order, and maintenance links when deck is light."
        files={["src/components/repair-order/ro-vehicle-specs-panel.tsx"]}
        liveHref="/repair-orders"
        testSteps="Open RO overview — expand Specs / Recalls accordions; links should be readable navy/subtle, not white-on-light."
        before={
          <p className="text-brand-red">White-ish links on light sidebar — hard to read.</p>
        }
        after={
          <p className="text-emerald-800">link-subtle / brand-navy links on light RO sidebar.</p>
        }
      />

      <section className="rounded-xl border border-brand-light/50 bg-brand-light/10 p-5">
        <h2 className="text-sm font-semibold text-brand-navy">How to review</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            RO-03 and RO-05 are already on the branch from the Batch 2 merge — verify live first.
          </li>
          <li>RO-01, RO-02, RO-06 are still WIP in your working tree (uncommitted).</li>
          <li>
            Approve: <strong className="text-foreground">APPROVE BATCH 3</strong> or item-by-item{" "}
            <strong className="text-foreground">APPROVED RO-01</strong>
          </li>
        </ol>
        <p className="mt-4 flex items-center gap-2 text-sm">
          Legacy mockups:{" "}
          <Link href="/design-review/task-04-ro-workspace" className="text-brand-navy hover:underline">
            Task 4 review
          </Link>
          <ArrowRight className="size-4" />
          Batch 4 next: Master CRM platform (Stripe, websites)
        </p>
      </section>
    </div>
  );
}
