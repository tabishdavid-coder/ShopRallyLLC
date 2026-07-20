"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FOUNDING_BENEFITS,
  marketingFormSubmitCta,
  marketingPrimaryHint,
  marketingSecondaryCta,
} from "@/lib/marketing-launch";
import { submitFoundingWaitlist } from "@/server/actions/marketing-leads";
import {
  WEB_PRESENCE_MARKETING,
  webPresenceInterestLabel,
  webPresenceRequestDemoHref,
} from "@/lib/web-presence-marketing";
import { cn } from "@/lib/utils";

type FoundingWaitlistFormProps = {
  variant?: "compact" | "full";
  className?: string;
  /** When true (e.g. /launch?need=website), flag Website & SEO interest on the lead. */
  wantWebsiteSeo?: boolean;
};

export function FoundingWaitlistForm({
  variant = "full",
  className,
  wantWebsiteSeo = false,
}: FoundingWaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [alsoWebsite, setAlsoWebsite] = useState(wantWebsiteSeo);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitFoundingWaitlist({
        email,
        shopName: shopName || undefined,
        source:
          alsoWebsite
            ? variant === "compact"
              ? "homepage-inline-website"
              : "launch-page-website"
            : variant === "compact"
              ? "homepage-inline"
              : "launch-page",
        interests: alsoWebsite ? webPresenceInterestLabel() : undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className={cn("rounded-2xl border-2 border-brand-navy/15 bg-white p-6 text-center sm:p-8", className)}>
        <CheckCircle2 className="mx-auto size-12 text-brand-navy" />
        <h3 className="mt-4 text-xl font-bold text-brand-navy">Seat reserved for Q4 2026</h3>
        <p className="mt-2 text-sm text-slate-600">
          We&apos;ll email <span className="font-medium text-brand-navy">{email}</span> when Ignition
          launches — not before. You don&apos;t have software access yet. Nothing to buy today.
          {alsoWebsite ? (
            <>
              {" "}
              We also noted your interest in Website &amp; SEO as a separate offer.
            </>
          ) : null}
        </p>
        <Button className="mt-6 bg-brand-navy" asChild>
          <Link href={alsoWebsite ? webPresenceRequestDemoHref() : "/demo"}>
            {alsoWebsite ? WEB_PRESENCE_MARKETING.ctaPrimary : marketingSecondaryCta(true)}
          </Link>
        </Button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <form
        onSubmit={submit}
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-brand-navy/15 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-end sm:p-5",
          className,
        )}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="waitlist-email-compact" className="text-xs font-medium text-slate-600">
            Work email — that&apos;s it
          </Label>
          <Input
            id="waitlist-email-compact"
            type="email"
            required
            autoComplete="email"
            placeholder="you@yourshop.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-slate-300"
          />
        </div>
        <Button type="submit" disabled={pending} className="shrink-0 gap-2 bg-brand-navy hover:bg-brand-navy/90">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {marketingFormSubmitCta()}
          <ArrowRight className="size-4" />
        </Button>
      </form>
    );
  }

  return (
    <div className={cn("grid gap-8 lg:grid-cols-2 lg:items-start", className)}>
      <div>
        <h2 className="text-2xl font-bold text-brand-navy sm:text-3xl">Reserve a founding seat</h2>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Launching Q4 2026 · 50 spots. Leave an email to reserve — this is a waitlist, not instant
          access. We don&apos;t push a demo unless you ask.
        </p>
        <ul className="mt-6 space-y-3">
          {FOUNDING_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-navy" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <form
        onSubmit={submit}
        className="rounded-2xl border-2 border-brand-navy/15 bg-white p-6 shadow-sm sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">Almost done · 1 step</p>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="waitlist-email">Work email *</Label>
            <Input
              id="waitlist-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@yourshop.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-slate-300"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waitlist-shop">Shop name (optional)</Label>
            <Input
              id="waitlist-shop"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Main Street Auto"
              className="border-slate-300"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-brand-navy/10 bg-slate-50/80 px-3 py-2.5 text-left text-sm text-slate-700">
            <input
              type="checkbox"
              checked={alsoWebsite}
              onChange={(e) => setAlsoWebsite(e.target.checked)}
              className="mt-0.5 size-4 rounded border-slate-300 text-brand-navy focus:ring-brand-navy"
            />
            <span>
              Also interested in{" "}
              <span className="font-semibold text-brand-navy">Website &amp; SEO</span>
              <span className="block text-xs text-slate-500">
                Separate from Ignition CRM — ShopSite, local SEO, Google Business Profile &amp; Ads
              </span>
            </span>
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="mt-6 w-full gap-2 bg-brand-navy">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {marketingFormSubmitCta()}
          <ArrowRight className="size-4" />
        </Button>
        <p className="mt-3 text-center text-xs text-slate-500">
          {marketingPrimaryHint(true)}{" "}
          <Link href="/demo" className="font-semibold text-brand-red hover:underline">
            Prefer a demo?
          </Link>
        </p>
      </form>
    </div>
  );
}
