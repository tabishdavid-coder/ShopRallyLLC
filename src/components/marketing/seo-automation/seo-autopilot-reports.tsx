"use client";

import Link from "next/link";
import { FileText, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSeoAutopilot } from "@/components/marketing/seo-automation/seo-autopilot-context";
import { formatWhen } from "@/components/marketing/seo-automation/seo-autopilot-utils";

export function SeoAutopilotReportsPanel() {
  const { admin, reports } = useSeoAutopilot();

  if (!admin.hasFeature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Upgrade to access SEO report history.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/billing">Upgrade plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-brand-navy" />
            Monthly report history
          </CardTitle>
          <CardDescription>
            Snapshots saved each time we email your Growth Engine SEO report (1st of the month when
            enabled).
            {admin.settings.lastReportSentAt ? (
              <> Last sent {formatWhen(admin.settings.lastReportSentAt)}.</>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              <Mail className="mx-auto mb-2 size-8 text-muted-foreground/60" />
              <p>No reports archived yet.</p>
              <p className="mt-1">
                Enable monthly reports on the Sites tab — the next send will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {reports.map((report) => (
                <li key={report.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{report.periodLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatWhen(report.createdAt)}
                        {report.sentTo ? ` · Emailed to ${report.sentTo}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm tabular-nums">
                      {report.summary.topScore != null ? (
                        <p>Score {report.summary.topScore}%</p>
                      ) : null}
                      {report.summary.gscClicks != null ? (
                        <p className="text-muted-foreground">{report.summary.gscClicks} GSC clicks</p>
                      ) : null}
                    </div>
                  </div>
                  {report.summary.highlights.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {report.summary.highlights.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
