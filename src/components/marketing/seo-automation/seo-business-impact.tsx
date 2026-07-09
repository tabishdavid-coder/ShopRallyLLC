"use client";

import Link from "next/link";
import { CalendarCheck, TrendingUp, UserPlus, Wrench } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SeoCrmOutcomesView, SeoSiteTrafficView } from "@/lib/seo-crm-outcomes";
import { deltaLabel } from "@/components/marketing/seo-automation/seo-autopilot-utils";

function OutcomeTile({
  icon: Icon,
  label,
  value,
  delta,
  hint,
}: {
  icon: typeof CalendarCheck;
  label: string;
  value: number;
  delta: number | null;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-brand-navy" />
          {label}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0 text-xs text-muted-foreground">
        {deltaLabel(delta) ? (
          <p className="font-medium text-brand-navy">{deltaLabel(delta)}</p>
        ) : null}
        {hint ? <p>{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function SeoBusinessImpactSection({
  outcomes,
  siteTraffic,
  compact = false,
}: {
  outcomes: SeoCrmOutcomesView;
  siteTraffic: SeoSiteTrafficView;
  compact?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="size-4 text-brand-navy" />
          Business impact
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          CRM outcomes from your website and online presence — last {outcomes.days} days.
        </p>
      </div>

      <div className={`grid gap-4 ${compact ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        <OutcomeTile
          icon={CalendarCheck}
          label="Online bookings"
          value={outcomes.onlineAppointments}
          delta={outcomes.onlineAppointmentsDeltaPct}
          hint={
            outcomes.onlineBookingEnabled
              ? "Appointments booked via your site"
              : "Enable online booking to capture more"
          }
        />
        <OutcomeTile
          icon={UserPlus}
          label="New web customers"
          value={outcomes.newWebCustomers}
          delta={outcomes.newWebCustomersDeltaPct}
          hint='Customers with lead source "Website"'
        />
        <OutcomeTile
          icon={Wrench}
          label="Web-sourced repair orders"
          value={outcomes.websiteRepairOrders}
          delta={outcomes.websiteRepairOrdersDeltaPct}
          hint="ROs tagged Website / Online Booking / Google"
        />
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Site traffic tracking</CardTitle>
          <CardDescription>
            {siteTraffic.ga4Configured
              ? `GA4 measurement ID ${siteTraffic.ga4MeasurementId} is on your microsite.`
              : "Add a GA4 measurement ID in ShopSite to track all site visits in Google Analytics."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {siteTraffic.sitePublished ? (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Site published
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
              Site not published
            </span>
          )}
          {siteTraffic.ga4Configured ? (
            <span className="rounded-full bg-brand-light/30 px-2.5 py-0.5 text-xs font-medium text-brand-navy">
              GA4 active
            </span>
          ) : (
            <Link
              href="/marketing/website"
              className="text-xs font-medium text-brand-navy hover:underline"
            >
              Add GA4 in ShopSite →
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
