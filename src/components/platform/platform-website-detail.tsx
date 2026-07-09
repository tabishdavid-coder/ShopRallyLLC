"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import { EnterShopCrmButton } from "@/components/platform/enter-shop-crm-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MASTER_CRM_HOME } from "@/lib/platform-routing";
import {
  WEBSITE_BUILD_STATUS,
  WEBSITE_BUILD_STATUS_LABEL,
  WEBSITE_BUILD_STATUS_STYLES,
  type WebsiteBuildStatusValue,
} from "@/lib/website-build-pipeline";
import { cn } from "@/lib/utils";
import { updateWebsiteBuildPipeline } from "@/server/actions/platform-websites";
import type { PlatformWebsiteDetail } from "@/server/platform/websites";
import { WebsiteBuildStatus } from "@/generated/prisma";

function fmtDateTime(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PlatformWebsiteDetailView({ site }: { site: PlatformWebsiteDetail }) {
  const router = useRouter();
  const [buildStatus, setBuildStatus] = useState<WebsiteBuildStatus>(site.buildStatus);
  const [notes, setNotes] = useState(site.operatorNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(patch?: { markReviewed?: boolean; published?: boolean }) {
    setError(null);
    start(async () => {
      const res = await updateWebsiteBuildPipeline({
        shopId: site.shopId,
        buildStatus,
        operatorNotes: notes,
        ...patch,
      });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`${MASTER_CRM_HOME}/websites`} className="text-brand-navy hover:underline">
              Customer websites
            </Link>
            {" / "}
            {site.shopName}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">{site.shopName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {site.shopCode} · Slug <span className="font-mono">{site.slug}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {site.published ? (
            <Button asChild variant="outline" size="sm">
              <a href={site.siteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 size-3.5" />
                View live site
              </a>
            </Button>
          ) : null}
          <EnterShopCrmButton shopId={site.shopId} shopName={site.shopName} size="sm" className="bg-brand-navy">
            Edit in Shop CRM
          </EnterShopCrmButton>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <h3 className="font-semibold text-brand-navy">Build pipeline</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="build-status">Status</Label>
              <Select
                value={buildStatus}
                onValueChange={(v) => setBuildStatus(v as WebsiteBuildStatus)}
              >
                <SelectTrigger id="build-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(WEBSITE_BUILD_STATUS).map((status) => (
                    <SelectItem key={status} value={status}>
                      {WEBSITE_BUILD_STATUS_LABEL[status as WebsiteBuildStatusValue]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current</Label>
              <p>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    WEBSITE_BUILD_STATUS_STYLES[site.buildStatus as WebsiteBuildStatusValue],
                  )}
                >
                  {site.buildStatusLabel}
                </span>
                {site.published ? (
                  <span className="ml-2 text-xs text-emerald-700">Published</span>
                ) : (
                  <span className="ml-2 text-xs text-muted-foreground">Draft</span>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operator-notes">Operator notes</Label>
            <Textarea
              id="operator-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Build scope, design notes, launch checklist, upkeep tasks…"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" className="bg-brand-navy" disabled={pending} onClick={() => save()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => save({ published: true })}
            >
              Launch (publish)
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => save({ markReviewed: true })}
            >
              Mark upkeep review done
            </Button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border bg-card p-5 shadow-sm text-sm">
            <h3 className="font-semibold text-brand-navy">Site snapshot</h3>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">SEO score</dt>
                <dd className="font-medium tabular-nums">{site.seoScore}%</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Custom domain</dt>
                <dd className="font-mono text-xs">{site.customDomain ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">GA4</dt>
                <dd className="font-mono text-xs">{site.googleAnalyticsId ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Launched</dt>
                <dd>{fmtDateTime(site.launchedAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Next review</dt>
                <dd className={site.reviewOverdue ? "font-medium text-brand-red" : undefined}>
                  {fmtDateTime(site.nextReviewDueAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Last review</dt>
                <dd>{fmtDateTime(site.lastOperatorReviewAt)}</dd>
              </div>
            </dl>
          </section>

          {site.recentBuildTickets.length > 0 ? (
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-brand-navy">Build requests</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {site.recentBuildTickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`${MASTER_CRM_HOME}/support?ticket=${t.id}`}
                      className="text-brand-navy hover:underline"
                    >
                      {t.subject}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {t.status} · {fmtDateTime(t.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-xl border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
            <p>
              Shop owners edit content under{" "}
              <strong className="text-foreground">Marketing → Website &amp; SEO</strong> after launch.
              SEO Autopilot is managed under{" "}
              <Link href={`${MASTER_CRM_HOME}/seo-automation`} className="text-brand-navy hover:underline">
                SEO Autopilot
              </Link>
              .
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
