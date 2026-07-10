"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Check,
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  updateMessagingSettings,
  type MessagingSettings,
} from "@/server/actions/messaging-settings";
import { VoiceCallLogPanel } from "@/components/settings/voice-call-log-panel";
import { acceptSmsAddendum } from "@/server/actions/legal";
import { PLANS } from "@/lib/plans";
import { sendShopTestSms, syncShopTwilioWebhooks } from "@/server/actions/platform-sms";
import type { ShopSmsSetupStatus } from "@/lib/sms-constants";

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

const SETUP_META: Record<
  ShopSmsSetupStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  configured: { label: "Configured", variant: "default" },
  pending_port: { label: "Pending port", variant: "outline" },
  not_configured: { label: "Not configured", variant: "secondary" },
};

export function MessagingSettingsPanel({ initial }: { initial: MessagingSettings }) {
  const [step, setStep] = useState(1);
  const [landline, setLandline] = useState(initial.landlineNumber ?? "");
  const [twilio, setTwilio] = useState(initial.twilioPhoneNumber ?? "");
  const [messagingSid, setMessagingSid] = useState(initial.twilioMessagingServiceSid ?? "");
  const [optOutFooter, setOptOutFooter] = useState(initial.smsOptOutFooter ?? "");
  const [smsEnabled, setSmsEnabled] = useState(initial.smsEnabled);
  const [aiSmsAgentEnabled, setAiSmsAgentEnabled] = useState(initial.aiSmsAgentEnabled);
  const [aiVoiceAgentEnabled, setAiVoiceAgentEnabled] = useState(initial.aiVoiceAgentEnabled);
  const [addendumAccepted, setAddendumAccepted] = useState(initial.smsAddendumAccepted);
  const [addendumChecked, setAddendumChecked] = useState(false);
  const [tcpaAcknowledged, setTcpaAcknowledged] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [webhookSyncResult, setWebhookSyncResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const setupMeta = SETUP_META[initial.setupStatus];

  function acceptLegal(onSuccess?: () => void) {
    setError(null);
    start(async () => {
      const res = await acceptSmsAddendum({
        accepted: addendumChecked,
        tcpaAcknowledged,
      });
      if (res.ok) {
        setAddendumAccepted(true);
        onSuccess?.();
      } else {
        setError(res.error);
      }
    });
  }

  function save(onSuccess?: () => void) {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateMessagingSettings({
        landlineNumber: landline,
        twilioPhoneNumber: twilio,
        twilioMessagingServiceSid: messagingSid,
        smsOptOutFooter: optOutFooter,
        smsEnabled,
        aiSmsAgentEnabled,
        aiVoiceAgentEnabled,
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        onSuccess?.();
      } else setError(res.error);
    });
  }

  function sendTest() {
    setTestResult(null);
    setError(null);
    start(async () => {
      const saveRes = await updateMessagingSettings({
        landlineNumber: landline,
        twilioPhoneNumber: twilio,
        twilioMessagingServiceSid: messagingSid,
        smsOptOutFooter: optOutFooter,
        smsEnabled,
        aiSmsAgentEnabled,
        aiVoiceAgentEnabled,
      });
      if (!saveRes.ok) {
        setError(saveRes.error);
        return;
      }
      const res = await sendShopTestSms({ toPhone: testPhone });
      if (res.ok) {
        setTestResult(res.mode === "live" ? "Test sent via Twilio." : "Test recorded (mock mode).");
      } else {
        setError(res.error);
      }
    });
  }

  function syncWebhooks() {
    setWebhookSyncResult(null);
    setError(null);
    start(async () => {
      const res = await syncShopTwilioWebhooks();
      if (res.ok) {
        setWebhookSyncResult("SMS and Voice webhooks pushed to Twilio.");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy/8 text-brand-navy">
          <MessageSquare className="size-4" aria-hidden />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">Phone &amp; SMS</h2>
            <Badge variant={setupMeta.variant}>{setupMeta.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Managed by ShopRally platform — your shop number, isolated from other shops. Inbound texts
            route to this shop only; outbound CRM texts send from your assigned Twilio number.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Phone className="size-4 text-brand-navy" />
          <h3 className="font-medium">Platform status</h3>
          <Badge variant={initial.platformTwilioConfigured ? "default" : "secondary"}>
            {initial.platformTwilioConfigured ? "Twilio connected" : "Mock mode"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          ShopRally operates one Twilio account at the platform level. Each shop gets its own
          SMS-enabled number for send/receive — never a shared global line in production.
        </p>
        {!initial.platformTwilioConfigured ? (
          <p className="mt-2 text-xs text-amber-800">
            Platform admin: set <code className="rounded bg-muted px-1">TWILIO_ACCOUNT_SID</code> and{" "}
            <code className="rounded bg-muted px-1">TWILIO_AUTH_TOKEN</code> in{" "}
            <code className="rounded bg-muted px-1">.env</code>. Messages are stored locally until then.
          </p>
        ) : null}
      </div>

      <WizardSteps
        current={step}
        onSelect={setStep}
        completed={{
          1: Boolean(twilio.trim() || initial.twilioPhoneNumber),
          2: Boolean(twilio.trim() || initial.twilioPhoneNumber),
          3: addendumAccepted,
          4: smsEnabled,
        }}
      />

      {step === 1 ? (
        <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="font-medium">Step 1 — Enter or port your number</h3>
          <p className="text-sm text-muted-foreground">
            Port your existing shop landline to Twilio, or enter a number ShopRally assigned after
            provisioning. See <code className="rounded bg-muted px-1 text-xs">docs/two-way-sms.md</code> in
            the repository for porting steps.
          </p>

          <Field label="Landline number (marketing / display)">
            <input
              className={inputCls}
              placeholder="(555) 123-4567"
              value={landline}
              onChange={(e) => setLandline(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Your published shop phone — reference only while porting is in progress.
            </p>
          </Field>

          <Field label="Twilio SMS number (E.164)">
            <input
              className={inputCls}
              placeholder="+15551234567"
              value={twilio}
              onChange={(e) => setTwilio(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Assigned by ShopRally platform admin or entered after your port completes. Must be unique
              per shop.
            </p>
          </Field>

          <Field label="Messaging Service SID (optional)">
            <input
              className={inputCls}
              placeholder="MGxxxxxxxx"
              value={messagingSid}
              onChange={(e) => setMessagingSid(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              For A2P 10DLC campaigns — usually set at platform level; override only if your shop has a
              dedicated Messaging Service.
            </p>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => save()} disabled={pending}>
              Save step
            </Button>
            <Button size="sm" onClick={() => save(() => setStep(2))} disabled={pending}>
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="font-medium">Step 2 — Verify webhooks</h3>
          <p className="text-sm text-muted-foreground">
            In Twilio Console → Phone Numbers → your number, set the SMS and Voice webhook URLs below.
            Platform admin provisioning sets these automatically for new numbers.
          </p>

          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs">
            <span className="font-medium text-foreground">SMS webhook URL</span>
            <code className="mt-1 block break-all">{initial.webhookUrl}</code>
          </div>

          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs">
            <span className="font-medium text-foreground">Voice webhook URL</span>
            <code className="mt-1 block break-all">{initial.voiceWebhookUrl}</code>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>HTTP method: POST</li>
            <li>
              App origin: <code className="rounded bg-muted px-1">{initial.appUrl}</code>
            </li>
            <li>Inbound <code className="rounded bg-muted px-1">To</code> must match your shop Twilio number</li>
          </ul>

          {initial.platformTwilioConfigured && (twilio.trim() || initial.twilioPhoneNumber) ? (
            <div className="rounded-md border border-dashed bg-muted/20 p-3">
              <p className="text-sm font-medium">Already have a number?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Numbers assigned before voice receptionist shipped may only have the SMS webhook. Push
                both URLs to Twilio in one click.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={pending}
                onClick={syncWebhooks}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Sync webhooks to Twilio
              </Button>
              {webhookSyncResult ? (
                <p className="mt-2 text-xs text-emerald-600">{webhookSyncResult}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-between gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button size="sm" onClick={() => setStep(3)} disabled={pending}>
              Webhook configured — continue
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="font-medium">Step 3 — Legal &amp; TCPA compliance</h3>
          <p className="text-sm text-muted-foreground">
            Before enabling SMS, your shop must accept the SMS &amp; Messaging Addendum and
            acknowledge TCPA responsibilities for customer consent and opt-out handling.
          </p>

          {addendumAccepted ? (
            <p className="flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle2 className="size-4" />
              SMS addendum accepted
              {initial.smsAddendumVersion ? ` (v${initial.smsAddendumVersion})` : ""}
            </p>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-md border bg-background p-3">
                <Checkbox
                  id="sms-addendum"
                  checked={addendumChecked}
                  onCheckedChange={(v) => setAddendumChecked(v === true)}
                />
                <Label htmlFor="sms-addendum" className="cursor-pointer text-sm leading-relaxed">
                  I have read and agree to the{" "}
                  <Link
                    href="/legal/sms-addendum"
                    target="_blank"
                    className="font-medium text-brand-navy hover:underline"
                  >
                    SMS &amp; Messaging Addendum
                  </Link>
                  {initial.smsAddendumVersion ? ` (v${initial.smsAddendumVersion})` : ""} on behalf
                  of my shop.
                </Label>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-brand-red/20 bg-brand-red/5 p-3">
                <Checkbox
                  id="tcpa-ack"
                  checked={tcpaAcknowledged}
                  onCheckedChange={(v) => setTcpaAcknowledged(v === true)}
                />
                <Label htmlFor="tcpa-ack" className="cursor-pointer text-sm leading-relaxed">
                  I acknowledge that my shop is responsible for obtaining proper customer consent
                  before sending marketing or automated SMS messages, honoring STOP/opt-out requests
                  promptly, and maintaining TCPA-compliant records.
                </Label>
              </div>

              <Button
                size="sm"
                className="bg-brand-navy hover:bg-brand-navy/90"
                disabled={pending || !addendumChecked || !tcpaAcknowledged}
                onClick={() => acceptLegal(() => setStep(4))}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Accept addendum &amp; continue
              </Button>
            </>
          )}

          <div className="flex justify-between gap-2 border-t pt-4">
            <Button size="sm" variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            {addendumAccepted ? (
              <Button size="sm" onClick={() => setStep(4)}>
                Continue
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="font-medium">Step 4 — Enable SMS &amp; test</h3>

          <Field label="Opt-out footer (appended to outbound texts)">
            <input
              className={inputCls}
              value={optOutFooter}
              onChange={(e) => setOptOutFooter(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              TCPA compliance — appended when the message does not already mention STOP.
            </p>
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={(e) => setSmsEnabled(e.target.checked)}
              disabled={!addendumAccepted}
              className="size-4 rounded border-input disabled:opacity-50"
            />
            Enable 2-way SMS for this shop
          </label>
          {!addendumAccepted ? (
            <p className="text-xs text-amber-800">
              Complete Step 3 (legal acceptance) before enabling SMS.
            </p>
          ) : null}

          {initial.aiReceptionist ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-brand-light/40 bg-brand-light/10 p-3">
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox
                    checked={aiSmsAgentEnabled}
                    disabled={!smsEnabled || pending}
                    onCheckedChange={(v) => setAiSmsAgentEnabled(v === true)}
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-medium text-brand-navy">
                      <Sparkles className="size-3.5" />
                      AI after-hours SMS agent
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      When the shop is closed, inbound texts get an AI reply that can capture name,
                      concern, and book an appointment into your calendar. Human staff handle messages
                      during open hours.
                    </span>
                  </span>
                </label>
              </div>

              <div className="rounded-lg border border-brand-light/40 bg-brand-light/10 p-3">
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox
                    checked={aiVoiceAgentEnabled}
                    disabled={!twilio.trim() || pending}
                    onCheckedChange={(v) => setAiVoiceAgentEnabled(v === true)}
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-medium text-brand-navy">
                      <Phone className="size-3.5" />
                      AI after-hours voice receptionist
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      When closed, inbound calls hear a recording consent message, then an AI receptionist
                      that can schedule service. During open hours, calls forward to your landline when
                      configured.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              AI after-hours SMS and voice receptionist are included on {PLANS.ENTERPRISE.name}.{" "}
              <Link href="/billing" className="text-brand-navy hover:underline">
                Upgrade plan
              </Link>
            </p>
          )}

          {initial.smsConfiguredAt ? (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              Configured {new Date(initial.smsConfiguredAt).toLocaleDateString()}
            </p>
          ) : null}

          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium">Send test to your phone</p>
            <div className="flex flex-wrap gap-2">
              <input
                className={`${inputCls} max-w-xs`}
                placeholder="+15551234567"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <Button size="sm" variant="outline" className="gap-1.5" onClick={sendTest} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
                Send test
              </Button>
            </div>
            {testResult ? <p className="mt-2 text-xs text-emerald-600">{testResult}</p> : null}
          </div>

          <div className="flex justify-between gap-2 border-t pt-4">
            <Button size="sm" variant="outline" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button size="sm" onClick={() => save()} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save &amp; finish
            </Button>
          </div>
        </div>
      ) : null}

      <VoiceCallLogPanel calls={initial.voiceCallLogs} />

      <div className="rounded-lg border border-dashed bg-muted/30 p-4">
        <div className="flex items-start gap-2">
          <MessageSquare className="mt-0.5 size-4 text-brand-navy" />
          <div className="text-sm">
            <p className="font-medium">Need a number?</p>
            <p className="mt-1 text-muted-foreground">
              Contact ShopRally support or ask your platform admin to provision a test number from{" "}
              <Link href="/platform/shops" className="font-medium text-brand-navy hover:underline">
                Platform → Shops
              </Link>
              .
            </p>
            <a
              href="https://www.twilio.com/docs/messaging/guides/how-to-use-your-free-trial-account"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
            >
              Twilio trial account guide
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
        {saved ? (
          <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600">
            <Check className="size-3.5" /> Saved
          </span>
        ) : null}
      </div>
    </div>
  );
}

function WizardSteps({
  current,
  onSelect,
  completed,
}: {
  current: number;
  onSelect: (step: number) => void;
  completed: Record<1 | 2 | 3 | 4, boolean>;
}) {
  const steps = [
    { n: 1 as const, label: "Number" },
    { n: 2 as const, label: "Webhook" },
    { n: 3 as const, label: "Legal" },
    { n: 4 as const, label: "Enable" },
  ];
  return (
    <ol className="flex gap-2" aria-label="Phone & SMS setup steps">
      {steps.map((s) => {
        const done = completed[s.n];
        const active = current === s.n;
        return (
          <li key={s.n} className="flex-1">
            <button
              type="button"
              onClick={() => onSelect(s.n)}
              aria-current={active ? "step" : undefined}
              className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:border-brand-navy/40 hover:bg-brand-navy/5 ${
                active
                  ? "border-brand-navy bg-brand-navy/5 font-medium text-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {done ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Circle
                  className={`size-4 shrink-0 ${active ? "text-brand-navy" : "text-muted-foreground"}`}
                  aria-hidden
                />
              )}
              {s.label}
            </button>
          </li>
        );
      })}
    </ol>
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
