"use client";

import Link from "next/link";
import { Check, Shield, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const CHANGES = [
  {
    ok: true,
    title: "Single auth path with safe dev fallback",
    detail: "Clerk when keys exist; stub platform admin only when Clerk is off.",
  },
  {
    ok: true,
    title: "Tenancy: org membership first, cookie for operators",
    detail: "Shop staff resolve from Clerk org + membership; platform admin uses validated cookie hop.",
  },
  {
    ok: true,
    title: "Route + nav permission gates",
    detail: "Layout blocks routes; CRM nav filtered by employee permissions.",
  },
  {
    ok: true,
    title: "Operator mode stays explicit",
    detail: "PlatformShopContextBar + audit on shop entry unchanged.",
  },
  {
    ok: true,
    title: "Plan vs permission split",
    detail: "Growth routes plan-gated; day-to-day CRM permission-gated.",
  },
];

export function Task02AuthTenancyReview() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <header className="space-y-2" data-planned-change="CLERK-02">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-emerald-600 text-emerald-700">
            Baseline on main
          </Badge>
          <Link
            href="/design-review/batch-02-rbac"
            className="text-xs font-semibold text-brand-navy underline-offset-2 hover:underline"
          >
            Batch 2 review (RO tabs) →
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Auth, tenancy & permissions
        </h1>
        <p className="text-sm text-muted-foreground">
          Task 2 guards are live: membership-first tenancy, route gates, nav filtering, and plan checks
          on Growth routes.
        </p>
      </header>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="size-5 text-brand-navy" />
          <h2 className="text-sm font-semibold text-brand-navy">What was implemented</h2>
        </div>
        <ul className="space-y-3">
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
        <p className="mt-5 text-sm text-muted-foreground">
          Key files: <code className="text-xs">lib/crm-access.ts</code>,{" "}
          <code className="text-xs">server/crm-access.ts</code>,{" "}
          <code className="text-xs">lib/shop.ts</code>,{" "}
          <code className="text-xs">app/(app)/layout.tsx</code>.{" "}
          <Link
            href="/design-review/task-03-settings"
            className="font-semibold text-brand-navy underline-offset-2 hover:underline"
          >
            Continue → Task 3 Settings IA
          </Link>
        </p>
      </section>
    </div>
  );
}
