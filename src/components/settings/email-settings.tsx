"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deriveShopEmailSetupStatus } from "@/lib/email-constants";
import {
  sendShopTestEmail,
  updateEmailSettings,
  type EmailSettings,
} from "@/server/actions/email-settings";

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

const SETUP_META = {
  not_configured: { label: "Not ready for Share", variant: "secondary" as const },
  disabled: { label: "Not ready for Share", variant: "outline" as const },
  ready: { label: "Ready for Share", variant: "default" as const },
};

export function EmailSettingsPanel({ initial }: { initial: EmailSettings }) {
  const router = useRouter();
  const [fromName, setFromName] = useState(initial.emailFromName ?? initial.shopName);
  const [fromAddress, setFromAddress] = useState(initial.emailFromAddress ?? initial.shopEmail ?? "");
  const [replyTo, setReplyTo] = useState(
    initial.emailReplyTo ?? initial.shopEmail ?? "",
  );
  const [emailEnabled, setEmailEnabled] = useState(initial.emailEnabled);
  const [testEmail, setTestEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const liveStatus = useMemo(
    () =>
      deriveShopEmailSetupStatus({
        emailFromAddress: fromAddress.trim() || null,
        emailEnabled,
        platformResendConfigured: initial.platformResendConfigured,
      }),
    [fromAddress, emailEnabled, initial.platformResendConfigured],
  );
  const setupMeta = SETUP_META[liveStatus];
  const hasFromAddress = Boolean(fromAddress.trim());
  const canEnable = hasFromAddress && !emailEnabled;

  function save(opts?: { enable?: boolean; onSuccess?: () => void }) {
    setError(null);
    setSaved(false);
    const nextEnabled = opts?.enable ? true : emailEnabled;
    start(async () => {
      const res = await updateEmailSettings({
        emailFromName: fromName,
        emailFromAddress: fromAddress,
        emailReplyTo: replyTo,
        emailEnabled: nextEnabled,
      });
      if (res.ok) {
        if (opts?.enable) setEmailEnabled(true);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        router.refresh();
        opts?.onSuccess?.();
      } else {
        setError(res.error);
      }
    });
  }

  function sendTest() {
    setTestResult(null);
    setError(null);
    start(async () => {
      const saveRes = await updateEmailSettings({
        emailFromName: fromName,
        emailFromAddress: fromAddress,
        emailReplyTo: replyTo,
        emailEnabled,
      });
      if (!saveRes.ok) {
        setError(saveRes.error);
        return;
      }
      const res = await sendShopTestEmail({ toEmail: testEmail || undefined });
      if (res.ok) {
        setEmailEnabled(true);
        setTestResult(
          res.mode === "live"
            ? "Test email sent via Resend. Shop email is enabled — Ready for Share."
            : "Test recorded (mock mode — check server logs). Shop email is enabled for CRM sends.",
        );
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy/8 text-brand-navy">
          <Mail className="size-4" aria-hidden />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">Email</h2>
            <Badge variant={setupMeta.variant}>{setupMeta.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Your shop owns this address. Enter your business email before go-live — customers see it as
            From / Reply-to on estimates, invoices, and other CRM messages (not a generic ShopRally
            address).
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-brand-navy/15 bg-brand-navy/[0.03] p-4 text-sm">
        <p className="font-medium text-brand-navy">Before go-live</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Enter your shop From name and business From email (and Reply-to if different).</li>
          <li>
            Verify that domain in{" "}
            <a
              href="https://resend.com/domains"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-navy hover:underline"
            >
              Resend Domains
            </a>{" "}
            (platform ops).
          </li>
          <li>Send a test email — success enables shop email and marks you Ready for Share.</li>
        </ol>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="size-4 text-brand-navy" />
          <h3 className="font-medium">Platform transport</h3>
          <Badge variant={initial.platformResendConfigured ? "default" : "secondary"}>
            {initial.platformResendConfigured ? "Resend connected" : "Mock mode"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          ShopRally sends through one platform Resend account. Identity (From / Reply-to) is always
          yours.
        </p>
        {!initial.platformResendConfigured ? (
          <p className="mt-2 text-xs text-amber-900">
            Platform admin: set <code className="rounded bg-muted px-1">RESEND_API_KEY</code> in{" "}
            <code className="rounded bg-muted px-1">.env</code>. Until then, email shares open your
            mail app (mailto fallback).
          </p>
        ) : null}
      </div>

      {liveStatus !== "ready" ? (
        <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            {liveStatus === "disabled"
              ? "From address is saved but shop email is off. Enable below or send a test to go live for Share."
              : "Not ready for Share yet — save your business From email, enable shop email (or send a test), and ensure Resend is connected."}
          </p>
        </div>
      ) : (
        <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>
            Ready for Share — estimate and invoice emails will send from{" "}
            <span className="font-medium">{fromAddress.trim()}</span>.
          </p>
        </div>
      )}

      <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="font-medium">Outbound identity</h3>
        <p className="text-sm text-muted-foreground">
          Use an address on a domain you control (e.g.{" "}
          <code className="rounded bg-muted px-1 text-xs">service@inandoutautohaus.com</code>).
        </p>

        <Field label="From name">
          <input
            className={inputCls}
            placeholder={initial.shopName}
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Display name customers see in their inbox.
          </p>
        </Field>

        <Field label="From email">
          <input
            type="email"
            className={inputCls}
            placeholder="service@yourshop.com"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
          />
        </Field>

        <Field label="Reply-to email (optional)">
          <input
            type="email"
            className={inputCls}
            placeholder="Same as from email"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Where customer replies go if different from the from address.
          </p>
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Shop email enabled for CRM sends
          </label>
          {canEnable ? (
            <Button
              type="button"
              size="sm"
              className="bg-brand-navy"
              disabled={pending}
              onClick={() => save({ enable: true })}
            >
              Enable shop email
            </Button>
          ) : null}
        </div>

        {initial.emailConfiguredAt ? (
          <p className="flex items-center gap-1.5 text-xs text-emerald-700">
            <CheckCircle2 className="size-3.5" />
            First enabled {new Date(initial.emailConfiguredAt).toLocaleDateString()}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="font-medium">Send test email</h3>
        <p className="text-sm text-muted-foreground">
          Save your From address first, then send a test. A successful test turns on shop email
          automatically.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            className={`${inputCls} max-w-sm`}
            placeholder="you@yourshop.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={sendTest}
            disabled={pending || !hasFromAddress}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
            Send test
          </Button>
        </div>
        {testResult ? <p className="text-xs text-emerald-600">{testResult}</p> : null}
      </div>

      <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm">
        <p className="font-medium">What uses shop email?</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Share estimate / invoice / inspection links</li>
          <li>Maintenance plan signup links</li>
          <li>Marketing campaigns &amp; automations (when email channel is selected)</li>
          <li>Online booking confirmations to customers</li>
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Internal alerts (e.g. RO authorization to your team) use Settings → Notifications.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
        {saved ? (
          <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600">
            <Check className="size-3.5" /> Saved
          </span>
        ) : null}
        <Button onClick={() => save()} disabled={pending} className="gap-2 bg-brand-navy">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save email settings
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
