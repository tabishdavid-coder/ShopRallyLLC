"use client";

import Link from "next/link";
import { Activity, FileText, Globe, Radar, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSeoAutopilot } from "@/components/marketing/seo-automation/seo-autopilot-context";
import { formatWhen, jobTypeLabel } from "@/components/marketing/seo-automation/seo-autopilot-utils";

function runIcon(jobType: string) {
  if (jobType === "CONTENT") return Sparkles;
  if (jobType === "AUDIT") return Radar;
  return Activity;
}

export function SeoAutopilotActivityPanel() {
  const { admin, website, siteTraffic } = useSeoAutopilot();

  if (!admin.hasFeature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
          <CardDescription>Upgrade to see autopilot run history.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/billing">Upgrade plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const runs = admin.recentRuns;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4 text-brand-navy" />
            Indexing &amp; discovery
          </CardTitle>
          <CardDescription>
            How ShopRally tells Google about your site — sitemap submission and indexing requests run on
            publish and after content updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="font-medium">Site status</p>
            <p className="mt-1 text-muted-foreground">
              {website.published ? "Published — visible to search engines" : "Unpublished — not indexed yet"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="font-medium">Search Console</p>
            <p className="mt-1 text-muted-foreground">
              {admin.gsc.connected ? "Connected — sitemap auto-submitted" : "Not connected"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="font-medium">Sitemap</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {website.siteUrl ? `${website.siteUrl}/sitemap.xml` : "—"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="font-medium">Last content run</p>
            <p className="mt-1 text-muted-foreground">
              {admin.settings.lastContentRunAt
                ? formatWhen(admin.settings.lastContentRunAt)
                : "Not yet — bi-weekly on 1st & 15th"}
            </p>
          </div>
          {siteTraffic.ga4Configured ? (
            <div className="rounded-lg border border-brand-light/40 bg-brand-light/10 px-3 py-2.5 sm:col-span-2">
              <p className="font-medium text-brand-navy">GA4 tracking active</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Measurement ID {siteTraffic.ga4MeasurementId} on your microsite.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-brand-navy" />
            What ShopRally ran for you
          </CardTitle>
          <CardDescription>
            Audits, content updates, and indexing — a transparent log of managed SEO work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No runs yet. Enable autopilot on a site or wait for the weekly schedule.
            </p>
          ) : (
            <ul className="space-y-0 divide-y">
              {runs.map((run) => {
                const Icon = runIcon(run.jobType);
                return (
                  <li key={run.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{jobTypeLabel(run.jobType)}</p>
                        <Badge variant="outline" className="font-normal">
                          {run.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatWhen(run.finishedAt)}</span>
                      </div>
                      {run.seoScore != null ? (
                        <p className="mt-1 text-sm text-muted-foreground">SEO score: {run.seoScore}%</p>
                      ) : null}
                      {run.gscClicks != null ? (
                        <p className="text-xs text-muted-foreground">
                          GSC (28d): {run.gscClicks} clicks · {run.gscImpressions} impressions
                        </p>
                      ) : null}
                      {run.contentSummary ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {run.contentSummary.contentSource === "ai" ? "AI-enhanced" : "Template"}
                          {run.contentSummary.servicesAdded
                            ? ` · ${run.contentSummary.servicesAdded} service(s) added`
                            : ""}
                          {run.contentSummary.keywordsAdded
                            ? ` · ${run.contentSummary.keywordsAdded} keyword(s)`
                            : ""}
                          {run.contentSummary.metaUpdated ? " · meta updated" : ""}
                        </p>
                      ) : null}
                      {run.openItems.length > 0 ? (
                        <p className="mt-1 text-xs text-amber-800">
                          Open: {run.openItems.slice(0, 2).join(" · ")}
                          {run.openItems.length > 2 ? " …" : ""}
                        </p>
                      ) : null}
                      {run.error ? <p className="mt-1 text-xs text-destructive">{run.error}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-brand-navy" />
            Scheduled jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="font-medium">Weekly audit</p>
            <p className="text-xs text-muted-foreground">Monday 06:00 UTC</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="font-medium">Content autopilot</p>
            <p className="text-xs text-muted-foreground">1st &amp; 15th · 07:00 UTC</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="font-medium">Monthly report</p>
            <p className="text-xs text-muted-foreground">1st of month · email</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
