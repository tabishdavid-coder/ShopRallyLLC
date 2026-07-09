"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Check, CreditCard, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS } from "@/lib/plans";
import type { SeoStripeCatalogId } from "@/lib/seo-stripe-products";
import { GROWTH_BUNDLES } from "@/lib/growth-engine-brand";
import { useSeoAutopilot } from "@/components/marketing/seo-automation/seo-autopilot-context";
import { startSeoAddonCheckout } from "@/server/actions/seo-automation";

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
    case "included":
      return "default";
    case "upgrade":
      return "secondary";
    default:
      return "outline";
  }
}

export function SeoAutopilotPlanPanel({
  checkoutMessage = null,
  checkoutError = null,
}: {
  checkoutMessage?: string | null;
  checkoutError?: string | null;
}) {
  const { admin, plan } = useSeoAutopilot();
  const [pending, startTransition] = useTransition();

  function buyNow(catalogId: SeoStripeCatalogId) {
    startTransition(async () => {
      const res = await startSeoAddonCheckout(catalogId);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      if (res.url) window.location.href = res.url;
    });
  }

  return (
    <div className="space-y-6">
      {checkoutMessage ? (
        <p className="rounded-lg border border-green-200/80 bg-green-50/50 px-4 py-3 text-sm text-green-950">
          {checkoutMessage}
        </p>
      ) : null}
      {checkoutError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {checkoutError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4 text-brand-navy" />
            Your plan
          </CardTitle>
          <CardDescription>
            {GROWTH_BUNDLES.autopilot.tagline} Here is what you have today and what you can add.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-lg font-semibold">{plan.planName}</p>
            <p className="text-sm text-muted-foreground">Billing: {plan.billingLabel}</p>
          </div>
          {!admin.hasFeature ? (
            <Button asChild className="bg-brand-navy hover:bg-brand-navy/90">
              <Link href="/billing">Upgrade for SEO Autopilot</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/billing">Manage billing</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {plan.services.map((service) => (
          <Card key={service.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base">{service.name}</CardTitle>
                <Badge variant={statusVariant(service.status)}>{service.statusLabel}</Badge>
              </div>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-0">
              <p className="text-sm font-medium text-brand-navy">{service.priceLabel}</p>
              {service.status === "active" || service.status === "included" ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-700">
                  <Check className="size-3.5" />
                  Part of your subscription
                </span>
              ) : service.checkoutAvailable && service.catalogId ? (
                <Button
                  size="sm"
                  className="bg-brand-navy hover:bg-brand-navy/90"
                  disabled={pending}
                  onClick={() => buyNow(service.catalogId!)}
                >
                  {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Buy now
                </Button>
              ) : service.status === "upgrade" ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/billing">Upgrade plan</Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link href="/marketing/website">Learn more</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-brand-light/50 bg-brand-light/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-brand-navy" />
            What you get with SEO Autopilot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              "Weekly automated SEO audits",
              "Bi-weekly service page & keyword updates",
              "Google Search Console monitoring",
              "Sitemap submit + indexing requests on publish",
              "LocalBusiness schema & meta optimization",
              "Monthly performance email report",
              "Shop-owner analytics dashboard",
              `${PLANS.ENTERPRISE.name}: AI content refinement`,
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-brand-navy" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {!plan.stripeCheckoutEnabled ? (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Self-serve checkout</CardTitle>
            <CardDescription>
              Set <code className="rounded bg-muted px-1 text-xs">STRIPE_SECRET_KEY</code> and{" "}
              <code className="rounded bg-muted px-1 text-xs">STRIPE_PRICE_SEO_*</code> Price IDs to
              enable Buy now buttons. See <code className="text-xs">docs/website-seo-service.md</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
