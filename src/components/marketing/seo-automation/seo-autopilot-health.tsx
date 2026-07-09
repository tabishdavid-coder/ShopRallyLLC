"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertCircle, CheckCircle2, Circle, ExternalLink, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { seoRecommendationFixHref } from "@/lib/seo-recommendations";
import { cn } from "@/lib/utils";
import { dismissSeoRecommendation, snoozeSeoRecommendation } from "@/server/actions/seo-automation";
import { useSeoAutopilot } from "@/components/marketing/seo-automation/seo-autopilot-context";
import { formatWhen, scoreClass } from "@/components/marketing/seo-automation/seo-autopilot-utils";

function fixHref(itemId: string): string | null {
  switch (itemId) {
    case "meta_title":
    case "meta_description":
    case "hero_content":
    case "about_text":
    case "services_listed":
    case "site_published":
      return "/marketing/website";
    case "booking_linked":
      return "/marketing/online-booking";
    case "gbp_connected":
      return "/marketing/reviews";
    case "gsc_connected":
      return "/marketing/seo-automation/sites";
    case "analytics_connected":
      return "/marketing/website";
    default:
      return null;
  }
}

export function SeoAutopilotHealthPanel() {
  const { admin, website } = useSeoAutopilot();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!admin.hasFeature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SEO health</CardTitle>
          <CardDescription>Upgrade to access the local SEO checklist.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/billing">Upgrade plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const checklist = website.seoChecklist;
  const completed = checklist.filter((c) => c.completed).length;
  const open = checklist.filter((c) => !c.completed);

  const dismissed = new Set(admin.settings.dismissedRecommendations);
  const snoozedUntil = new Map(
    admin.settings.snoozedRecommendations.map((row) => [row.label, row.until] as const),
  );
  const now = Date.now();

  const auditRecommendations = [
    ...new Set(
      admin.recentRuns
        .filter((run) => run.jobType === "AUDIT" && run.openItems.length > 0)
        .flatMap((run) => run.openItems),
    ),
  ]
    .filter((item) => {
      if (dismissed.has(item)) return false;
      const until = snoozedUntil.get(item);
      if (until && Date.parse(until) > now) return false;
      return true;
    })
    .slice(0, 8);

  function dismissItem(label: string) {
    startTransition(async () => {
      await dismissSeoRecommendation(label);
      router.refresh();
    });
  }

  function snoozeItem(label: string) {
    startTransition(async () => {
      await snoozeSeoRecommendation(label, 7);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Local SEO score</CardTitle>
          <CardDescription>
            {completed} of {checklist.length} checklist items complete — fixes that help customers
            find you on Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <p className={cn("text-4xl", scoreClass(website.seoScore))}>{website.seoScore}%</p>
          {website.siteUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={website.siteUrl} target="_blank" rel="noopener noreferrer">
                View live site
                <ExternalLink className="ml-2 size-3.5" />
              </a>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist</CardTitle>
          <CardDescription>Green = done. Open items are included in weekly audits.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {checklist.map((item) => {
              const href = fixHref(item.id);
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex gap-3 rounded-lg border px-3 py-3",
                    item.completed ? "border-green-200/80 bg-green-50/40" : "bg-card",
                  )}
                >
                  {item.completed ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-700" />
                  ) : (
                    <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    {!item.completed && href ? (
                      <Button asChild variant="link" className="mt-1 h-auto p-0 text-brand-navy">
                        <Link href={href}>Fix this</Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {auditRecommendations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="size-4 text-brand-red" />
              Recommendations from audits
            </CardTitle>
            <CardDescription>
              Open items from your latest weekly SEO audits — fix these to improve your score.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {auditRecommendations.map((item) => (
                <li key={item} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <p className="text-sm">{item}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={seoRecommendationFixHref(item)}>Fix</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => snoozeItem(item)}
                    >
                      Snooze 7d
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => dismissItem(item)}
                    >
                      <X className="mr-1 size-3.5" />
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {admin.recentRuns[0]?.finishedAt ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Latest audit {formatWhen(admin.recentRuns[0].finishedAt)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {open.length > 0 ? (
        <Card className="border-amber-200/80 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-base text-amber-950">Priority fixes</CardTitle>
            <CardDescription className="text-amber-900/80">
              Completing these will improve your score and local visibility fastest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-950">
              {open.slice(0, 5).map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
