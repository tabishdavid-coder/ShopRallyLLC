"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  openStripeExpressDashboard,
  requestStripeDisconnect,
  resumeStripeConnectOnboarding,
  saveProfileAndStartStripeConnect,
  startStripeConnectOnboarding,
  syncStripeConnectStatus,
} from "@/server/actions/stripe-connect";
import { PaymentAddendumGate } from "@/components/legal/payment-addendum-gate";
import {
  STRIPE_CONNECT_STATUS,
  type ConnectPrerequisites,
  type PlatformStripeConfig,
  type ShopStripeStatus,
} from "@/lib/stripe-connect-types";
import type { StripeConnectStatus } from "@/generated/prisma";

const STATUS_BADGE: Record<
  StripeConnectStatus,
  { label: string; className: string; headline: string }
> = {
  NOT_STARTED: {
    label: "Not started",
    className: "bg-slate-100 text-slate-700",
    headline: "Connect with Stripe to accept online payments.",
  },
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800",
    headline: "Finish Stripe onboarding to activate customer payments.",
  },
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-700",
    headline: "Your shop is ready to accept online payments.",
  },
  RESTRICTED: {
    label: "Restricted",
    className: "bg-orange-100 text-orange-800",
    headline: "Stripe needs additional information to keep your account active.",
  },
  DISABLED: {
    label: "Disabled",
    className: "bg-red-100 text-red-800",
    headline: "Your Stripe account is disabled. Contact support.",
  },
};

const PREREQ_LABELS: Record<string, string> = {
  name: "Legal business name",
  email: "Owner / business email",
  address: "Street address",
  city: "City",
  state: "State",
  zip: "ZIP code",
};

const STRIPE_COLLECTS = [
  "Business legal name, type, and EIN or SSN (representative)",
  "Business address and auto-repair industry classification",
  "Bank account for payouts (routing + account number)",
  "Identity verification if Stripe flags your application",
];

