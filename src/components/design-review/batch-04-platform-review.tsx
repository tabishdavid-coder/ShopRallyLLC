"use client";

import Link from "next/link";
import { ExternalLink, Globe } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformReviewLivePreview } from "@/components/platform/platform-review-live-preview";
import { getPlatformReviewBatch, platformReviewLiveHref } from "@/lib/platform-review-batches";
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
  fix,
  files,
  liveHref,
  afterLabel,
  before,
  after,
}: {
  id: string;
  title: string;
  fix: string;
  files: string[];
  liveHref: string;
  afterLabel: string;
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
        <Link
          href={platformReviewLiveHref("batch-04", { id, label: title, href: liveHref })}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
        >
          Open live (planned) <ExternalLink className="size-3.5" />
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Change:</span> {fix}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel variant="before" label="Current (before)">
          {before}
        </Panel>
        <Panel variant="after" label={afterLabel}>
          {after}
        </Panel>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Files:</span> {files.join(", ")}
      </p>
    </section>
  );
}

export function Batch04PlatformReview({ embeddedInPlatform = false }: { embeddedInPlatform?: boolean }) {
  const batch = getPlatformReviewBatch("batch-04");
  const stops = batch?.stops ?? [];
  const afterLabel = embeddedInPlatform ? "Planned (live in Master CRM)" : "After (this branch)";

  return (
    <div className={cn("space-y-8 pb-8", !embeddedInPlatform && "mx-auto max-w-6xl pb-16")}>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-brand-navy text-white">Batch 4 — Master CRM</Badge>
          <Badge variant="outline">Batch 4 approved ✓</Badge>
          <Badge variant="outline">Merged on feature/master-crm</Badge>
          {embeddedInPlatform ? (
            <Badge variant="outline" className="border-emerald-600/40 text-emerald-700">
              Inside Master CRM
            </Badge>
          ) : null}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Platform operator tools — current vs planned
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Compare before/after mockups, then open each live route in the sidebar to verify the planned
          operator experience.
        </p>
        <nav className="flex flex-wrap gap-2 text-xs">
          {[
            ["PLAT-01", "Shops Connect"],
            ["PLAT-02", "Billing"],
            ["PLAT-03", "Add shop"],
            ["PLAT-04", "SEO link"],
            ["PLAT-05", "Websites"],
            ["PLAT-06", "Cleanup"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-md border border-border bg-muted/40 px-2 py-1 hover:bg-brand-light/20"
            >
              {id} {label}
            </a>
          ))}
        </nav>
      </header>

      <PlatformReviewLivePreview batchId="batch-04" />

      <section className="rounded-xl border-2 border-brand-navy/25 bg-brand-navy/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-brand-navy">Live tour — planned pages</h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              {embeddedInPlatform
                ? "Each tile opens the planned page in Master CRM (same window). Compare with the before panel above each item."
                : "Open each route in Master CRM to see the planned state. Or use /platform/review/batch-04 inside the operator console."}
            </p>
          </div>
          {!embeddedInPlatform ? (
            <Button asChild size="sm" className="shrink-0 bg-brand-navy">
              <Link href="/platform/review/batch-04">
                <Globe className="mr-1.5 size-3.5" />
                Open in Master CRM
              </Link>
            </Button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stops.map((stop) => (
            <Link
              key={stop.id}
              href={platformReviewLiveHref("batch-04", stop)}
              className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm shadow-sm transition-colors hover:border-brand-navy/40 hover:bg-brand-light/10"
            >
              <span>
                <span className="font-mono text-[10px] text-muted-foreground">{stop.id}</span>
                <span className="mt-0.5 block font-medium text-brand-navy">{stop.label}</span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-brand-navy/70" />
            </Link>
          ))}
        </div>
      </section>

      <ReviewBlock
        id="PLAT-01"
        title="Shops table — Stripe Connect column"
        fix="Payments column with status pill + link to shop detail."
        files={["platform-shops-table.tsx", "server/platform-shops.ts", "stripe-connect-status-pill.tsx"]}
        liveHref="/platform/shops"
        afterLabel={afterLabel}
        before={<p>No Connect status — operator opens each shop detail to check payments setup.</p>}
        after={
          <p>
            <strong>Payments</strong> column: Not started / Pending / Active pill per shop + shop detail link.
          </p>
        }
      />

      <ReviewBlock
        id="PLAT-02"
        title="Billing overview — Connect + subscription"
        fix="Split Stripe column into Connect status pill and subscription stub column."
        files={["platform-billing-overview.tsx", "server/platform/billing.ts"]}
        liveHref="/platform/billing"
        afterLabel={afterLabel}
        before={<p>Single “Stripe” column — “Sub linked” or dash only.</p>}
        after={
          <p>
            <strong>Stripe Connect</strong> pill + <strong>Subscription</strong> (Sub linked / Customer only / —).
          </p>
        }
      />

      <ReviewBlock
        id="PLAT-03"
        title="Add shop intake polish"
        fix="PlatformPageIntro, post-create checklist, send intake link alternative."
        files={["platform-add-shop-page.tsx"]}
        liveHref="/platform/shops/new"
        afterLabel={afterLabel}
        before={<p>Plain heading + form only.</p>}
        after={
          <ul className="list-disc pl-4">
            <li>Intro + prefilled-lead hint</li>
            <li>Post-create steps (Master ID → onboarding → verify CRM)</li>
            <li>Send intake link instead button</li>
          </ul>
        }
      />

      <ReviewBlock
        id="PLAT-04"
        title="SEO Autopilot → Customer websites"
        fix="PlatformPageIntro clarifies ShopSite builds live under Customer websites."
        files={["platform/seo-automation/page.tsx"]}
        liveHref="/platform/seo-automation"
        afterLabel={afterLabel}
        before={<p>Standalone SEO page with no path to website build pipeline.</p>}
        after={
          <p>
            Intro + button to <strong>/platform/websites</strong>.
          </p>
        }
      />

      <ReviewBlock
        id="PLAT-05"
        title="Websites dashboard filters"
        fix="Shared isPipelineWebsiteStatus / isLiveWebsiteStatus helpers + Inbox icon on open requests KPI."
        files={["platform-websites-dashboard.tsx", "website-build-pipeline.ts", "server/platform/websites.ts"]}
        liveHref="/platform/websites"
        afterLabel={afterLabel}
        before={<p>Inline status arrays duplicated in dashboard filters.</p>}
        after={<p>Central pipeline helpers; consistent pipeline / live / upkeep filters.</p>}
      />

      <ReviewBlock
        id="PLAT-06"
        title="Remove orphan platform-header"
        fix="Deleted unused component — PlatformShell replaces it."
        files={["platform-header.tsx (deleted)"]}
        liveHref="/platform"
        afterLabel={afterLabel}
        before={<p>Dead file platform-header.tsx alongside PlatformShell.</p>}
        after={<p>Single shell path: platform-shell.tsx only.</p>}
      />

      <section className="rounded-xl border border-brand-light/50 bg-brand-light/10 p-5">
        <h2 className="text-sm font-semibold text-brand-navy">How to review</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Read each before/after pair below.</li>
          <li>Use live tour tiles or <strong>Open live (planned)</strong> on each item.</li>
          <li>Reply <strong className="text-foreground">APPROVE BATCH 4</strong> when satisfied.</li>
        </ol>
      </section>
    </div>
  );
}
