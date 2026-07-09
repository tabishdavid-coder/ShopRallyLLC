"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarPlus, Loader2, Phone, RefreshCw, Sparkles, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
}: {
  customerId: string;
  initial: CustomerInsightsView;
  /** Tighter layout for the right customer drawer. */
  compact?: boolean;
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

  return (
    <Card
      className={cn(
        "border-brand-light/40 bg-gradient-to-br from-brand-light/10 to-card",
        compact && "border-brand-light/30 shadow-none",
      )}
    >
      {!compact ? (
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
      <CardContent className={cn("space-y-3", compact && "space-y-2 p-3 pt-0")}>
        {compact && view.kind === "ready" ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
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
          </div>
        ) : null}
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {view.kind === "upgrade" ? (
          <div className={cn("rounded-lg border bg-card/80 text-sm", compact ? "p-3" : "p-4")}>
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
          <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
            Insights appear after this customer has at least one repair order.
          </p>
        ) : null}

        {view.kind === "empty" && view.reason === "ai_unconfigured" ? (
          <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
            AI insights require platform AI configuration. Contact support if this persists.
          </p>
        ) : null}

        {view.kind === "error" ? (
          <p className={cn("text-destructive", compact ? "text-xs" : "text-sm")}>{view.message}</p>
        ) : null}

        {view.kind === "ready" ? (
          <>
            <ul className={cn("space-y-2", compact ? "text-xs" : "text-sm")}>
              {view.insights.bullets.map((bullet, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-navy" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            {view.insights.suggestedAction.type !== "none" ? (
              <div className={cn("rounded-lg border bg-card/80", compact ? "p-2.5" : "p-3")}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggested next step
                </p>
                <div className="mt-1.5 flex flex-wrap items-start gap-2">
                  {(() => {
                    const Icon = ACTION_ICON[view.insights.suggestedAction.type];
                    return (
                      <Badge className="gap-1 bg-brand-navy text-white hover:bg-brand-navy/90">
                        <Icon className="size-3" />
                        {view.insights.suggestedAction.label}
                      </Badge>
                    );
                  })()}
                </div>
                <p className={cn("mt-1.5 text-muted-foreground", compact ? "text-xs" : "text-sm")}>
                  {view.insights.suggestedAction.rationale}
                </p>
              </div>
            ) : null}
            {!compact ? (
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
