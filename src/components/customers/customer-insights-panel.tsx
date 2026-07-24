"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  CalendarPlus,
  Info,
  Loader2,
  Phone,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { CustomerInsightsView } from "@/server/customer-insights";
import { refreshCustomerInsights } from "@/server/actions/customer-insights";

const ACTION_ICON = {
  book: CalendarPlus,
  call: Phone,
  win_back: UserRound,
  follow_up: Sparkles,
  none: Sparkles,
} as const;

function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CustomerInsightsPanel({
  customerId,
  initial,
  compact = false,
  drawer = false,
  banner = false,
}: {
  customerId: string;
  initial: CustomerInsightsView;
  /** Tighter layout for the right customer drawer. */
  compact?: boolean;
  /** Expanded card for drawer Profile tab. */
  drawer?: boolean;
  /** Slim navy/light-blue banner for lifecycle Profile (A+2). */
  banner?: boolean;
}) {
  const [view, setView] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    setError(null);
    startTransition(async () => {
      const result = await refreshCustomerInsights(customerId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setView(result.data);
    });
  }

  const isDrawerStyle = drawer || compact;

  if (banner && drawer) {
    const ready = view.kind === "ready" ? view : null;
    const firstBullet = ready?.insights.bullets[0] ?? null;
    const extraBullets = ready ? Math.max(0, ready.insights.bullets.length - 1) : 0;
    const action =
      ready && ready.insights.suggestedAction.type !== "none"
        ? ready.insights.suggestedAction
        : null;

    return (
      <div className="rounded-md border border-brand-light/50 bg-gradient-to-r from-brand-light/20 via-brand-light/10 to-white px-3 py-2.5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-navy text-white">
            <Sparkles className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-brand-navy">AI Insights</p>
              {ready ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs text-brand-navy hover:bg-brand-navy/[0.06]"
                  disabled={pending}
                  onClick={refresh}
                >
                  {pending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3" />
                  )}
                  Refresh
                </Button>
              ) : null}
            </div>
            {error ? (
              <p className="mt-1 text-xs text-destructive">{error}</p>
            ) : null}
            {view.kind === "upgrade" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Included on {PLANS.ENTERPRISE.name}.{" "}
                <Link href="/billing" className="font-medium text-brand-navy hover:underline">
                  Upgrade
                </Link>
              </p>
            ) : null}
            {view.kind === "empty" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {view.reason === "no_ros"
                  ? "Insights appear after this customer has at least one repair order."
                  : "AI insights require platform AI configuration."}
              </p>
            ) : null}
            {view.kind === "error" ? (
              <p className="mt-1 text-xs text-destructive">{view.message}</p>
            ) : null}
            {firstBullet ? (
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-foreground/85">
                {firstBullet}
                {extraBullets > 0 ? ` · +${extraBullets} more` : null}
              </p>
            ) : null}
            {action ? (
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded bg-brand-navy px-1.5 py-0.5 font-semibold text-white">
                  {(() => {
                    const Icon = ACTION_ICON[action.type];
                    return <Icon className="size-3" />;
                  })()}
                  {action.label}
                </span>
                <span className="min-w-0 text-muted-foreground line-clamp-1">
                  {action.rationale}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "border-brand-light/40 bg-gradient-to-br from-brand-light/10 to-card",
        isDrawerStyle &&
          "rounded-lg border border-border bg-white bg-none py-0 shadow-none ring-0 ring-offset-0 [--card-spacing:--spacing(3)]",
      )}
    >
      {drawer ? (
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 px-4 py-3 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Sparkles className="size-4 text-brand-navy" />
            AI Insights
          </CardTitle>
          {view.kind === "ready" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-md border-border px-3 text-xs font-medium text-brand-navy hover:border-brand-navy/40 hover:bg-brand-light/15"
              disabled={pending}
              onClick={refresh}
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Refresh
            </Button>
          ) : null}
        </CardHeader>
      ) : !compact ? (
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-brand-navy" />
                AI insights
              </CardTitle>
              <CardDescription>
                Advisor-ready summary from repair history, inspections, and outreach — you decide what
                to do next.
              </CardDescription>
            </div>
            {view.kind === "ready" ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={pending}
                onClick={refresh}
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Refresh
              </Button>
            ) : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn("space-y-3", drawer ? "space-y-4 px-4 py-4" : compact && "space-y-2")}>
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {view.kind === "upgrade" ? (
          <div className={cn("rounded-lg border bg-card/80 text-sm", isDrawerStyle ? "p-3" : "p-4")}>
            <p className="font-medium text-brand-navy">
              {PLANS.ENTERPRISE.name} AI customer insights
            </p>
            <p className="mt-1 text-muted-foreground">
              Get suggested next steps from repair history, declined inspection items, and campaign
              activity — included on {PLANS.ENTERPRISE.name}.
            </p>
            <Button asChild size="sm" className="mt-3 bg-brand-navy hover:bg-brand-navy/90">
              <Link href="/billing">Upgrade plan</Link>
            </Button>
          </div>
        ) : null}

        {view.kind === "empty" && view.reason === "no_ros" ? (
          <p className={cn("text-muted-foreground", isDrawerStyle ? "text-xs" : "text-sm")}>
            Insights appear after this customer has at least one repair order.
          </p>
        ) : null}

        {view.kind === "empty" && view.reason === "ai_unconfigured" ? (
          <p className={cn("text-muted-foreground", isDrawerStyle ? "text-xs" : "text-sm")}>
            AI insights require platform AI configuration. Contact support if this persists.
          </p>
        ) : null}

        {view.kind === "error" ? (
          <p className={cn("text-destructive", isDrawerStyle ? "text-xs" : "text-sm")}>{view.message}</p>
        ) : null}

        {view.kind === "ready" ? (
          <>
            <ul
              className={cn(
                drawer
                  ? "space-y-2.5 text-sm text-brand-navy"
                  : compact
                    ? "grid min-w-0 flex-1 gap-x-5 gap-y-1.5 text-xs sm:grid-cols-2"
                    : "space-y-2 text-sm",
              )}
            >
              {view.insights.bullets.map((bullet, i) => (
                <li key={i} className="flex gap-2.5">
                  {drawer ? (
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-light/40">
                      <Info className="size-2.5 text-brand-navy" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "shrink-0 bg-brand-navy",
                        compact ? "mt-1.5 size-1.5 rounded-none" : "mt-2 size-1.5 rounded-full",
                      )}
                    />
                  )}
                  <span className={drawer ? "leading-snug" : undefined}>{bullet}</span>
                </li>
              ))}
            </ul>

            {compact && !drawer ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 gap-1 rounded-none border-border px-2 text-xs text-brand-navy hover:border-brand-navy/40"
                disabled={pending}
                onClick={refresh}
              >
                {pending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
                Refresh
              </Button>
            ) : null}

            {view.insights.suggestedAction.type !== "none" ? (
              drawer ? (
                <div className="rounded-lg bg-brand-light/20 px-4 py-3">
                  <div className="flex gap-3">
                    {(() => {
                      const Icon = ACTION_ICON[view.insights.suggestedAction.type];
                      return (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-navy">
                          <Icon className="size-4 text-white" />
                        </span>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-navy">
                        {view.insights.suggestedAction.label}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {view.insights.suggestedAction.rationale}
                      </p>
                    </div>
                  </div>
                </div>
              ) : compact ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#DDE5EF] pt-2">
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B7295]">
                    Next step
                  </span>
                  {(() => {
                    const Icon = ACTION_ICON[view.insights.suggestedAction.type];
                    return (
                      <span className="inline-flex shrink-0 items-center gap-1 bg-[#0B1F3B] px-2 py-0.5 text-[10px] font-semibold text-white">
                        <Icon className="size-3" />
                        {view.insights.suggestedAction.label}
                      </span>
                    );
                  })()}
                  <span className="min-w-0 flex-1 basis-48 text-xs text-[#5B7295]">
                    {view.insights.suggestedAction.rationale}
                  </span>
                </div>
              ) : (
                <div className="rounded-lg border bg-card/80 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Suggested next step
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-start gap-2">
                    {(() => {
                      const Icon = ACTION_ICON[view.insights.suggestedAction.type];
                      return (
                        <span className="inline-flex items-center gap-1 bg-brand-navy px-2 py-0.5 text-xs font-medium text-white">
                          <Icon className="size-3" />
                          {view.insights.suggestedAction.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {view.insights.suggestedAction.rationale}
                  </p>
                </div>
              )
            ) : null}
            {!isDrawerStyle ? (
              <p
                className={cn(
                  "text-xs text-muted-foreground",
                  view.fromCache ? "" : "text-brand-navy/80",
                )}
              >
                {view.fromCache ? "Cached" : "Generated"} ·{" "}
                {formatGeneratedAt(view.insights.generatedAt)} · refreshes at most once per 24h unless
                you click Refresh
              </p>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
