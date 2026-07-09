"use client";

import Link from "next/link";
import { ArrowRight, Download, ExternalLink, Globe, MousePointerClick, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { needsGa4GoogleReconnect } from "@/lib/seo-ga4-reconnect";
import { SEO_AUTOPILOT_BASE } from "@/lib/seo-autopilot-nav";
import { SeoBusinessImpactSection } from "@/components/marketing/seo-automation/seo-business-impact";
import { SeoGoogleReconnectBanner } from "@/components/marketing/seo-automation/seo-google-reconnect-banner";
import { useSeoAutopilot } from "@/components/marketing/seo-automation/seo-autopilot-context";
import {
  SeoGa4OrganicChart,
  SeoGa4SessionsChart,
} from "@/components/marketing/seo-automation/seo-ga4-charts";
import {
  SeoImpressionsChart,
  SeoSearchTrendChart,
} from "@/components/marketing/seo-automation/seo-search-charts";
import { deltaLabel } from "@/components/marketing/seo-automation/seo-autopilot-utils";
import { exportSeoAnalyticsCsv } from "@/lib/seo-analytics-export";

function SearchSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Search className="size-4 text-brand-navy" />
          Google Search performance
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Clicks and impressions from Search Console — how people find you on Google.
        </p>
      </div>
      {children}
    </div>
  );
}

export function SeoAutopilotAnalyticsPanel() {
  const { admin, analytics, ga4Analytics, crmOutcomes, siteTraffic } = useSeoAutopilot();

  if (!admin.hasFeature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search analytics</CardTitle>
          <CardDescription>Upgrade to access SEO Autopilot analytics.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/billing">Upgrade plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const ctrPct = analytics.totals ? `${(analytics.totals.ctr * 100).toFixed(1)}%` : "—";
  const position = analytics.totals ? analytics.totals.position.toFixed(1) : "—";
  const showGa4Reconnect = needsGa4GoogleReconnect({
    gscConnected: admin.gsc.connected,
    ga4Configured: siteTraffic.ga4Configured,
    ga4Available: ga4Analytics.available,
  });

  return (
    <div className="space-y-8">
      <SeoBusinessImpactSection outcomes={crmOutcomes} siteTraffic={siteTraffic} />

      {showGa4Reconnect ? <SeoGoogleReconnectBanner /> : null}

      {!analytics.available ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search traffic</CardTitle>
            <CardDescription>{analytics.reason}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-brand-navy hover:bg-brand-navy/90">
              <Link href={`${SEO_AUTOPILOT_BASE}/sites`}>
                Set up Search Console
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <SearchSection>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportSeoAnalyticsCsv({ analytics, ga4Analytics, crmOutcomes })}
            >
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
          </div>

          {analytics.reason ? (
            <p className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-sm text-amber-950">
              {analytics.reason}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Clicks (28d)</CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl tabular-nums">
                  <MousePointerClick className="size-5 text-brand-navy" />
                  {analytics.totals?.clicks.toLocaleString()}
                </CardTitle>
              </CardHeader>
              {deltaLabel(analytics.clicksDeltaPct) ? (
                <CardContent className="pt-0 text-xs font-medium text-brand-navy">
                  {deltaLabel(analytics.clicksDeltaPct)}
                </CardContent>
              ) : null}
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Impressions (28d)</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {analytics.totals?.impressions.toLocaleString()}
                </CardTitle>
              </CardHeader>
              {deltaLabel(analytics.impressionsDeltaPct) ? (
                <CardContent className="pt-0 text-xs font-medium text-brand-navy">
                  {deltaLabel(analytics.impressionsDeltaPct)}
                </CardContent>
              ) : null}
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Click-through rate</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{ctrPct}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg. position</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{position}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground">Lower is better</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SeoSearchTrendChart analytics={analytics} />
            <SeoImpressionsChart analytics={analytics} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top search queries</CardTitle>
                <CardDescription>What people typed before clicking your site.</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topQueries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No query data yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Query</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.topQueries.map((row) => (
                        <TableRow key={row.query}>
                          <TableCell className="font-medium">{row.query}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.clicks}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top landing pages</CardTitle>
                <CardDescription>Pages that earned the most search clicks.</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topPages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No page data yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.topPages.map((row) => (
                        <TableRow key={row.page}>
                          <TableCell className="max-w-[200px] truncate font-mono text-xs" title={row.page}>
                            {row.page.replace(/^https?:\/\/[^/]+/, "") || "/"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.clicks}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground">
            Google Search Console
            {analytics.cachedAt
              ? ` · cached ${new Date(analytics.cachedAt).toLocaleString()}`
              : ""}
            {analytics.propertyUrl ? (
              <>
                {" "}
                · <span className="font-mono">{analytics.propertyUrl}</span>
              </>
            ) : null}
          </p>
        </SearchSection>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Globe className="size-4 text-brand-navy" />
            Website sessions (GA4)
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            All site visits and organic search sessions from Google Analytics.
          </p>
        </div>

        {!ga4Analytics.available ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Site traffic</CardTitle>
              <CardDescription>{ga4Analytics.reason}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {!siteTraffic.ga4Configured ? (
                <Button asChild className="bg-brand-navy hover:bg-brand-navy/90">
                  <Link href="/marketing/website">
                    Add GA4 in ShopSite
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  {showGa4Reconnect ? (
                    <SeoGoogleReconnectBanner compact onError={() => undefined} />
                  ) : (
                    <Button asChild variant="outline">
                      <Link href={`${SEO_AUTOPILOT_BASE}/sites`}>
                        Connect Google on Sites tab
                        <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  )}
                </>
              )}
              {ga4Analytics.embedUrl ? (
                <Button asChild variant="ghost" size="sm">
                  <a href={ga4Analytics.embedUrl} target="_blank" rel="noopener noreferrer">
                    Open Google Analytics
                    <ExternalLink className="ml-2 size-3.5" />
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <>
            {ga4Analytics.reason ? (
              <p className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-sm text-amber-950">
                {ga4Analytics.reason}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Sessions (28d)</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {ga4Analytics.totals?.sessions.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                {deltaLabel(ga4Analytics.sessionsDeltaPct) ? (
                  <CardContent className="pt-0 text-xs font-medium text-brand-navy">
                    {deltaLabel(ga4Analytics.sessionsDeltaPct)}
                  </CardContent>
                ) : null}
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Organic sessions (28d)</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {ga4Analytics.totals?.organicSessions.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                {deltaLabel(ga4Analytics.organicDeltaPct) ? (
                  <CardContent className="pt-0 text-xs font-medium text-brand-navy">
                    {deltaLabel(ga4Analytics.organicDeltaPct)}
                  </CardContent>
                ) : null}
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SeoGa4SessionsChart ga4={ga4Analytics} />
              <SeoGa4OrganicChart ga4={ga4Analytics} />
            </div>

            <p className="text-xs text-muted-foreground">
              Google Analytics
              {ga4Analytics.measurementId ? (
                <> · measurement ID {ga4Analytics.measurementId}</>
              ) : null}
              {ga4Analytics.cachedAt
                ? ` · cached ${new Date(ga4Analytics.cachedAt).toLocaleString()}`
                : ""}
              {ga4Analytics.embedUrl ? (
                <>
                  {" "}
                  ·{" "}
                  <a
                    href={ga4Analytics.embedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-navy hover:underline"
                  >
                    Open in GA4
                  </a>
                </>
              ) : null}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
