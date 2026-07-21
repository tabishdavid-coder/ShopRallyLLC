"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, RefreshCw, Unplug } from "lucide-react";

import { GoogleSignInButton } from "@/components/marketing/google-reviews/google-sign-in-button";
import { Button } from "@/components/ui/button";
import {
  disconnectGoogleReviews,
  listGoogleBusinessAccounts,
  listGoogleBusinessLocations,
  saveGoogleReviewsLocation,
  syncGoogleReviews,
} from "@/server/actions/google-reviews";
import type { VendorIntegrationStatus } from "@/lib/integrations";
import { STATE_META } from "@/lib/integrations";
import type { GoogleBusinessAccount, GoogleBusinessLocation } from "@/lib/google-reviews-types";

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

const GBP_HELP_URL =
  "https://support.google.com/business/answer/3038177?hl=en";

function connectionLabel(status: VendorIntegrationStatus): string {
  if (status.state === "connected") return "Connected";
  if (status.safeConfig.hasRefreshToken) {
    return status.safeConfig.googleLocationId ? "Sync needed" : "Account linked";
  }
  return "Not connected";
}

export function GoogleReviewsConnectPanel({
  status,
  oauthMessage,
  oauthError,
}: {
  status: VendorIntegrationStatus;
  oauthMessage?: string | null;
  oauthError?: string | null;
}) {
  const c = status.safeConfig;
  const [accountId, setAccountId] = useState(String(c.googleBusinessAccountId ?? ""));
  const [locationId, setLocationId] = useState(String(c.googleLocationId ?? ""));
  const [locationName, setLocationName] = useState(String(c.googleLocationName ?? ""));
  const [placeId, setPlaceId] = useState(String(c.googlePlaceId ?? ""));
  const [accounts, setAccounts] = useState<GoogleBusinessAccount[]>([]);
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [message, setMessage] = useState<string | null>(oauthMessage ?? null);
  const [error, setError] = useState<string | null>(oauthErrorToPlain(oauthError));
  const [pending, start] = useTransition();
  const meta = STATE_META[status.state];
  const statusLabel = connectionLabel(status);
  const hasAccount = Boolean(c.hasRefreshToken);

  useEffect(() => {
    if (!hasAccount) return;
    let cancelled = false;
    setPickerLoading(true);
    void listGoogleBusinessAccounts().then((res) => {
      if (cancelled) return;
      setPickerLoading(false);
      if (!res.ok) {
        setError(res.error);
        setShowManual(true);
        return;
      }
      setAccounts(res.accounts);
      if (res.accounts.length === 0) {
        setShowManual(true);
        setError("No Business Profile accounts found for this Google login. Try a manager/owner account.");
        return;
      }
      const preferred =
        res.accounts.find((a) => a.accountId === accountId)?.accountId ?? res.accounts[0]!.accountId;
      if (!accountId) setAccountId(preferred);
      void loadLocations(preferred);
    });
    return () => {
      cancelled = true;
    };
    // Load picker once after OAuth link.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount/hasAccount only
  }, [hasAccount]);

  async function loadLocations(nextAccountId: string) {
    setPickerLoading(true);
    setError(null);
    const res = await listGoogleBusinessLocations(nextAccountId);
    setPickerLoading(false);
    if (!res.ok) {
      setError(res.error);
      setShowManual(true);
      return;
    }
    setLocations(res.locations);
    if (res.locations.length === 1 && !locationId) {
      const only = res.locations[0]!;
      setLocationId(only.locationId);
      setLocationName(only.displayName);
      setPlaceId(only.placeId ?? "");
    }
  }

  function onAccountChange(next: string) {
    setAccountId(next);
    setLocationId("");
    setLocationName("");
    setPlaceId("");
    setLocations([]);
    start(() => {
      void loadLocations(next);
    });
  }

  function onLocationChange(next: string) {
    setLocationId(next);
    const loc = locations.find((l) => l.locationId === next);
    if (loc) {
      setLocationName(loc.displayName);
      setPlaceId(loc.placeId ?? "");
    }
  }

  function saveLocation() {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await saveGoogleReviewsLocation({
        googleBusinessAccountId: accountId,
        googleLocationId: locationId,
        googleLocationName: locationName || undefined,
        googlePlaceId: placeId || undefined,
      });
      if (res.ok) setMessage(res.message ?? "Saved.");
      else setError(res.error);
    });
  }

  function sync() {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await syncGoogleReviews();
      if (res.ok) setMessage(res.message ?? "Synced.");
      else setError(res.error);
    });
  }

  function disconnect() {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await disconnectGoogleReviews();
      if (res.ok) {
        setAccountId("");
        setLocationId("");
        setLocationName("");
        setPlaceId("");
        setAccounts([]);
        setLocations([]);
        setMessage(res.message ?? "Disconnected.");
      } else setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="flex gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium">Success</p>
            <p className="mt-0.5">{message}</p>
            {hasAccount && status.state !== "connected" ? (
              <Button
                type="button"
                size="sm"
                className="mt-2"
                onClick={sync}
                disabled={pending}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Sync reviews now
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      <section className="space-y-5 rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">Setup steps</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}>
            {statusLabel}
          </span>
        </div>

        <ol className="space-y-4">
          <li className="flex gap-3">
            <StepNumber done={hasAccount}>1</StepNumber>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-medium">Sign in with Google</p>
              <p className="text-sm text-muted-foreground">
                Use the Google account that has <strong>owner or manager</strong> access to your
                shop&apos;s listing on Google Maps and Search. Personal Gmail accounts without
                Business Profile access will not work.
              </p>
              <GoogleSignInButton size="lg" onError={setError} />
              <p className="text-xs text-muted-foreground">
                Not sure which account to use?{" "}
                <a
                  href={GBP_HELP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-navy hover:underline"
                >
                  Learn about Google Business Profile access
                </a>
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <StepNumber done={Boolean(c.googleLocationId)}>2</StepNumber>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-medium">Select your shop location</p>
              <p className="text-sm text-muted-foreground">
                After sign-in, pick the Business Profile account and location for this shop.
              </p>

              {hasAccount ? (
                <div className="space-y-3">
                  {pickerLoading ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading locations from Google…
                    </p>
                  ) : null}

                  {accounts.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Google account</label>
                        <select
                          className={inputCls}
                          value={accountId}
                          onChange={(e) => onAccountChange(e.target.value)}
                          disabled={pending || pickerLoading}
                        >
                          {accounts.map((a) => (
                            <option key={a.accountId} value={a.accountId}>
                              {a.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Location</label>
                        <select
                          className={inputCls}
                          value={locationId}
                          onChange={(e) => onLocationChange(e.target.value)}
                          disabled={pending || pickerLoading || locations.length === 0}
                        >
                          <option value="">Select a location…</option>
                          {locations.map((l) => (
                            <option key={l.locationId} value={l.locationId}>
                              {l.displayName}
                              {l.addressLine ? ` — ${l.addressLine}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="text-xs font-medium text-brand-navy hover:underline"
                    onClick={() => setShowManual((v) => !v)}
                  >
                    {showManual ? "Hide manual IDs" : "Enter account / location IDs manually"}
                  </button>

                  {showManual || accounts.length === 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Account ID</label>
                        <input
                          className={inputCls}
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value)}
                          placeholder="From Google Business Profile"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Location ID</label>
                        <input
                          className={inputCls}
                          value={locationId}
                          onChange={(e) => setLocationId(e.target.value)}
                          placeholder="Your shop location"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Location name (optional)</label>
                        <input
                          className={inputCls}
                          value={locationName}
                          onChange={(e) => setLocationName(e.target.value)}
                          placeholder="In & Out AutoHaus Garage"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Place ID (optional)</label>
                        <input
                          className={inputCls}
                          value={placeId}
                          onChange={(e) => setPlaceId(e.target.value)}
                          placeholder="ChIJ… for review request links"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={saveLocation}
                      disabled={pending || !accountId || !locationId}
                    >
                      Save location
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete step 1 to load locations for this Google account.
                </p>
              )}
            </div>
          </li>

          <li className="flex gap-3">
            <StepNumber done={status.state === "connected"}>3</StepNumber>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-medium">Sync your reviews</p>
              <p className="text-sm text-muted-foreground">
                Pull the latest Google reviews into ShopRally. Background sync also refreshes
                connected shops every few hours.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={sync} disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Sync reviews
                </Button>
                {hasAccount ? (
                  <Button type="button" size="sm" variant="ghost" onClick={disconnect} disabled={pending}>
                    <Unplug className="size-4" />
                    Disconnect Google
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        </ol>
      </section>

      <p className="text-sm text-muted-foreground">
        When setup is complete, open the{" "}
        <Link href="/marketing/reviews" className="font-medium text-brand-navy hover:underline">
          Reviews inbox
        </Link>{" "}
        to read and reply to customer feedback. Included on Core and above.
      </p>
    </div>
  );
}

function StepNumber({ children, done }: { children: React.ReactNode; done?: boolean }) {
  return (
    <span
      className={
        done
          ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700"
          : "flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white"
      }
    >
      {done ? <CheckCircle2 className="size-4" /> : children}
    </span>
  );
}

function oauthErrorToPlain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  switch (raw) {
    case "access_denied":
      return "Google sign-in was cancelled. Try again when you're ready.";
    case "missing_code":
      return "Google did not return a sign-in code. Please try again.";
    case "invalid_state":
      return "Sign-in session expired. Start over from Sign in with Google.";
    default:
      if (raw.includes("GOOGLE_CLIENT")) {
        return "Google sign-in is not configured on this site yet. Contact your ShopRally admin.";
      }
      return raw;
  }
}
