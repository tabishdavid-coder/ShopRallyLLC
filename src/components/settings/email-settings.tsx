"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  Send,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  sendShopTestEmail,
  updateEmailSettings,
  type EmailSettings,
} from "@/server/actions/email-settings";

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

const SETUP_META = {
  not_configured: { label: "Not configured", variant: "secondary" as const },
  disabled: { label: "Disabled", variant: "outline" as const },
  ready: { label: "Ready", variant: "default" as const },
};

export function EmailSettingsPanel({ initial }: { initial: EmailSettings }) {
  const [fromName, setFromName] = useState(initial.emailFromName ?? initial.shopName);
  const [fromAddress, setFromAddress] = useState(initial.emailFromAddress ?? initial.shopEmail ?? "");
  const [replyTo, setReplyTo] = useState(initial.emailReplyTo ?? "");
  const [emailEnabled, setEmailEnabled] = useState(initial.emailEnabled);
  const [testEmail, setTestEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const setupMeta = SETUP_META[initial.setupStatus];

  function save(onSuccess?: () => void) {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateEmailSettings({
        emailFromName: fromName,
        emailFromAddress: fromAddress,
        emailReplyTo: replyTo,
        emailEnabled,
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        onSuccess?.();
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
        setTestResult(
          res.mode === "live"
            ? "Test email sent via Resend."
            : "Test recorded (mock mode — check server logs).",
        );
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Email</h2>
          <Badge variant={setupMeta.variant}>{setupMeta.label}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Send estimates, invoices, maintenance plan links, and campaigns from your shop&apos;s own
          email address — not a generic ShopRally address.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="size-4 text-brand-navy" />
          <h3 className="font-medium">Platform status</h3>
          <Badge variant={initial.platformResendConfigured ? "default" : "secondary"}>
            {initial.platformResendConfigured ? "Resend connected" : "Mock mode"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          ShopRally uses one Resend account at the platform level. Each shop sends from its own
          verified domain or address — configure yours below.
        </p>
        {!initial.platformResendConfigured ? (
          <p className="mt-2 text-xs text-amber-900">
            Platform admin: set <code className="rounded bg-muted px-1">RESEND_API_KEY</code> in{" "}
            <code className="rounded bg-muted px-1">.env</code>. Until then, email shares open your
            mail app (mailto fallback).
          </p>
        ) : null}
      </div>

      {!initial.platformResendConfigured || initial.setupStatus !== "ready" ? (
        <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            {initial.setupStatus === "disabled"
              ? "Shop email is saved but disabled. Enable it below to send from CRM."
              : "Email not fully configured — CRM sends will use your mail app until you save a from address and enable shop email."}
          </p>
        </div>
      ) : null}

      <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="font-medium">Outbound identity</h3>
        <p className="text-sm text-muted-foreground">
          Use an address on a domain you control (e.g.{" "}
          <code className="rounded bg-muted px-1 text-xs">service@inandoutautohaus.com</code>). Verify
          the domain in{" "}
          <a
            href="https://resend.com/domains"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-brand-navy hover:underline"
          >
            Resend Domains
            <ExternalLink className="size-3" />
          </a>{" "}
          before going live.
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

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(e) => setEmailEnabled(e.target.checked)}
            className="size-4 rounded border-input"
          />
          Enable shop email for CRM sends
        </label>

        {initial.emailConfiguredAt ? (
          <p className="flex items-center gap-1.5 text-xs text-emerald-700">
            <CheckCircle2 className="size-3.5" />
            Configured {new Date(initial.emailConfiguredAt).toLocaleDateString()}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="font-medium">Send test email</h3>
        <p className="text-sm text-muted-foreground">
          Verify your from address and domain setup. Leave blank to send to your account email.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            className={`${inputCls} max-w-sm`}
            placeholder="you@yourshop.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <Button size="sm" variant="outline" className="gap-1.5" onClick={sendTest} disabled={pending}>
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
