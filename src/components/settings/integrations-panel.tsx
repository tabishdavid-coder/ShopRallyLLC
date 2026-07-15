import Link from "next/link";
import {
  Blocks,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";

import { SettingsHero } from "@/components/settings/settings-hero";
import { PLANS } from "@/lib/plans";

export type IntegrationState = "connected" | "mock" | "inactive";

export type IntegrationStatus = {
  name: string;
  category: string;
  state: IntegrationState;
  detail: string;
  env: string[];
  docsHref?: string;
  /** Release review tour highlight id (e.g. CLERK-03). */
  reviewMarkerId?: string;
};

const STATE_META: Record<IntegrationState, { label: string; cls: string; icon: LucideIcon }> = {
  connected: { label: "Connected", cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  mock: { label: "Mock / fallback", cls: "bg-amber-100 text-amber-800", icon: FlaskConical },
  inactive: { label: "Not configured", cls: "bg-slate-100 text-slate-600", icon: CircleDashed },
};

export function IntegrationsPanel({
  statuses,
  planName,
  isCore,
}: {
  statuses: IntegrationStatus[];
  planName?: string;
  isCore?: boolean;
}) {
  const connectedCount = statuses.filter((s) => s.state === "connected").length;

  return (
    <div className="space-y-5">
      <SettingsHero
        icon={Blocks}
        title="Integrations"
        description={
          isCore
            ? "Core includes free NHTSA VIN decode and email — Pro adds plate lookup, PartsTech, SMS, and Stripe."
            : "Connected services that power VIN decode, parts, payments, messaging, and auth."
        }
        meta={
          <span className="rounded-full bg-white/15 px-2 py-0.5 font-medium">
            {connectedCount} of {statuses.length} connected
          </span>
        }
      />

      <p className="text-sm text-muted-foreground">
        {isCore ? (
          <>
            Your {planName ?? "Core"} plan shows integrations included with your subscription. Upgrade to{" "}
            {PLANS.PROFESSIONAL.name} for PartsTech, two-way SMS, and online payments.{" "}
          </>
        ) : (
          <>
            Each service runs in a safe mock/fallback mode until its credentials are set in the environment, so the
            app stays functional while you onboard providers.{" "}
          </>
        )}
        <a href="/vendors/integrations" className="link-subtle font-medium">
          Vendor integrations hub →
        </a>
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {statuses.map((s) => (
          <IntegrationCard key={s.name} status={s} />
        ))}
      </div>
    </div>
  );
}

function IntegrationCard({ status: s }: { status: IntegrationStatus }) {
  const m = STATE_META[s.state];
  return (
    <div
      className="flex gap-3 rounded-lg border bg-card p-4"
      data-planned-change={s.reviewMarkerId}
    >
      <span
        className={
          "flex size-9 shrink-0 items-center justify-center rounded-lg " +
          (s.state === "connected"
            ? "bg-emerald-50 text-emerald-600"
            : s.state === "mock"
              ? "bg-amber-50 text-amber-600"
              : "bg-muted text-muted-foreground")
        }
      >
        <span className="text-sm font-bold">{s.name.slice(0, 1)}</span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium">{s.name}</div>
            <div className="text-xs text-muted-foreground">{s.category}</div>
          </div>
          <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
            <m.icon className="size-3.5" /> {m.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{s.detail}</p>
        {s.env.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {s.env.map((e) => (
              <code
                key={e}
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {e}
              </code>
            ))}
          </div>
        ) : null}
        {s.docsHref ? (
          <Link
            href={s.docsHref}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-navy hover:underline"
          >
            Setup guide
            <ExternalLink className="size-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
