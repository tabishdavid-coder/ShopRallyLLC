"use client";

import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RO_TABS = ["Overview", "Estimate", "Work in Progress", "Payment", "Membership"];

function ShellMock({
  variant,
  title,
  detail,
}: {
  variant: "current" | "proposed";
  title: string;
  detail: string;
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

      <div className="min-h-[200px] bg-muted/20 p-2 text-[9px]">
        <div className="mb-2 h-5 rounded bg-brand-navy/90" aria-hidden title="CRM header" />

        <div className="flex gap-2">
          {/* Dashboard sidebar — current only */}
          {!isProposed ? (
            <div className="w-[72px] shrink-0 border-r border-brand-navy/30 bg-brand-navy/95 p-1.5 text-white/75">
              <p className="mb-1 text-[7px] font-bold text-brand-light">Dashboard</p>
              {["Overview", "Job Board", "Workflow", "Messages"].map((item) => (
                <div key={item} className="mb-0.5 truncate rounded px-1 py-0.5 text-[7px]">
                  {item}
                </div>
              ))}
              <p className="mt-1 text-[6px] text-brand-red">← competes with RO</p>
            </div>
          ) : null}

          {/* RO workspace */}
          <div className="min-w-0 flex-1 p-2">
            <div className="mb-1.5 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <div className="border-b bg-brand-navy/90 px-2 py-1.5 text-white">
                <p className="font-semibold">RO #1021 · Smith · 2019 Honda Accord</p>
                <p className="text-[7px] text-white/70">
                  {isProposed ? "Odometer · lifecycle only" : "Odometer · lifecycle · canned jobs · parts hub · …"}
                </p>
              </div>
              <div className="flex gap-0.5 border-b bg-muted/40 px-2 py-1">
                {RO_TABS.map((tab) => (
                  <span
                    key={tab}
                    className={cn(
                      "rounded px-1.5 py-0.5",
                      tab === "Estimate" ? "bg-brand-navy text-white" : "text-muted-foreground",
                      !isProposed && tab === "Payment" && "ring-1 ring-brand-red/40",
                    )}
                  >
                    {tab}
                    {!isProposed && tab === "Payment" ? (
                      <span className="ml-0.5 text-[6px] text-brand-red">/payment</span>
                    ) : null}
                  </span>
                ))}
              </div>
              <div className="grid gap-1 p-2 md:grid-cols-[140px_1fr]">
                <div className="rounded border border-dashed border-border bg-muted/30 p-1.5 text-[7px]">
                  Order context
                  <br />
                  RO · Vehicle · Customer chips
                </div>
                <div className="rounded border border-dashed border-border bg-white/80 p-2 text-[7px] text-muted-foreground">
                  Tab content (estimate jobs, WIP, etc.)
                </div>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground">
              <span className="font-semibold text-brand-navy">{title}</span> — {detail}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const CHANGES = [
  {
    ok: true,
    title: "RO focus mode in CRM shell",
    detail:
      "Hide dashboard sidebar + mobile pills on /repair-orders/[id]/* (keep header). More room for context deck + estimate builder.",
  },
  {
    ok: true,
    title: "Wire RoIntakeProvider in CrmShell",
    detail:
      "Load intake config once in app layout; FAB / Job Board / customer detail open the slide-over instead of dead optional hooks.",
  },
  {
    ok: true,
    title: "Slim estimate hero",
    detail:
      "Remove RoEstimateHeroToolbar from layout hero — odometer + lifecycle only. Estimate actions stay in the work area (already there).",
  },
  {
    ok: true,
    title: "Tab permissions",
    detail:
      "Hide Estimate / Work in Progress / Payment steps when user lacks estimate.view, wip.view, payments.view (server passes allowed segments).",
  },
  {
    ok: true,
    title: "Four-step phase stepper",
    detail:
      "Overview → Estimate → Work in Progress → Payment. Inspections removed from stepper (estimate workspace inner tabs). /inspections URL still works.",
  },
  {
    ok: false,
    title: "Out of scope for Task 4",
    detail:
      "Full estimate data-fetch refactor, RO print layout, or replacing context deck with a drawer on desktop.",
  },
];

export function Task04RoWorkspaceReview() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-brand-navy text-brand-navy">
            Audit Task 4 of 16
          </Badge>
          <Link
            href="/design-review"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            ← All reviews
          </Link>
          <Link
            href="/design-review/task-03-settings"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Task 3 (done)
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Repair order workspace
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          The RO shell (context deck + workspace panel + tabs) is in good shape after the ShopRally
          redesign. Task 4 fixes chrome conflicts with the CRM shell, intake wiring, hero crowding,
          and tab access — not a full estimate rebuild.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-navy">
          A — CRM shell vs RO focus
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ShellMock
            variant="current"
            title="Dashboard sidebar stays visible"
            detail="Three navigation layers: CRM header, dashboard sidebar, RO tabs."
          />
          <ShellMock
            variant="proposed"
            title="RO focus mode"
            detail="Header only + full-width RO workspace (same pattern as /workflow full bleed)."
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-navy">
          B — Estimate tab hero
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ShellMock
            variant="current"
            title="Crowded hero toolbar"
            detail="Canned jobs, parts hub, labor guide duplicated between hero and estimate work area."
          />
          <ShellMock
            variant="proposed"
            title="Minimal hero"
            detail="Lifecycle + odometer in hero; builder toolbar only in the jobs column."
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
          Reply <strong className="text-brand-navy">Approve Task 4</strong>
          <ArrowRight className="size-4" />
          we implement shell focus mode + intake + tab gates, then move to Task 5 (Growth Engine).
        </p>
      </section>
    </div>
  );
}
