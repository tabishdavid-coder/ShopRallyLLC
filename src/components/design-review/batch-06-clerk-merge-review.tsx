"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  GitMerge,
  KeyRound,
  Shield,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CrmReviewLivePreview } from "@/components/crm/crm-review-live-preview";
import { crmReviewLiveHref, getCrmReviewBatch } from "@/lib/crm-review-batches";
import { cn } from "@/lib/utils";

const BATCHES_DONE = [
  { n: 1, title: "Trade dress (HR-01 … HR-10)", href: "/design-review/trade-dress" },
  { n: 2, title: "RBAC — RO tab gates", href: "/design-review/batch-02-rbac" },
  { n: 3, title: "RO workspace UX", href: "/design-review/batch-03-ro-workspace" },
  { n: 4, title: "Master CRM platform", href: "/platform/review/batch-04" },
  { n: 5, title: "Create RO intake", href: "/design-review/batch-05-ro-intake" },
] as const;

const CLERK_STOPS = [
  {
    id: "CLERK-01",
    title: "Role-based /home redirect",
    detail:
      "Clerk lands on /home; server redirects platform admins to /platform and shop staff to /dashboard.",
    href: "/home",
    files: ["app/(app)/home/page.tsx", "lib/platform-routing.ts", "components/providers/clerk-provider.tsx"],
  },
  {
    id: "CLERK-02",
    title: "Auth baseline (on main)",
    detail: "Membership-first tenancy, route gates, nav filtering — already live.",
    href: "/design-review/task-02-auth",
    files: ["lib/crm-access.ts", "server/crm-access.ts", "lib/shop.ts"],
  },
  {
    id: "CLERK-03",
    title: "Clerk env + integrations row",
    detail: "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/home documented in .env.example and CLERK-LANDING.md.",
    href: "/settings/integrations",
    files: [".env.example", "docs/CLERK-LANDING.md", "settings/integrations/page.tsx"],
  },
] as const;

const MERGE_QA = [
  { surface: "/platform", check: "Master CRM sidebar, enter shop, release review archive" },
  { surface: "/dashboard (admin)", check: "Operator banner + Master CRM header link + create RO FAB" },
  { surface: "/dashboard (staff)", check: "No platform chrome; RBAC tab gates" },
  { surface: "/repair-orders/[id]", check: "RO focus mode — sidebar hidden on detail, not on /new" },
  { surface: "Switch shop", check: "Cookie + tenant data correct after Enter Shop CRM" },
] as const;

function StopCard({
  id,
  title,
  detail,
  href,
  files,
}: {
  id: string;
  title: string;
  detail: string;
  href: string;
  files: readonly string[];
}) {
  const batch = getCrmReviewBatch("batch-06");
  const stop = batch?.stops.find((s) => s.id === id);
  const liveHref = stop ? crmReviewLiveHref("batch-06", stop) : href;

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
      <p className="text-sm text-muted-foreground">{detail}</p>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Files:</span> {files.join(", ")}
      </p>
    </section>
  );
}

