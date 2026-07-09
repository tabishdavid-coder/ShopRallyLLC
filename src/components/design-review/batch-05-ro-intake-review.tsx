"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import { CrmReviewLivePreview } from "@/components/crm/crm-review-live-preview";
import { Badge } from "@/components/ui/badge";
import {
  crmReviewLiveHref,
  getCrmReviewBatch,
} from "@/lib/crm-review-batches";
import { cn } from "@/lib/utils";

function Panel({
  variant,
  label,
  children,
}: {
  variant: "before" | "after";
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
  before,
  after,
  testHref,
}: {
  id: string;
  title: string;
  before: React.ReactNode;
  after: React.ReactNode;
  testHref: string;
}) {
  const batch = getCrmReviewBatch("batch-05");
  const stop = batch?.stops.find((s) => s.id === id);
  const liveHref = stop ? crmReviewLiveHref("batch-05", stop) : testHref;

  return (
    <section className="scroll-mt-6 space-y-3 rounded-xl border bg-card p-5" id={id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Badge variant="outline" className="mb-2 border-brand-navy/40 text-brand-navy">
            {id}
          </Badge>
          <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
        </div>
        <Link
          href={liveHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
        >
          Open live (planned) <ExternalLink className="size-3.5" />
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel variant="before" label="Before">
          {before}
        </Panel>
        <Panel variant="after" label="Planned (live in Shop CRM)">
          {after}
        </Panel>
      </div>
    </section>
  );
}

export function Batch05RoIntakeReview() {
  const batch = getCrmReviewBatch("batch-05");
  const stops = batch?.stops ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-brand-navy text-white">Batch 5 — Shop CRM</Badge>
          <Badge variant="outline">Batch 5 approved ✓</Badge>
          <Badge variant="outline" className="border-emerald-600/40 text-emerald-700">
            Approved 2026-07-03
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Create RO intake — current vs planned
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Batch 3 wired <code className="text-xs">RoIntakeProvider</code> and RO focus mode. Batch 5
          verifies the create-RO slide-over, form layout, and full-page fallback work end-to-end.
        </p>
        <nav className="flex flex-wrap gap-2 text-xs">
          {stops.map((stop) => (
            <a
              key={stop.id}
              href={`#${stop.id}`}
              className="rounded-md border border-border bg-muted/40 px-2 py-1 hover:bg-brand-light/20"
            >
              {stop.id} {stop.label}
            </a>
          ))}
        </nav>
      </header>

      <CrmReviewLivePreview batchId="batch-05" />

      <section className="rounded-xl border-2 border-brand-navy/20 bg-brand-navy/5 p-5">
        <h2 className="text-sm font-semibold text-brand-navy">Live tour — Shop CRM</h2>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          Each tile opens the planned page inside Shop CRM with a green review banner and highlighted
          change. INTAKE-02 auto-opens the intake slide-over.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {stops.map((stop) => (
            <Link
              key={stop.id}
              href={crmReviewLiveHref("batch-05", stop)}
              className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-sm shadow-sm hover:border-brand-navy/40"
            >
              <span>
                <span className="font-mono text-[10px] text-muted-foreground">{stop.id}</span>
                <span className="mt-0.5 block font-medium text-brand-navy">{stop.label}</span>
              </span>
              <ExternalLink className="size-4 text-brand-navy/70" />
            </Link>
          ))}
        </div>
      </section>

      <ReviewBlock
        id="INTAKE-01"
        title="FAB opens intake slide-over"
        testHref="/dashboard"
        before={<p>FAB links to /repair-orders/new full page only.</p>}
        after={
          <p>When intake config loads, FAB calls openIntake() — slide-over from any shop page.</p>
        }
      />

      <ReviewBlock
        id="INTAKE-02"
        title="CrmFormLayout intake sections"
        testHref="/dashboard"
        before={<p>Legacy create form without grouped sections / checklist.</p>}
        after={
          <p>
            Customer search → vehicle pick → RO details with IntakeChecklist and add customer/vehicle
            dialogs.
          </p>
        }
      />

      <ReviewBlock
        id="INTAKE-03"
        title="Full-page fallback"
        testHref="/repair-orders/new"
        before={<p>Only full-page create route.</p>}
        after={<p>/repair-orders/new still works; FAB falls back to Link when config is null.</p>}
      />

      <ReviewBlock
        id="INTAKE-04"
        title="New RO page keeps dashboard sidebar"
        testHref="/repair-orders/new"
        before={<p>/repair-orders/new hides sidebar — wrong for create flow.</p>}
        after={
          <p>Focus mode regex excludes /repair-orders/new — sidebar stays visible on create page.</p>
        }
      />

      <section className="rounded-xl border border-brand-light/50 bg-brand-light/10 p-5">
        <h2 className="text-sm font-semibold text-brand-navy">How to review</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Use the live iframe above or tour tiles to open each stop in Shop CRM.</li>
          <li>Dashboard also shows a review callout linking here.</li>
          <li>Reply <strong className="text-foreground">APPROVE BATCH 5</strong> when satisfied.</li>
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">
          Approved — continue to{" "}
          <Link href="/design-review/batch-06-clerk-merge" className="font-medium text-brand-navy hover:underline">
            Batch 6 (Clerk landing & merge prep)
          </Link>
          .
          <ArrowRight className="mx-1 inline size-4" />
        </p>
      </section>
    </div>
  );
}
