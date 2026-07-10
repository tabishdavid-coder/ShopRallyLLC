"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO_AUTOPILOT_BASE } from "@/lib/seo-autopilot-nav";
import { cn } from "@/lib/utils";
import { useSeoAutopilot } from "@/components/marketing/seo-automation/seo-autopilot-context";

type Step = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

export function SeoSetupWizard() {
  const { admin, website, siteTraffic } = useSeoAutopilot();

  const gscLinked = admin.properties.some((p) => p.gscPropertyUrl);

  const steps: Step[] = [
    {
      id: "publish",
      label: "Publish your ShopSite",
      done: website.published,
      href: "/marketing/website",
    },
    {
      id: "gsc",
      label: "Connect Google Search Console",
      done: admin.gsc.connected,
      href: `${SEO_AUTOPILOT_BASE}/sites`,
    },
    {
      id: "gsc-link",
      label: "Link Search Console property",
      done: gscLinked,
      href: `${SEO_AUTOPILOT_BASE}/sites`,
    },
    {
      id: "gbp",
      label: "Connect Google Business Profile (Reviews)",
      done: website.gbpConnected,
      href: "/marketing/reviews",
    },
    {
      id: "ga4",
      label: "Add GA4 measurement ID",
      done: siteTraffic.ga4Configured,
      href: "/marketing/website",
    },
    {
      id: "autopilot",
      label: "Enable content autopilot",
      done: admin.settings.contentAutopilotEnabled,
      href: `${SEO_AUTOPILOT_BASE}/sites`,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Launch checklist</CardTitle>
        <CardDescription>
          {allDone
            ? "Your Growth Engine SEO setup is complete — we will keep optimizing on schedule."
            : `${doneCount} of ${steps.length} complete — finish setup to get the most from Autopilot.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50",
                  step.done && "border-green-200/80 bg-green-50/40",
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-green-700" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span className={step.done ? "text-foreground" : "font-medium"}>{step.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        {!allDone ? (
          <Button asChild size="sm" className="mt-4 bg-brand-navy hover:bg-brand-navy/90">
            <Link href={steps.find((s) => !s.done)?.href ?? SEO_AUTOPILOT_BASE}>
              Continue setup
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
