import Link from "next/link";
import { ArrowRight, CheckCircle2, Scale, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { designModeHref } from "@/lib/design-mode-merged-crm";

type ReviewTaskStatus = "done" | "review";

const TASKS: {
  title: string;
  href: string;
  status: ReviewTaskStatus;
  description?: string;
}[] = [
  {
    title: "Batch 1 — Trade dress (HR-01 … HR-10)",
    href: "/design-review/trade-dress",
    status: "done",
    description: "Approved 2026-07-03 — legal differentiation copy & composites.",
  },
  {
    title: "Batch 2 — RBAC (RO tab gates)",
    href: "/design-review/batch-02-rbac",
    status: "done",
    description: "Approved 2026-07-03 — tab visibility + deep-link guards.",
  },
  {
    title: "Batch 3 — RO workspace UX",
    href: "/design-review/batch-03-ro-workspace",
    status: "done",
    description: "Approved 2026-07-03 — focus mode, intake, specs sidebar.",
  },
  {
    title: "Batch 4 — Master CRM platform",
    href: "/platform/review/batch-04",
    status: "done",
    description: "Approved 2026-07-03 — Stripe, billing, add-shop, live review iframe.",
  },
  {
    title: "Batch 5 — Create RO intake",
    href: "/design-review/batch-05-ro-intake",
    status: "done",
    description: "Approved 2026-07-03 — FAB slide-over, intake form, live CRM tour.",
  },
  {
    title: "Batch 6 — Clerk landing & merge prep",
    href: "/design-review/batch-06-clerk-merge",
    status: "done",
    description: "Approved 2026-07-03 — Clerk /home landing, merge to main complete.",
  },
  { title: "Task 1 — Navigation & IA", href: "/design-review/task-01-nav", status: "done" as const },
  { title: "Task 2 — Auth baseline (on main)", href: "/design-review/task-02-auth", status: "done" as const },
  { title: "Task 3 — Settings IA", href: "/design-review/task-03-settings", status: "done" as const },
  { title: "Task 4 — RO workspace UX", href: "/design-review/task-04-ro-workspace", status: "done" as const },
  {
    title: "Estimate-first intake (v2 lab)",
    href: designModeHref("/design-review/estimate-first-intake"),
    status: "review" as const,
    description: "AutoLeap-speed estimate shell — full CRM subforms, required concern + odometer.",
  },
  {
    title: "Estimate Building Lab",
    href: designModeHref("/design-review/estimate-building"),
    status: "review" as const,
    description: "Blended Tekmetric + AutoLeap estimate builder — isolated until merge approval.",
  },
];

export const metadata = { title: "Design review — ShopRally" };

export default function DesignReviewIndexPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <header className="space-y-2">
        <Badge variant="outline" className="border-brand-navy text-brand-navy">
          Design review hub
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Review queue</h1>
        <p className="text-sm text-muted-foreground">
          All batches approved and merged to <code className="text-xs">main</code> (2026-07-03).{" "}
          <Link href="/design-review/crm-inventory" className="font-medium text-brand-navy hover:underline">
            CRM inventory tour
          </Link>
          {" · "}
          <Link href="/design-review/platform-inventory" className="font-medium text-brand-navy hover:underline">
            Platform inventory tour
          </Link>
          {" · "}
          <Link href="/design-mode?design=open" className="font-medium text-brand-navy hover:underline">
            Open merged CRM in design mode
          </Link>
          {" · "}
          <Link href="/design-review/batch-06-clerk-merge" className="font-medium text-brand-navy hover:underline">
            Batch 6 archive
          </Link>
          .
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/design-review/crm-inventory"
          className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:border-brand-navy/40 hover:shadow-md"
        >
          <p className="text-sm font-bold text-brand-navy">CRM inventory tour</p>
          <p className="mt-1 text-sm text-muted-foreground">
            All shells and ports — Shop CRM, Platform, 3030, Intake Lab.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-navy">
            Open tour <ArrowRight className="size-4" aria-hidden />
          </span>
        </Link>
        <Link
          href="/design-review/platform-inventory"
          className="rounded-xl border-2 border-brand-navy/35 bg-brand-light/10 p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-bold text-brand-navy">Platform inventory tour</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Every Master CRM route with clickable Open → links to localhost:3004.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-navy">
            Open tour <ArrowRight className="size-4" aria-hidden />
          </span>
        </Link>
      </section>

      <ul className="divide-y rounded-xl border bg-card">
        {TASKS.map((task) => (
          <li key={task.href}>
            <Link
              href={task.href}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
            >
              {task.status === "review" ? (
                <Shield className="size-5 shrink-0 text-brand-navy" aria-hidden />
              ) : task.status === "done" ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Scale className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{task.title}</p>
                {"description" in task && task.description ? (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                ) : null}
              </div>
              {task.status === "review" ? (
                <Badge className="shrink-0 bg-brand-navy text-white">Review now</Badge>
              ) : (
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
