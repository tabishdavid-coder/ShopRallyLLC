"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";

import { GoogleSignInButton } from "@/components/marketing/google-reviews/google-sign-in-button";
import { Button } from "@/components/ui/button";

const SETUP_STEPS = [
  "Sign in with the Google account that manages your shop's Business Profile.",
  "Allow ShopRally to read and reply to your Google reviews.",
  "Choose your shop location (if you have more than one).",
] as const;

export function GoogleReviewsConnectBanner({
  connected,
  hasGoogleAccount,
  envConfigured,
  locationName,
}: {
  connected: boolean;
  hasGoogleAccount: boolean;
  envConfigured: boolean;
  locationName?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);

  if (connected) return null;

  return (
    <div className="rounded-lg border-2 border-brand-navy/20 bg-gradient-to-br from-brand-navy/5 via-background to-brand-light/10 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-brand-navy">
              Connect your Google Business Profile
            </h3>
            {hasGoogleAccount ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                Google account linked
              </span>
            ) : null}
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Sign in with Google to pull in real customer reviews and publish replies from ShopRally.
            Use the same Google account you use to manage your shop on Google Maps.
          </p>
          <ol className="space-y-2 text-sm">
            {SETUP_STEPS.map((step, i) => (
              <li key={step} className="flex gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-foreground">{step}</span>
              </li>
            ))}
          </ol>
          {!envConfigured ? (
            <p className="text-xs text-amber-800">
              Google sign-in is not set up on this ShopRally site yet. Your shop admin can finish
              platform setup, or you can explore demo reviews below.
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <GoogleSignInButton size="lg" onError={setError} />
          <Button asChild variant="link" size="sm" className="h-auto px-0 text-muted-foreground">
            <Link href="/vendors/integrations/google-reviews" className="gap-1">
              Full setup guide
              <ExternalLink className="size-3" />
            </Link>
          </Button>
        </div>
      </div>

      {hasGoogleAccount && !connected ? (
        <p className="mt-4 border-t border-brand-navy/10 pt-3 text-sm text-muted-foreground">
          {locationName
            ? `Linked to ${locationName} — sync reviews to finish setup.`
            : "Your Google account is linked. Add your shop location on the setup page, then sync reviews."}
        </p>
      ) : null}
    </div>
  );
}

export function GoogleReviewsOAuthSuccessBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2.5">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div>
          <p className="font-medium text-emerald-900">Google account connected</p>
          <p className="mt-0.5 text-sm text-emerald-800">{message}</p>
        </div>
      </div>
      {onDismiss ? (
        <Button type="button" size="sm" variant="outline" className="shrink-0 border-emerald-300" onClick={onDismiss}>
          Dismiss
        </Button>
      ) : null}
    </div>
  );
}
