"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CAMPAIGN_CHANNEL_LABEL,
  CAMPAIGN_TEMPLATES,
  getCampaignTemplate,
  MERGE_FIELDS,
  type AudienceFilter,
} from "@/lib/campaigns";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import {
  createCampaign,
  draftCampaignMessage,
  launchCampaign,
  previewAudienceCountAction,
  sendTestCampaign,
} from "@/server/actions/campaigns";
import type { CampaignChannel, CampaignType } from "@/generated/prisma";

const STEPS = ["Type", "Audience", "Message", "Schedule", "Review"] as const;

export function CampaignWizard({
  initialType,
  aiCampaignDrafting,
}: {
  initialType?: string;
  aiCampaignDrafting: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [draftPending, startDraft] = useTransition();

  const template = getCampaignTemplate((initialType as CampaignType) ?? "CUSTOM") ?? CAMPAIGN_TEMPLATES[4];

  const [name, setName] = useState(template.name);
  const [type, setType] = useState<CampaignType>(template.type);
  const [channel, setChannel] = useState<CampaignChannel>(template.channel);
  const [audience, setAudience] = useState<AudienceFilter>(template.defaultAudience);
  const [message, setMessage] = useState(template.defaultMessage);
  const [emailSubject, setEmailSubject] = useState(template.defaultEmailSubject ?? "");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  const refreshCount = useCallback(() => {
    previewAudienceCountAction(audience).then((r) => {
      if (r.ok && r.data) setAudienceCount(r.data.count);
    });
  }, [audience]);

  useEffect(() => {
    if (step === 1) refreshCount();
  }, [step, refreshCount]);

  function applyType(next: CampaignType) {
    const t = getCampaignTemplate(next);
    if (!t) return;
    setType(next);
    setName(t.name);
    setChannel(t.channel);
    setAudience(t.defaultAudience);
    setMessage(t.defaultMessage);
    setEmailSubject(t.defaultEmailSubject ?? "");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createCampaign({
        name,
        type,
        channel,
        audienceFilter: audience,
        messageTemplate: message,
        emailSubject: channel === "EMAIL" || channel === "BOTH" ? emailSubject : undefined,
        scheduledAt:
          scheduleMode === "later" && scheduledAt
            ? new Date(scheduledAt).toISOString()
            : undefined,
      });
      if (!result.ok || !result.data?.id) {
        setError(result.ok ? "Failed to create campaign." : result.error);
        return;
      }

      if (scheduleMode === "now") {
        const launch = await launchCampaign(result.data.id);
        if (!launch.ok) {
          router.push(`/marketing/campaigns/${result.data.id}?error=${encodeURIComponent(launch.error)}`);
          return;
        }
      }

      router.push(`/marketing/campaigns/${result.data.id}`);
    });
  }

  function sendTest() {
    setTestSent(false);
    startTransition(async () => {
      const result = await sendTestCampaign(
        message,
        channel,
        emailSubject || undefined,
      );
      if (result.ok) setTestSent(true);
      else setError(result.error);
    });
  }

  function generateWithAi() {
    setError(null);
    startDraft(async () => {
      const result = await draftCampaignMessage({
        name,
        type,
        channel,
        currentMessage: message,
        currentEmailSubject: emailSubject || undefined,
      });
      if (!result.ok || !result.data) {
        setError(result.ok ? "Could not generate a draft." : result.error);
        return;
      }
      setMessage(result.data.message);
      if (result.data.emailSubject && (channel === "EMAIL" || channel === "BOTH")) {
        setEmailSubject(result.data.emailSubject);
      }
    });
  }

  const smsCharCount = channel === "SMS" || channel === "BOTH" ? message.length : null;

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              i === step
                ? "bg-brand-navy text-white"
                : i < step
                  ? "bg-brand-light/40 text-brand-navy"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {i + 1}. {label}
          </button>
        ))}
      </nav>

      {step === 0 ? (
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Campaign name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Campaign type</Label>
              <Select value={type} onValueChange={(v) => applyType(v as CampaignType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_TEMPLATES.map((t) => (
                    <SelectItem key={t.type} value={t.type}>
                      {t.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as CampaignChannel)}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CAMPAIGN_CHANNEL_LABEL) as CampaignChannel[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CAMPAIGN_CHANNEL_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <AudienceFields audience={audience} onChange={setAudience} />
          <div className="flex items-center gap-3 rounded-md bg-brand-light/15 px-3 py-2 text-sm">
            <span className="font-medium text-brand-navy">
              {audienceCount != null ? `~${audienceCount} customers match` : "Calculating…"}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={refreshCount}>
              Refresh
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {aiCampaignDrafting
                ? "Write your message or generate a draft with AI — always review before sending."
                : `Templates included on all campaign plans · AI drafting on ${PLANS.ENTERPRISE.name}.`}
            </p>
            {aiCampaignDrafting ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 border-brand-navy/20 text-brand-navy"
                disabled={draftPending || pending}
                onClick={generateWithAi}
              >
                {draftPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Generate with AI
              </Button>
            ) : (
              <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" asChild>
                <Link href="/billing">
                  <Sparkles className="size-3.5" />
                  AI on {PLANS.ENTERPRISE.name}
                </Link>
              </Button>
            )}
          </div>
          {(channel === "EMAIL" || channel === "BOTH") && (
            <div className="space-y-2">
              <Label>Email subject</Label>
              <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Message</Label>
              {smsCharCount != null ? (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    smsCharCount > 320 ? "text-amber-600" : "text-muted-foreground",
                  )}
                >
                  {smsCharCount} chars{smsCharCount > 320 ? " · long for SMS" : ""}
                </span>
              ) : null}
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MERGE_FIELDS.map((f) => (
              <button
                key={f.key}
                type="button"
                className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium hover:bg-brand-light/30"
                onClick={() => setMessage((m) => `${m}${f.token}`)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={sendTest}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Send test to shop
          </Button>
          {testSent ? (
            <p className="text-sm text-emerald-600">Test sent — check your shop phone/email or server logs.</p>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex gap-3">
            <Button
              type="button"
              variant={scheduleMode === "now" ? "default" : "outline"}
              className={scheduleMode === "now" ? "bg-brand-navy hover:bg-brand-navy/90" : ""}
              onClick={() => setScheduleMode("now")}
            >
              Send now
            </Button>
            <Button
              type="button"
              variant={scheduleMode === "later" ? "default" : "outline"}
              className={scheduleMode === "later" ? "bg-brand-navy hover:bg-brand-navy/90" : ""}
              onClick={() => setScheduleMode("later")}
            >
              Schedule for later
            </Button>
          </div>
          {scheduleMode === "later" ? (
            <div className="space-y-2">
              <Label>Send date & time</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Scheduled campaigns auto-send at the chosen date and time (checked every 15 minutes).
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-3 rounded-lg border bg-card p-4 text-sm">
          <ReviewRow label="Name" value={name} />
          <ReviewRow label="Type" value={type.replaceAll("_", " ")} />
          <ReviewRow label="Channel" value={CAMPAIGN_CHANNEL_LABEL[channel]} />
          <ReviewRow label="Audience" value={audienceCount != null ? `~${audienceCount} customers` : "—"} />
          <ReviewRow label="Schedule" value={
            scheduleMode === "now"
              ? "Send immediately (queued in background)"
              : scheduledAt
                ? `Scheduled for ${scheduledAt} — auto-sends at that time`
                : "Not set"
          } />
          <div className="rounded-md bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap">{message}</div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-between">
        <Button type="button" variant="outline" disabled={step === 0 || pending} onClick={() => setStep((s) => s - 1)}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            className="bg-brand-navy hover:bg-brand-navy/90"
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            className="bg-brand-navy hover:bg-brand-navy/90"
            disabled={pending}
            onClick={submit}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {scheduleMode === "now" ? "Launch campaign" : "Save scheduled campaign"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function AudienceFields({
  audience,
  onChange,
}: {
  audience: AudienceFilter;
  onChange: (a: AudienceFilter) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Last visit (min days ago)</Label>
        <Input
          type="number"
          min={0}
          placeholder="e.g. 365 for win-back"
          value={audience.lastVisitDaysMin ?? ""}
          onChange={(e) =>
            onChange({
              ...audience,
              lastVisitDaysMin: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Visited within (max days)</Label>
        <Input
          type="number"
          min={0}
          placeholder="e.g. 30 for recent visitors"
          value={audience.lastVisitDaysMax ?? ""}
          onChange={(e) =>
            onChange({
              ...audience,
              lastVisitDaysMax: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Customer type</Label>
        <Select
          value={audience.customerType ?? "all"}
          onValueChange={(v) =>
            onChange({ ...audience, customerType: v as AudienceFilter["customerType"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="person">Person</SelectItem>
            <SelectItem value="business">Business</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tags (comma-separated)</Label>
        <Input
          placeholder="VIP, Fleet"
          value={audience.tags?.join(", ") ?? ""}
          onChange={(e) =>
            onChange({
              ...audience,
              tags: e.target.value
                ? e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                : undefined,
            })
          }
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={audience.marketingOptInOnly !== false}
          onChange={(e) => onChange({ ...audience, marketingOptInOnly: e.target.checked })}
        />
        Marketing opt-in only (TCPA)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={audience.requirePhone ?? false}
          onChange={(e) => onChange({ ...audience, requirePhone: e.target.checked })}
        />
        Must have phone (SMS)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={audience.requireEmail ?? false}
          onChange={(e) => onChange({ ...audience, requireEmail: e.target.checked })}
        />
        Must have email
      </label>
    </div>
  );
}

export function CampaignWizardFromUrl({ aiCampaignDrafting }: { aiCampaignDrafting: boolean }) {
  const params = useSearchParams();
  return <CampaignWizard initialType={params.get("type") ?? undefined} aiCampaignDrafting={aiCampaignDrafting} />;
}
