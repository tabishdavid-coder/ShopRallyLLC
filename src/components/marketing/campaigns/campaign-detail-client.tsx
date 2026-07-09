"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Copy,
  Loader2,
  Pause,
  Play,
  Rocket,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CAMPAIGN_CHANNEL_LABEL,
  CAMPAIGN_STATUS_LABEL,
  MERGE_FIELDS,
} from "@/lib/campaigns";
import { GROWTH_ENGINE_BREADCRUMBS } from "@/lib/growth-engine-brand";
import { PLANS } from "@/lib/plans";
import { fmtDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { CampaignDetail } from "@/server/campaigns";
import {
  draftCampaignMessage,
  duplicateCampaign,
  launchCampaign,
  sendTestCampaign,
  updateCampaign,
  updateCampaignStatus,
} from "@/server/actions/campaigns";
import { CampaignStatusBadge } from "@/components/marketing/campaigns/campaign-template-cards";
import type { CampaignChannel, CampaignType } from "@/generated/prisma";

const EDITABLE_STATUSES = new Set(["DRAFT", "SCHEDULED", "PAUSED"]);

export function CampaignDetailClient({
  campaign,
  googleReviewsConnected,
  aiCampaignDrafting,
  launchError,
}: {
  campaign: CampaignDetail;
  googleReviewsConnected: boolean;
  aiCampaignDrafting: boolean;
  launchError?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draftPending, startDraft] = useTransition();
  const [error, setError] = useState<string | null>(launchError ?? null);
  const [success, setSuccess] = useState<string | null>(null);
  const [message, setMessage] = useState(campaign.messageTemplate);
  const [emailSubject, setEmailSubject] = useState(campaign.emailSubject ?? "");
  const [testSent, setTestSent] = useState(false);
  const [dirty, setDirty] = useState(false);

  const isEditable = EDITABLE_STATUSES.has(campaign.status);
  const channel = campaign.channel as CampaignChannel;
  const smsCharCount = channel === "SMS" || channel === "BOTH" ? message.length : null;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Action failed.");
      else {
        setSuccess(
          campaign.status === "SCHEDULED"
            ? "Campaign queued — messages will send in the background."
            : "Campaign queued for delivery.",
        );
        router.refresh();
      }
    });
  }

  const canLaunch = ["DRAFT", "SCHEDULED", "PAUSED"].includes(campaign.status);
  const reviewBlocked =
    campaign.type === "REVIEW_REQUEST" && !googleReviewsConnected;

  function saveMessage() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateCampaign({
        id: campaign.id,
        name: campaign.name,
        type: campaign.type as CampaignType,
        channel,
        audienceFilter: campaign.audienceFilter,
        messageTemplate: message,
        emailSubject: channel === "EMAIL" || channel === "BOTH" ? emailSubject : undefined,
        scheduledAt: campaign.scheduledAt
          ? new Date(campaign.scheduledAt).toISOString()
          : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDirty(false);
      setSuccess("Message saved.");
      router.refresh();
    });
  }

  function generateWithAi() {
    setError(null);
    startDraft(async () => {
      const result = await draftCampaignMessage({
        name: campaign.name,
        type: campaign.type as CampaignType,
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
      setDirty(true);
    });
  }

  function sendTest() {
    setTestSent(false);
    setError(null);
    startTransition(async () => {
      const result = await sendTestCampaign(message, channel, emailSubject || undefined);
      if (result.ok) setTestSent(true);
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="mb-2 text-sm text-muted-foreground">
            <Link href="/marketing" className="hover:text-primary">
              {GROWTH_ENGINE_BREADCRUMBS.hub}
            </Link>
            <span className="mx-1">/</span>
            <Link href="/marketing/campaigns" className="hover:text-primary">
              {GROWTH_ENGINE_BREADCRUMBS.outreach}
            </Link>
            <span className="mx-1">/</span>
            <span className="text-foreground">{campaign.name}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{campaign.name}</h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaign.type.replaceAll("_", " ")} · {CAMPAIGN_CHANNEL_LABEL[campaign.channel as keyof typeof CAMPAIGN_CHANNEL_LABEL]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canLaunch ? (
            <Button
              className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
              disabled={pending || reviewBlocked}
              onClick={() => run(async () => launchCampaign(campaign.id))}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
              Launch
            </Button>
          ) : null}
          {campaign.status === "ACTIVE" ? (
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={pending}
              onClick={() => run(async () => updateCampaignStatus(campaign.id, "PAUSED"))}
            >
              <Pause className="size-4" /> Pause
            </Button>
          ) : null}
          {campaign.status === "PAUSED" ? (
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={pending}
              onClick={() => run(async () => updateCampaignStatus(campaign.id, "ACTIVE"))}
            >
              <Play className="size-4" /> Resume
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="gap-1.5"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await duplicateCampaign(campaign.id);
                if (r.ok && r.data?.id) router.push(`/marketing/campaigns/${r.data.id}`);
                else if (!r.ok) setError(r.error);
              })
            }
          >
            <Copy className="size-4" /> Duplicate
          </Button>
        </div>
      </div>

      {reviewBlocked ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          Connect Google Reviews before launching a review request campaign.{" "}
          <Link href="/marketing/reviews" className="font-medium text-brand-navy underline">
            Go to Reviews
          </Link>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Sent" value={campaign.sentCount} />
        <StatCard label="Delivered" value={campaign.deliveredCount} accent="text-emerald-600" />
        <StatCard label="Failed" value={campaign.failedCount} accent="text-destructive" />
        <StatCard
          label="Open rate"
          value={
            campaign.sentCount > 0
              ? Math.round((campaign.openedCount / campaign.sentCount) * 100)
              : 0
          }
          suffix="%"
          accent="text-brand-navy"
        />
      </div>

      {campaign.status === "SCHEDULED" && campaign.scheduledAt ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
          Scheduled for {fmtDateTime(campaign.scheduledAt)} — will auto-send via background job.
        </div>
      ) : null}

      {campaign.status === "ACTIVE" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
          Campaign is sending in the background. Refresh to see updated stats.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Message</h2>
            {isEditable ? (
              <div className="flex flex-wrap gap-2">
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
                {dirty ? (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-brand-navy hover:bg-brand-navy/90"
                    disabled={pending || !message.trim()}
                    onClick={saveMessage}
                  >
                    {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Save changes
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {isEditable ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {aiCampaignDrafting
                ? "Edit the message or regenerate with AI — always review before launching."
                : `Edit the message below. AI drafting is available on ${PLANS.ENTERPRISE.name}.`}
            </p>
          ) : null}

          {(channel === "EMAIL" || channel === "BOTH") && (
            isEditable ? (
              <div className="mt-3 space-y-2">
                <Label>Email subject</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => {
                    setEmailSubject(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
            ) : campaign.emailSubject ? (
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">Subject:</span> {campaign.emailSubject}
              </p>
            ) : null
          )}

          {isEditable ? (
            <div className="mt-3 space-y-2">
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
                onChange={(e) => {
                  setMessage(e.target.value);
                  setDirty(true);
                }}
                rows={6}
                className="font-mono text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {MERGE_FIELDS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium hover:bg-brand-light/30"
                    onClick={() => {
                      setMessage((m) => `${m}${f.token}`);
                      setDirty(true);
                    }}
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
          ) : (
            <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-mono text-xs">
              {campaign.messageTemplate}
            </pre>
          )}
        </section>
        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <DetailRow label="Status" value={CAMPAIGN_STATUS_LABEL[campaign.status]} />
            <DetailRow
              label="Scheduled"
              value={campaign.scheduledAt ? fmtDateTime(campaign.scheduledAt) : "—"}
            />
            <DetailRow
              label="Launched"
              value={campaign.launchedAt ? fmtDateTime(campaign.launchedAt) : "—"}
            />
            <DetailRow
              label="Completed"
              value={campaign.completedAt ? fmtDateTime(campaign.completedAt) : "—"}
            />
          </dl>
        </section>
      </div>

      {campaign.sends.length > 0 ? (
        <section className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">Recent sends</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Channel</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Sent</th>
                  <th className="px-4 py-2">Opened</th>
                </tr>
              </thead>
              <tbody>
                {campaign.sends.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{s.customerName}</td>
                    <td className="px-4 py-2">{s.channel}</td>
                    <td className="px-4 py-2">{s.status}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {s.sentAt ? fmtDateTime(s.sentAt) : s.error ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {s.openedAt ? fmtDateTime(s.openedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  suffix,
}: {
  label: string;
  value: number;
  accent?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${accent ?? ""}`}>
        {value}
        {suffix ?? ""}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
