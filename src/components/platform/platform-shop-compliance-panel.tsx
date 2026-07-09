"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { OnboardingStep } from "@/server/platform/onboarding";

function fmtAuditWhen(d: Date) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PlatformShopCompliancePanel({
  complianceSteps,
  auditEvents,
  provisionMethod,
  legalEntityName,
}: {
  complianceSteps: OnboardingStep[];
  auditEvents: {
    id: string;
    eventType: string;
    actorEmail: string | null;
    method: string | null;
    createdAt: Date;
  }[];
  provisionMethod: string | null;
  legalEntityName: string | null;
}) {
  const done = complianceSteps.filter((s) => s.done).length;

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-brand-navy">Onboarding compliance</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {done}/{complianceSteps.length} complete
            {legalEntityName ? ` · ${legalEntityName}` : ""}
            {provisionMethod ? ` · via ${provisionMethod.replace("_", " ").toLowerCase()}` : ""}
          </p>
        </div>
        <Link
          href="/platform/onboarding"
          className="text-xs font-medium text-brand-navy hover:underline"
        >
          Full checklist →
        </Link>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {complianceSteps.map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-sm">
            {step.done ? (
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40" />
            )}
            <span className={cn(step.done && "text-muted-foreground")}>{step.label}</span>
          </li>
        ))}
      </ul>
      {auditEvents.length > 0 ? (
        <div className="mt-4 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Audit trail
          </p>
          <ul className="mt-2 space-y-1.5 text-xs">
            {auditEvents.map((ev) => (
              <li key={ev.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                <span className="font-medium text-foreground">{ev.eventType.replace(/_/g, " ")}</span>
                <span>{fmtAuditWhen(ev.createdAt)}</span>
                {ev.actorEmail ? <span>by {ev.actorEmail}</span> : null}
                {ev.method ? <span>({ev.method})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