export function StripeConnectPanel({
  status,
  prereqs,
  platform,
  connectReturn,
  variant = "default",
  paymentAddendumAccepted = true,
  paymentAddendumVersion = null,
}: {
  status: ShopStripeStatus;
  prereqs: ConnectPrerequisites;
  platform: PlatformStripeConfig;
  connectReturn?: "return" | "refresh";
  variant?: "default" | "account";
  paymentAddendumAccepted?: boolean;
  paymentAddendumVersion?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [disconnectMsg, setDisconnectMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [addendumAccepted, setAddendumAccepted] = useState(paymentAddendumAccepted);
  const badge = STATUS_BADGE[status.connectStatus];
  const isAccount = variant === "account";
  const isActive =
    status.connectStatus === STRIPE_CONNECT_STATUS.ACTIVE && status.chargesEnabled;
  const showPrereqs =
    !status.accountId &&
    status.connectStatus === STRIPE_CONNECT_STATUS.NOT_STARTED &&
    !prereqs.ready;
  const showConnect =
    addendumAccepted &&
    prereqs.ready &&
    (status.connectStatus === STRIPE_CONNECT_STATUS.NOT_STARTED || !status.accountId);
  const showResume =
    addendumAccepted &&
    Boolean(status.accountId) &&
    status.connectStatus !== STRIPE_CONNECT_STATUS.ACTIVE;
  const connectDisabled = pending || !platform.enabled || !addendumAccepted;

  function connect() {
    setError(null);
    start(async () => {
      const res = await startStripeConnectOnboarding();
      if (res.ok) window.location.href = res.url;
      else setError(res.error);
    });
  }

  function resume() {
    setError(null);
    start(async () => {
      const res = await resumeStripeConnectOnboarding();
      if (res.ok) window.location.href = res.url;
      else setError(res.error);
    });
  }

  function sync() {
    setError(null);
    start(async () => {
      const res = await syncStripeConnectStatus();
      if (!res.ok) setError(res.error);
    });
  }

  function openDashboard() {
    setError(null);
    start(async () => {
      const res = await openStripeExpressDashboard();
      if (res.ok) window.open(res.url, "_blank", "noopener,noreferrer");
      else setError(res.error);
    });
  }

  function disconnect() {
    setError(null);
    start(async () => {
      const res = await requestStripeDisconnect();
      if (res.ok) setDisconnectMsg(res.message);
      else setError(res.error);
    });
  }

  const returnBanner =
    connectReturn === "return" ? (
      <ReturnBanner synced={isActive} onSync={sync} pending={pending} />
    ) : connectReturn === "refresh" ? (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900">
        Your onboarding link expired — click <strong>Complete onboarding</strong> or{" "}
        <strong>Connect with Stripe</strong> to continue.
      </div>
    ) : null;

  if (isAccount) {
    return (
      <div className="space-y-4">
        <PlatformScopeNotice />
        {!platform.enabled ? <PlatformNotConfigured platform={platform} /> : null}
        {platform.enabled && !platform.webhookConfigured ? (
          <PlatformWebhookWarning />
        ) : null}

        <section className="rounded-lg border bg-card p-6">
          <div className="mx-auto max-w-lg space-y-5">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                {badge.label}
              </span>
              {status.usingConnect ? (
                <span className="rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-xs font-medium text-brand-navy">
                  Connect Express
                </span>
              ) : null}
            </div>

            <div className="text-center">
              <h2 className="text-lg font-semibold">Stripe account</h2>
              <p className="mt-2 text-sm font-medium text-foreground">{badge.headline}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                This Stripe account is connected to ShopRally for customer invoice payments only.
                It is managed by the platform — not a standalone Stripe business account.
              </p>
            </div>

            {returnBanner}

            {!addendumAccepted && paymentAddendumVersion ? (
              <PaymentAddendumGate
                version={paymentAddendumVersion}
                onAccepted={() => setAddendumAccepted(true)}
              />
            ) : null}

            {showPrereqs ? (
              <ConnectPrereqsForm prereqs={prereqs} disabled={pending || !platform.enabled} />
            ) : (
              <>
                {!isActive && !showConnect ? (
                  <OnboardingChecklist />
                ) : null}

                {status.requirementsPastDue.length || status.requirementsCurrentlyDue.length ? (
                  <RequirementsAlert status={status} />
                ) : null}

                <div className="flex flex-col items-center gap-2 pt-1">
                  {isActive ? (
                    <Button
                      className="w-full max-w-xs bg-brand-navy hover:bg-brand-navy/90"
                      onClick={openDashboard}
                      disabled={pending}
                    >
                      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                      Open Express Dashboard
                      <ExternalLink className="ml-2 size-4" />
                    </Button>
                  ) : showConnect ? (
                    <Button
                      className="w-full max-w-xs bg-brand-navy hover:bg-brand-navy/90"
                      onClick={connect}
                      disabled={connectDisabled}
                    >
                      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                      Continue to Stripe
                    </Button>
                  ) : showResume ? (
                    <Button
                      className="w-full max-w-xs bg-brand-navy hover:bg-brand-navy/90"
                      onClick={resume}
                      disabled={connectDisabled}
                    >
                      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                      Complete onboarding
                    </Button>
                  ) : null}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    onClick={sync}
                    disabled={pending || !status.accountId}
                  >
                    <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
                    Refresh status
                  </Button>
                </div>

                {isActive ? (
                  <dl className="grid grid-cols-2 gap-2 text-left text-sm">
                    <StatusItem label="Charges" ok={status.chargesEnabled} />
                    <StatusItem label="Payouts" ok={status.payoutsEnabled} />
                    <StatusItem label="Details submitted" ok={status.detailsSubmitted} />
                    <StatusItem label="Online pay" ok={status.canAcceptPayments} />
                  </dl>
                ) : null}

                {status.accountId ? (
                  <p className="text-center font-mono text-xs text-muted-foreground">
                    {status.accountId}
                  </p>
                ) : null}
              </>
            )}

            {platform.platformFallbackAllowed && !status.usingConnect && platform.enabled ? (
              <p className="rounded-md border border-dashed border-amber-300 bg-amber-50/50 px-3 py-2 text-left text-xs text-amber-900">
                Dev mode: invoice pay may use the platform Stripe account until Connect is active.
                Set <span className="font-mono">STRIPE_CONNECT_REQUIRE_ACTIVE=true</span> to gate
                payments in development.
              </p>
            ) : null}

            {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

            {isActive ? (
              <div className="border-t pt-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={disconnect}
                  disabled={pending}
                >
                  Disconnect Stripe
                </Button>
                {disconnectMsg ? (
                  <p className="mt-2 text-left text-xs text-muted-foreground">{disconnectMsg}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">Shop Stripe account</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform-managed Stripe Express — customer payments settle to your shop bank account.
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {returnBanner}

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <StatusItem label="Charges enabled" ok={status.chargesEnabled} />
        <StatusItem label="Payouts enabled" ok={status.payoutsEnabled} />
        <StatusItem label="Details submitted" ok={status.detailsSubmitted} />
        <StatusItem
          label="Online pay active"
          ok={status.canAcceptPayments}
          note={status.usingConnect ? "Connect" : status.canAcceptPayments ? "Dev fallback" : undefined}
        />
      </dl>

      {status.accountId ? (
        <p className="font-mono text-xs text-muted-foreground">Account: {status.accountId}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!addendumAccepted && paymentAddendumVersion ? (
          <PaymentAddendumGate
            version={paymentAddendumVersion}
            onAccepted={() => setAddendumAccepted(true)}
          />
        ) : null}
        {showConnect ? (
          <Button
            className="gap-2 bg-brand-navy hover:bg-brand-navy/90"
            onClick={connect}
            disabled={connectDisabled || !prereqs.ready}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Connect with Stripe
          </Button>
        ) : null}
        {showResume ? (
          <Button variant="outline" className="gap-2" onClick={resume} disabled={connectDisabled}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Complete onboarding
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={sync} disabled={pending}>
          <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
          Refresh status
        </Button>
        {status.canOpenExpressDashboard ? (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={openDashboard} disabled={pending}>
            Express Dashboard
            <ExternalLink className="size-3.5" />
          </Button>
        ) : null}
      </div>

      {!platform.enabled ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Platform Stripe is not configured — contact ShopRally support to enable Connect.
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}

function ConnectPrereqsForm({
  prereqs,
  disabled,
}: {
  prereqs: ConnectPrerequisites;
  disabled: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const p = prereqs.profile;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveProfileAndStartStripeConnect({
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? "") || null,
        taxId: String(fd.get("taxId") ?? "") || null,
        address: String(fd.get("address") ?? "") || null,
        address2: String(fd.get("address2") ?? "") || null,
        city: String(fd.get("city") ?? "") || null,
        state: String(fd.get("state") ?? "") || null,
        zip: String(fd.get("zip") ?? "") || null,
      });
      if (res.ok) window.location.href = res.url;
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-left">
      <div>
        <h3 className="text-sm font-semibold">Before Stripe — confirm shop details</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          We prefill Stripe Express onboarding from your shop profile. EIN is optional here; Stripe
          may still collect tax ID during onboarding.
        </p>
      </div>

      <ul className="space-y-1.5">
        {(["name", "email", "address", "city", "state", "zip"] as const).map((field) => {
          const done = !prereqs.missing.includes(field);
          return (
            <li key={field} className="flex items-center gap-2 text-xs">
              {done ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className={done ? "text-muted-foreground" : "font-medium"}>
                {PREREQ_LABELS[field]}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Legal business name *" name="name" defaultValue={p.name} required />
        <Field label="Owner email *" name="email" type="email" defaultValue={p.email ?? ""} required />
        <Field label="EIN (optional)" name="taxId" defaultValue={p.taxId ?? ""} className="sm:col-span-2" />
        <Field label="Street address *" name="address" defaultValue={p.address ?? ""} required className="sm:col-span-2" />
        <Field label="Suite / unit" name="address2" defaultValue={p.address2 ?? ""} className="sm:col-span-2" />
        <Field label="City *" name="city" defaultValue={p.city ?? ""} required />
        <Field label="State *" name="state" defaultValue={p.state ?? ""} required maxLength={2} />
        <Field label="ZIP *" name="zip" defaultValue={p.zip ?? ""} required />
      </div>

      <Button
        type="submit"
        className="w-full bg-brand-navy hover:bg-brand-navy/90"
        disabled={disabled || pending}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Save &amp; continue to Stripe
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
  className,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  className?: string;
  maxLength?: number;
}) {
  return (
    <label className={`block space-y-1 ${className ?? ""}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
    </label>
  );
}

function OnboardingChecklist() {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-3 text-left text-sm">
      <p className="font-medium">Stripe will collect</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
        {STRIPE_COLLECTS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function RequirementsAlert({ status }: { status: ShopStripeStatus }) {
  const items = [...status.requirementsPastDue, ...status.requirementsCurrentlyDue];
  if (!items.length && !status.disabledReason) return null;
  return (
    <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-left text-sm text-orange-900">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>
          {status.disabledReason ? (
            <p className="font-medium">Disabled: {status.disabledReason.replace(/_/g, " ")}</p>
          ) : (
            <p className="font-medium">Outstanding requirements</p>
          )}
          {items.length ? (
            <ul className="mt-1 list-inside list-disc text-xs">
              {items.slice(0, 5).map((r) => (
                <li key={r}>{r.replace(/_/g, " ")}</li>
              ))}
              {items.length > 5 ? <li>+{items.length - 5} more</li> : null}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReturnBanner({
  synced,
  onSync,
  pending,
}: {
  synced: boolean;
  onSync: () => void;
  pending: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2 text-left text-sm ${
        synced
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-brand-light/30 bg-brand-light/10 text-brand-navy"
      }`}
    >
      {synced ? (
        <p className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-4" />
          Stripe onboarding complete — your shop can accept online payments.
        </p>
      ) : (
        <>
          Returned from Stripe — status may take a moment to update.{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={onSync}
            disabled={pending}
          >
            Refresh status
          </button>
        </>
      )}
    </div>
  );
}

function PlatformScopeNotice() {
  return (
    <div className="flex gap-3 rounded-lg border border-brand-navy/20 bg-brand-navy/5 px-4 py-3 text-sm">
      <Shield className="mt-0.5 size-5 shrink-0 text-brand-navy" />
      <div>
        <p className="font-medium text-brand-navy">Platform-managed Connect Express</p>
        <p className="mt-0.5 text-muted-foreground">
          ShopRally creates and owns the relationship with your Stripe Express account. You complete
          onboarding here; customer card payments on invoices route to your shop. Use the Express
          Dashboard only for payouts and disputes — not as a general Stripe account.
        </p>
      </div>
    </div>
  );
}

function PlatformNotConfigured({ platform }: { platform: PlatformStripeConfig }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">Stripe Connect unavailable</p>
      <p className="mt-1">
        ShopRally platform ops must set a Connect-enabled{" "}
        <span className="font-mono text-xs">STRIPE_SECRET_KEY</span> before shops can onboard.
        {platform.mode === "none" ? " No key is configured." : null}
      </p>
    </div>
  );
}

function PlatformWebhookWarning() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">Webhook recommended</p>
      <p className="mt-1">
        Add <span className="font-mono text-xs">STRIPE_WEBHOOK_SECRET</span> and register{" "}
        <span className="font-mono text-xs">account.updated</span> +{" "}
        <span className="font-mono text-xs">checkout.session.completed</span> so Connect status and
        invoice payments sync automatically.
      </p>
    </div>
  );
}

function StatusItem({
  label,
  ok,
  note,
}: {
  label: string;
  ok: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium ${ok ? "text-emerald-700" : "text-muted-foreground"}`}>
        {ok ? "Yes" : "No"}
        {note ? ` · ${note}` : ""}
      </span>
    </div>
  );
}