export function Batch06ClerkMergeReview() {
  const batch = getCrmReviewBatch("batch-06");
  const stops = batch?.stops ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-brand-navy text-white">Batch 6 — Release prep</Badge>
          <Badge variant="outline">Batch 5 approved ✓</Badge>
          <Badge variant="outline" className="border-emerald-600/40 text-emerald-700">
            Approved & merged to main · 2026-07-03
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Clerk landing & merge prep
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Final batch before merging <code className="text-xs">feature/master-crm</code> into{" "}
          <code className="text-xs">main</code>. Documents Clerk post-auth landing and confirms
          Batches 1–5 are approved on the branch.
        </p>
        <nav className="flex flex-wrap gap-2 text-xs">
          {CLERK_STOPS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-md border border-border bg-muted/40 px-2 py-1 hover:bg-brand-light/20"
            >
              {s.id}
            </a>
          ))}
          <a
            href="#MERGE-01"
            className="rounded-md border border-border bg-muted/40 px-2 py-1 hover:bg-brand-light/20"
          >
            MERGE-01
          </a>
          <a
            href="#MERGE-02"
            className="rounded-md border border-border bg-muted/40 px-2 py-1 hover:bg-brand-light/20"
          >
            MERGE-02
          </a>
        </nav>
      </header>

      <CrmReviewLivePreview batchId="batch-06" />

      <section className="rounded-xl border-2 border-brand-navy/20 bg-brand-navy/5 p-5">
        <h2 className="text-sm font-semibold text-brand-navy">Live tour — Shop CRM</h2>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          Each tile opens the live page with a green review banner and highlighted change. CLERK-01
          highlights the dashboard callout explaining /home routing.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {stops.map((stop) => (
            <Link
              key={stop.id}
              href={crmReviewLiveHref("batch-06", stop)}
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

      <section className="rounded-xl border-2 border-brand-navy/20 bg-brand-navy/5 p-5">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 size-5 shrink-0 text-brand-navy" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-brand-navy">Clerk landing summary</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set Clerk post-auth URLs to <strong className="text-foreground">/home</strong> — not
              /platform or /dashboard directly. Role routing is server-side via{" "}
              <code className="text-xs">appHomePath(isPlatformAdmin)</code>.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3 border-brand-navy/30">
              <Link href="/home" target="_blank" rel="noopener noreferrer">
                Test /home redirect
                <ExternalLink className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {CLERK_STOPS.map((stop) => (
        <StopCard key={stop.id} {...stop} />
      ))}

      <section
        className="scroll-mt-6 space-y-4 rounded-xl border bg-card p-5"
        id="MERGE-01"
        data-planned-change="MERGE-01"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-brand-navy">MERGE-01 — Batches approved on branch</h2>
        </div>
        <ul className="divide-y rounded-lg border">
          {BATCHES_DONE.map((b) => (
            <li key={b.n}>
              <Link
                href={b.href}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
              >
                <span>
                  <span className="font-medium text-brand-navy">Batch {b.n}</span>
                  <span className="text-muted-foreground"> — {b.title}</span>
                </span>
                <Badge variant="outline" className="shrink-0 border-emerald-600 text-emerald-700">
                  Approved ✓
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="scroll-mt-6 space-y-4 rounded-xl border bg-card p-5" id="MERGE-02" data-planned-change="MERGE-02">
        <div className="flex items-center gap-2">
          <GitMerge className="size-5 text-brand-navy" />
          <h2 className="text-lg font-semibold text-brand-navy">MERGE-02 — Merge to main</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          When Batch 6 was approved, <code className="text-xs">feature/master-crm</code> was merged to{" "}
          <code className="text-xs">main</code>. Full guide:{" "}
          <code className="text-xs">agents/MasterCRM/MERGE.md</code>
        </p>
        <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-4 text-xs leading-relaxed">
{`git checkout main
git pull origin main
git merge feature/master-crm
npm run typecheck`}
        </pre>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Surface</th>
                <th className="pb-2 font-medium">Check</th>
              </tr>
            </thead>
            <tbody>
              {MERGE_QA.map((row) => (
                <tr key={row.surface} className="border-b last:border-0">
                  <td className="py-2.5 pr-4 font-mono text-xs text-brand-navy">{row.surface}</td>
                  <td className="py-2.5 text-muted-foreground">{row.check}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-brand-light/50 bg-brand-light/10 p-5">
        <div className="flex items-start gap-2">
          <Shield className="mt-0.5 size-5 shrink-0 text-brand-navy" />
          <div>
            <h2 className="text-sm font-semibold text-brand-navy">How to approve</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Confirm Clerk env docs in <code className="text-xs">docs/CLERK-LANDING.md</code>.</li>
              <li>Visit <Link href="/home" className="text-brand-navy hover:underline">/home</Link> as platform admin → lands on /platform.</li>
              <li>Reply <strong className="text-foreground">APPROVE BATCH 6</strong> — done 2026-07-03.</li>
              <li>Merged to <code className="text-xs">main</code>. Next: deploy + enable Clerk keys in production.</li>
            </ol>
            <p className="mt-3 text-sm text-muted-foreground">
              After merge: tag release, deploy, enable Clerk keys in production.
              <ArrowRight className="mx-1 inline size-4" />
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
