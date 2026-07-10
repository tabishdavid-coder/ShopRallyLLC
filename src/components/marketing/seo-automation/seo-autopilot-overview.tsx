"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  MousePointerClick,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GROWTH_PRODUCTS } from "@/lib/growth-engine-brand";
import { PLANS } from "@/lib/plans";
import { SEO_AUTOPILOT_BASE } from "@/lib/seo-autopilot-nav";
import { SeoBusinessImpactSection } from "@/components/marketing/seo-automation/seo-business-impact";
import { useSeoAutopilot } from "@/components/marketing/seo-automation/seo-autopilot-context";
import { SeoSetupWizard } from "@/components/marketing/seo-automation/seo-setup-wizard";
import { deltaLabel, formatWhen, scoreClass } from "@/components/marketing/seo-automation/seo-autopilot-utils";

function KpiTile({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint || delta ? (
        <CardContent className="pt-0 text-xs text-muted-foreground">
          {delta ? <p className="font-medium text-brand-navy">{delta}</p> : null}
          {hint ? <p className={delta ? "mt-1" : ""}>{hint}</p> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function SeoAutopilotOverviewPanel() {
  const { admin, analytics, crmOutcomes, siteTraffic, website } = useSeoAutopilot();

  if (!admin.hasFeature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Growth Engine SEO</CardTitle>
          <CardDescription>
            Automate weekly audits and optimization for your shop websites. Included on{" "}
            {PLANS.ENTERPRISE.name}; available as a $49/mo add-on on {PLANS.PROFESSIONAL.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/billing">Upgrade plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const topScore = admin.properties.reduce<number | null>((best, p) => {
    if (p.latestScore == null) return best;
    return best == null ? p.latestScore : Math.max(best, p.latestScore);
  }, null);

  return (
    <div className="space-y-6">
      <SeoSetupWizard />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="SEO health score"
          value={topScore != null ? `${topScore}%` : website.hasFeature ? `${website.seoScore}%` : "—"}
          hint={website.published ? "Based on your latest site checklist" : "Publish your site to start scoring"}
        />
        <KpiTile
          label="Search clicks (28d)"
          value={analytics.totals ? String(analytics.totals.clicks) : "—"}
          delta={deltaLabel(analytics.clicksDeltaPct)}
          hint={analytics.available ? "From Google Search Console" : "Connect GSC on Sites tab"}
        />
        <KpiTile
          label="Impressions (28d)"
          value={analytics.totals ? analytics.totals.impressions.toLocaleString() : "—"}
          delta={deltaLabel(analytics.impressionsDeltaPct)}
        />
        <KpiTile
          label="Online bookings (28d)"
          value={String(crmOutcomes.onlineAppointments)}
          delta={deltaLabel(crmOutcomes.onlineAppointmentsDeltaPct)}
          hint="From your shop website"
        />
      </div>

      <SeoBusinessImpactSection
        outcomes={crmOutcomes}
        siteTraffic={siteTraffic}
        compact
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-brand-navy" />
              What runs automatically
            </CardTitle>
            <CardDescription>ShopRally handles these on schedule — no action needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="font-medium">Weekly SEO audit</p>
                <p className="text-xs text-muted-foreground">Mondays · score + open fixes</p>
              </div>
              <Badge variant="outline">Scheduled</Badge>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="font-medium">Bi-weekly content</p>
                <p className="text-xs text-muted-foreground">
                  1st &amp; 15th
                  {admin.settings.lastContentRunAt
                    ? ` · last ${formatWhen(admin.settings.lastContentRunAt)}`
                    : ""}
                </p>
              </div>
              <Badge variant={admin.settings.contentAutopilotEnabled ? "default" : "outline"}>
                {admin.settings.contentAutopilotEnabled ? "On" : "Off"}
              </Badge>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="font-medium">Monthly email report</p>
                <p className="text-xs text-muted-foreground">
                  1st of month
                  {admin.settings.lastReportSentAt
                    ? ` · last ${formatWhen(admin.settings.lastReportSentAt)}`
                    : ""}
                </p>
              </div>
              <Badge variant={admin.settings.monthlyReportEnabled ? "default" : "outline"}>
                {admin.settings.monthlyReportEnabled ? "On" : "Off"}
              </Badge>
            </div>
            {admin.aiSeoContent && admin.settings.useAiContent ? (
              <div className="flex items-center gap-2 rounded-lg border border-brand-light/50 bg-brand-light/10 px-3 py-2 text-xs text-brand-navy">
                <Sparkles className="size-3.5 shrink-0" />
                {PLANS.ENTERPRISE.name} AI content refinement is enabled.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-brand-navy" />
              Quick actions
            </CardTitle>
            <CardDescription>See results or finish setup.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-between">
              <Link href={`${SEO_AUTOPILOT_BASE}/analytics`}>
                View search analytics
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href={`${SEO_AUTOPILOT_BASE}/health`}>
                SEO health checklist
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href={`${SEO_AUTOPILOT_BASE}/sites`}>
                Manage sites &amp; Search Console
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/marketing/website">{GROWTH_PRODUCTS.shopSite.label}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="size-4 text-brand-navy" />
            Sites under management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {admin.properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sites yet — publish your microsite under ShopSite to get started.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {admin.properties.map((property) => (
                <li key={property.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{property.domain}</p>
                    <p className="text-xs text-muted-foreground">
                      Last audit {formatWhen(property.lastAuditAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {property.latestScore != null ? (
                      <span className={scoreClass(property.latestScore)}>{property.latestScore}%</span>
                    ) : null}
                    {property.gscPropertyUrl ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MousePointerClick className="size-3" />
                        GSC linked
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
