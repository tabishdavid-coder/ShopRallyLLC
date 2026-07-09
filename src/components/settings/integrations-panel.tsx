import Link from "next/link";
import { CheckCircle2, CircleDashed, ExternalLink, FlaskConical, type LucideIcon } from "lucide-react";

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

export function IntegrationsPanel({ statuses }: { statuses: IntegrationStatus[] }) {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Connected services. Each runs in a safe mock/fallback mode until its credentials are set in the
          environment, so the app stays functional while you onboard providers.{" "}
          <a href="/vendors/integrations" className="font-medium text-brand-navy hover:underline">
            Vendor integrations hub →
          </a>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {statuses.map((s) => {
          const m = STATE_META[s.state];
          return (
            <div
              key={s.name}
              className="rounded-lg border bg-card p-4"
              data-planned-change={s.reviewMarkerId}
            >
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
                <p className="mt-2 font-mono text-[11px] text-muted-foreground/80">{s.env.join(", ")}</p>
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
          );
        })}
      </div>
    </div>
  );
}
