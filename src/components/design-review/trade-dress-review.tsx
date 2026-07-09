"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

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
  before,
  after,
}: {
  id: string;
  title: string;
  risk: string;
  fix: string;
  files: string[];
  liveHref?: string;
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
            View live (planned) <ExternalLink className="size-3.5" />
          </Link>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Risk:</span> {risk}
      </p>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Fix:</span> {fix}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel variant="before" label="Current (main / Tekmetric-like)">
          {before}
        </Panel>
        <Panel variant="after" label="Planned (this draft branch)">
          {after}
        </Panel>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Files:</span> {files.join(", ")}
      </p>
    </section>
  );
}

export function TradeDressReview() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-brand-navy text-white">Legal differentiation</Badge>
          <Badge variant="outline">Branch: feature/master-crm</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Trade dress review — current vs planned
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Side-by-side structural mockups for the background compliance refactor.{" "}
          <strong className="text-foreground">Red = current risk pattern.</strong>{" "}
          <strong className="text-emerald-700">Green = planned surgical fix</strong> already coded on
          this branch. Layout and workflows are preserved; only high-risk copy and composite patterns
          change.
        </p>
        <nav className="flex flex-wrap gap-2 text-xs">
          {[
            ["HR-01", "Campaigns"],
            ["HR-02", "Vendors"],
            ["HR-03", "Winback"],
            ["HR-05", "Payment"],
            ["HR-06", "Totals bar"],
            ["HR-07", "Matrix pills"],
            ["HR-08", "Jobs toolbar"],
            ["HR-09", "Authorize"],
            ["HR-10", "Context bar"],
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

      <ReviewBlock
        id="HR-01"
        title="Campaign templates hub"
        risk="Competitor trademark in logged-in Growth Engine UI."
        fix="ShopRally Growth Engine product name only — same section layout."
        files={["src/app/(app)/marketing/campaigns/page.tsx"]}
        liveHref="/marketing/campaigns"
        before={
          <>
            <p className="mb-2 font-semibold">Campaign templates</p>
            <p className="rounded border border-brand-red/30 bg-brand-red/5 p-2 text-brand-red">
              Pre-built campaigns like <strong>Tekmetric</strong> — customize audience, message, and
              schedule.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {["Win-back", "Reviews", "Seasonal"].map((t) => (
                <div key={t} className="rounded border bg-white p-2 text-[10px]">
                  {t}
                </div>
              ))}
            </div>
          </>
        }
        after={
          <>
            <p className="mb-2 font-semibold">Campaign templates</p>
            <p className="rounded border border-emerald-500/30 bg-emerald-50 p-2 text-emerald-900">
              Pre-built <strong>Growth Engine</strong> templates — customize audience, message, and
              schedule.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {["Win-back", "Reviews", "Seasonal"].map((t) => (
                <div key={t} className="rounded border bg-white p-2 text-[10px]">
                  {t}
                </div>
              ))}
            </div>
          </>
        }
      />

      <ReviewBlock
        id="HR-02"
        title="Vendor integrations intro"
        risk="“Tekmetric-style marketplace” implies competitor affiliation."
        fix="Neutral “integrated vendor hub” copy."
        files={["src/app/(app)/vendors/integrations/page.tsx"]}
        liveHref="/vendors/integrations"
        before={
          <p className="rounded border border-brand-red/30 bg-brand-red/5 p-2">
            Connect parts, tire, vehicle history, and payment vendors per shop — the{" "}
            <strong>Tekmetric-style marketplace</strong> for ordering and data.
          </p>
        }
        after={
          <p className="rounded border border-emerald-500/30 bg-emerald-50 p-2 text-emerald-900">
            Connect parts, tire, vehicle history, and payment vendors per shop — your shop&apos;s{" "}
            <strong>integrated vendor hub</strong> for ordering and vehicle data.
          </p>
        }
      />

      <ReviewBlock
        id="HR-03"
        title="Win-back campaign hero"
        risk="Names Tekmetric Growth Engine + AutoLeap in product hero."
        fix="Growth Engine win-back templates only."
        files={["src/components/marketing/campaigns/winback-campaign-page.tsx"]}
        liveHref="/marketing/campaigns/winback"
        before={
          <div className="rounded-lg bg-brand-navy p-3 text-white">
            <p className="text-xs font-bold">Win Back Customers</p>
            <p className="mt-1 text-[10px] text-white/85">
              …just like <strong>Tekmetric Growth Engine</strong> and <strong>AutoLeap</strong>{" "}
              follow-up campaigns.
            </p>
          </div>
        }
        after={
          <div className="rounded-lg bg-brand-navy p-3 text-white">
            <p className="text-xs font-bold">Win Back Customers</p>
            <p className="mt-1 text-[10px] text-white/85">
              …powered by <strong>Growth Engine</strong> win-back templates for lapsed customers.
            </p>
          </div>
        }
      />

      <ReviewBlock
        id="HR-05"
        title="Payment tab composite"
        risk="Documented Tekmetric parity: method grid + TRANSACTIONS tabs + green invoice CTA + summary labels."
        fix="Shorter method labels, renamed tabs/columns, navy share CTA, Payment summary / Sync to accounting."
        files={[
          "payment-methods-panel.tsx",
          "payment-transactions-panel.tsx",
          "payment-invoice-actions.tsx",
          "payment-ro-summary.tsx",
        ]}
        before={
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1">
              {["Cash Payment", "Credit or Debit", "Check Payment", "Other"].map((m) => (
                <div key={m} className="rounded border bg-white p-2 text-center text-[9px]">
                  {m}
                </div>
              ))}
            </div>
            <div className="text-[9px] font-bold uppercase text-brand-red">
              TRANSACTIONS | FAILED TRANSACTIONS
            </div>
            <div className="rounded bg-emerald-600 py-1 text-center text-[9px] font-semibold text-white">
              View &amp; Share Invoice
            </div>
            <p className="text-[9px]">Repair Order Summary · Post Repair Order</p>
          </div>
        }
        after={
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1">
              {["Cash", "Check", "Card", "Other payment"].map((m) => (
                <div key={m} className="rounded border bg-white p-2 text-center text-[9px]">
                  {m}
                </div>
              ))}
            </div>
            <div className="text-[9px] font-semibold text-emerald-800">
              Payment history | Declined
            </div>
            <div className="rounded bg-brand-navy py-1 text-center text-[9px] font-semibold text-white">
              Share invoice with customer
            </div>
            <p className="text-[9px]">Payment summary · Sync to accounting</p>
          </div>
        }
      />

      <ReviewBlock
        id="HR-06"
        title="Estimate sticky totals bar"
        risk="Build + GP% row + green Authorize footer matches documented Tekmetric composite."
        fix="Review + Margin label, Taxes before Subtotal, cyan Get approval button."
        files={["estimate-totals-bar.tsx", "ro-approve-actions.tsx"]}
        before={
          <div className="flex items-center gap-2 rounded-t bg-brand-navy p-2 text-[9px] text-white">
            <span className="rounded bg-white/10 px-2 py-1">Build</span>
            <span>GP% 42.1%</span>
            <span className="flex-1 text-center">Labor · Parts · … · Total</span>
            <span className="rounded bg-emerald-600 px-2 py-1 font-semibold">Authorize</span>
          </div>
        }
        after={
          <div className="flex items-center gap-2 rounded-t bg-brand-navy p-2 text-[9px] text-white">
            <span className="rounded bg-white/10 px-2 py-1">Review</span>
            <span>
              Margin
              <br />
              42.1%
            </span>
            <span className="flex-1 text-center">Labor · Parts · Taxes · Subtotal · Total</span>
            <span className="rounded bg-brand-light px-2 py-1 font-semibold text-brand-navy">
              Get approval
            </span>
          </div>
        }
      />

      <ReviewBlock
        id="HR-07"
        title="Matrix pricing pills"
        risk="Emerald “matrix applied” pills in Rate/Retail column — documented parity."
        fix="ShopRally cyan/navy pills: Auto labor / Auto parts pricing."
        files={["estimate-job-card.tsx"]}
        before={
          <div className="flex items-center gap-2">
            <span className="text-[10px]">Rate/Retail</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] text-emerald-700 ring-1 ring-emerald-200">
              Labor matrix applied
            </span>
          </div>
        }
        after={
          <div className="flex items-center gap-2">
            <span className="text-[10px]">Rate/Retail</span>
            <span className="rounded-md bg-brand-light/15 px-2 py-0.5 text-[9px] text-brand-navy ring-1 ring-brand-light/40">
              Auto labor pricing
            </span>
          </div>
        }
      />

      <ReviewBlock
        id="HR-08"
        title="Estimate jobs toolbar"
        risk="Exact Tekmetric stub labels Reorder Jobs / Reassign Labor & Parts."
        fix="Sort jobs / Assign work — same disabled stubs."
        files={["estimate-jobs-header.tsx"]}
        before={
          <div className="flex justify-between border-b pb-1 text-[9px] uppercase text-muted-foreground">
            <span>Jobs</span>
            <span className="text-brand-red">
              Reorder Jobs · Reassign Labor &amp; Parts · Collapse All
            </span>
          </div>
        }
        after={
          <div className="flex justify-between border-b pb-1 text-[9px] uppercase text-muted-foreground">
            <span>Jobs</span>
            <span className="text-emerald-800">Sort jobs · Assign work · Collapse All</span>
          </div>
        }
      />

      <ReviewBlock
        id="HR-09"
        title="Authorize estimate dialog"
        risk="Shop authorize & start work + Approve & start work dual-path wording."
        fix="In-shop approval + Start work now."
        files={["authorize-estimate-dialog.tsx"]}
        before={
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border p-2 text-[9px]">Send for customer approval</div>
            <div className="rounded border border-brand-red/40 bg-brand-red/5 p-2 text-[9px]">
              <strong>Shop authorize &amp; start work</strong>
              <br />
              [ Approve &amp; start work ]
            </div>
          </div>
        }
        after={
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border p-2 text-[9px]">Send for customer approval</div>
            <div className="rounded border border-emerald-500/40 bg-emerald-50 p-2 text-[9px]">
              <strong>In-shop approval</strong>
              <br />
              [ Start work now ]
            </div>
          </div>
        }
      />

      <ReviewBlock
        id="HR-10"
        title="RO context meta deck"
        risk="Dark gradient strip + white pill chips — Tekmetric-adjacent RO chrome."
        fix="Light ShopRally context strip, square chips, navy text."
        files={["globals.css (.ro-context-bar)", "ro-context-deck.tsx"]}
        before={
          <div className="rounded bg-gradient-to-b from-slate-800 to-brand-navy p-2 text-[9px] text-white">
            <div className="flex flex-wrap gap-1">
              {["RO#1021", "Plate ABC", "VIN …"].map((c) => (
                <span key={c} className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5">
                  {c}
                </span>
              ))}
            </div>
          </div>
        }
        after={
          <div className="rounded border border-border bg-slate-50 p-2 text-[9px] text-brand-navy">
            <div className="flex flex-wrap gap-1">
              {["RO#1021", "Plate ABC", "VIN …"].map((c) => (
                <span key={c} className="rounded-md border bg-white px-2 py-0.5 shadow-sm">
                  {c}
                </span>
              ))}
            </div>
          </div>
        }
      />

      <section className="rounded-xl border border-brand-light/50 bg-brand-light/10 p-5">
        <h2 className="text-sm font-semibold text-brand-navy">How to review</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Run <code className="text-xs">npm run dev</code> on{" "}
            <strong className="text-foreground">feature/master-crm</strong> (port 3004).
          </li>
          <li>
            Compare mockups on this page with{" "}
            <strong className="text-foreground">View live (planned)</strong> links.
          </li>
          <li>
            Approve one item at a time: reply{" "}
            <strong className="text-foreground">APPROVED HR-01</strong>, etc.
          </li>
        </ol>
        <p className="mt-4 flex items-center gap-2 text-sm">
          When all nine pass: <strong className="text-brand-navy">APPROVE BATCH 1</strong>
          <ArrowRight className="size-4" />
          then Batch 2 (role permissions).
        </p>
      </section>
    </div>
  );
}
