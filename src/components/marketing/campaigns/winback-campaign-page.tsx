"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  CalendarClock,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  applyMergeFields,
  audienceForWinbackPreset,
  CAMPAIGN_CHANNEL_LABEL,
  expandWinbackTemplate,
  MERGE_FIELDS,
  WINBACK_MESSAGE_TEMPLATES,
  WINBACK_PRESETS,
  type WinbackPresetId,
} from "@/lib/campaigns";
import { cn } from "@/lib/utils";
import { GROWTH_ENGINE } from "@/lib/growth-engine-brand";
import {
  createCampaign,
  launchCampaign,
  previewAudienceCountAction,
  previewWinbackSegmentCounts,
} from "@/server/actions/campaigns";
import type { CampaignChannel } from "@/generated/prisma";

type PreviewContext = {
  shopName: string;
  shopPhone: string;
  bookingLink: string;
};

type SegmentStat = { preset: string; days: number; count: number };

export function WinbackCampaignPage({
  previewContext,
  initialSegmentStats,
}: {
  previewContext: PreviewContext;
  initialSegmentStats: SegmentStat[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [preset, setPreset] = useState<WinbackPresetId>("12mo");
  const [customDays, setCustomDays] = useState(365);
  const [channel, setChannel] = useState<CampaignChannel>("SMS");
  const [templateId, setTemplateId] = useState(WINBACK_MESSAGE_TEMPLATES[0].id);
  const [offerText, setOfferText] = useState("");
  const [message, setMessage] = useState(WINBACK_MESSAGE_TEMPLATES[0].message);
  const [emailSubject, setEmailSubject] = useState(
    WINBACK_MESSAGE_TEMPLATES[0].emailSubject ?? "",
  );
  const [scheduleMode, setScheduleMode] = useState<"draft" | "now" | "later">("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [segmentStats, setSegmentStats] = useState(initialSegmentStats);
  const [error, setError] = useState<string | null>(null);

  const lapsedDays =
    preset === "custom"
      ? customDays
      : WINBACK_PRESETS.find((p) => p.id === preset)?.days ?? 365;

  const audience = useMemo(() => {
    const base = audienceForWinbackPreset(preset, customDays);
    if (channel === "EMAIL") {
      return { ...base, requirePhone: false, requireEmail: true, offerText: offerText || undefined };
    }
    if (channel === "BOTH") {
      return { ...base, requirePhone: true, requireEmail: true, offerText: offerText || undefined };
    }
    return { ...base, requirePhone: true, requireEmail: false, offerText: offerText || undefined };
  }, [preset, customDays, channel, offerText]);

  const refreshCount = useCallback(() => {
    previewAudienceCountAction(audience).then((r) => {
      if (r.ok && r.data) setAudienceCount(r.data.count);
    });
    previewWinbackSegmentCounts().then((r) => {
      if (r.ok && r.data) setSegmentStats(r.data);
    });
  }, [audience]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  function selectPreset(next: WinbackPresetId) {
    setPreset(next);
  }

  function selectTemplate(id: string) {
    const tpl = WINBACK_MESSAGE_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    setTemplateId(id);
    setMessage(tpl.message);
    setEmailSubject(tpl.emailSubject ?? "");
    if (tpl.channel !== channel) setChannel(tpl.channel);
  }

  const previewBody = useMemo(() => {
    const expanded = expandWinbackTemplate(message, {
      offerText,
      lastService: "Oil Change",
    });
    return applyMergeFields(expanded, {
      customer_name: "Alex Johnson",
      shop_name: previewContext.shopName,
      booking_link: previewContext.bookingLink,
      review_link: previewContext.bookingLink,
      shop_phone: previewContext.shopPhone || "555-0100",
    });
  }, [message, offerText, previewContext]);

  const previewSubject = useMemo(() => {
    if (channel === "SMS") return null;
    const subj = emailSubject || `We miss you at ${previewContext.shopName}`;
    return applyMergeFields(
      expandWinbackTemplate(subj, { offerText, lastService: "Oil Change" }),
      {
        customer_name: "Alex Johnson",
        shop_name: previewContext.shopName,
        booking_link: previewContext.bookingLink,
        review_link: previewContext.bookingLink,
        shop_phone: previewContext.shopPhone || "555-0100",
      },
    );
  }, [channel, emailSubject, offerText, previewContext]);

  function submit(mode: "draft" | "now" | "later") {
    setError(null);
    setScheduleMode(mode);
    startTransition(async () => {
      const presetLabel =
        preset === "custom"
          ? `${customDays} days`
          : WINBACK_PRESETS.find((p) => p.id === preset)?.label ?? "Win-back";

      const result = await createCampaign({
        name: `Win-back — ${presetLabel}`,
        type: "WIN_BACK",
        channel,
        audienceFilter: audience,
        messageTemplate: message,
        emailSubject: channel === "EMAIL" || channel === "BOTH" ? emailSubject : undefined,
        scheduledAt:
          mode === "later" && scheduledAt
            ? new Date(scheduledAt).toISOString()
            : undefined,
      });

      if (!result.ok || !result.data?.id) {
        setError(result.ok ? "Failed to create campaign." : result.error);
        return;
      }

      if (mode === "now") {
        const launch = await launchCampaign(result.data.id);
        if (!launch.ok) {
          router.push(
            `/marketing/campaigns/${result.data.id}?error=${encodeURIComponent(launch.error)}`,
          );
          return;
        }
      }

      router.push(`/marketing/campaigns/${result.data.id}`);
    });
  }

  return (
    <div className="space-y-6 workspace-surface">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-brand-navy via-brand-navy to-brand-light/90 p-6 text-white shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-brand-light">
            <Users className="size-5" />
            <span className="text-sm font-medium uppercase tracking-wide">Win-back outreach</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Win Back Customers</h1>
          <p className="text-sm text-white/85">
            Re-engage lapsed customers who haven&apos;t visited in a while. Target by last visit
            date, personalize with their service history, and optionally include a welcome-back
            offer — powered by {GROWTH_ENGINE.name} win-back templates for lapsed customers.
          </p>
        </div>
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-brand-light/10" />
      </div>

      {/* Stats strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {segmentStats.map((s) => {
          const presetMeta = WINBACK_PRESETS.find((p) => p.id === s.preset);
          const active = preset === s.preset;
          return (
            <button
              key={s.preset}
              type="button"
              onClick={() => selectPreset(s.preset as WinbackPresetId)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                active
                  ? "border-brand-navy bg-brand-light/20 ring-1 ring-brand-navy/30"
                  : "bg-card hover:border-brand-light/60",
              )}
            >
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {presetMeta?.label ?? s.preset}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-brand-navy">{s.count}</p>
              <p className="text-xs text-muted-foreground">lapsed customers</p>
            </button>
          );
        })}
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Selected segment</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-navy">
            {audienceCount != null ? audienceCount : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            No visit in {lapsedDays}+ days · opt-in only
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Audience presets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Who should receive this?</CardTitle>
              <CardDescription>
                One-click lapsed segments based on last repair order date.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {WINBACK_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPreset(p.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      preset === p.id
                        ? "border-brand-navy bg-brand-light/15"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <p className="font-medium text-brand-navy">{p.label} no visit</p>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => selectPreset("custom")}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors sm:col-span-2",
                    preset === "custom"
                      ? "border-brand-navy bg-brand-light/15"
                      : "hover:bg-muted/40",
                  )}
                >
                  <p className="font-medium text-brand-navy">Custom window</p>
                  <p className="text-xs text-muted-foreground">
                    Set your own minimum days since last visit
                  </p>
                </button>
              </div>
              {preset === "custom" ? (
                <div className="space-y-2">
                  <Label htmlFor="custom-days">Minimum days since last visit</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="custom-days"
                      type="range"
                      min={30}
                      max={730}
                      step={30}
                      value={customDays}
                      onChange={(e) => setCustomDays(Number(e.target.value))}
                      className="flex-1 accent-brand-navy"
                    />
                    <Input
                      type="number"
                      min={30}
                      max={1095}
                      className="w-24 tabular-nums"
                      value={customDays}
                      onChange={(e) => setCustomDays(Number(e.target.value) || 365)}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Channel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Channel</CardTitle>
              <CardDescription>SMS respects marketing opt-in (TCPA). Email requires an address on file.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "SMS" as const, icon: MessageSquare, label: "SMS" },
                    { id: "EMAIL" as const, icon: Mail, label: "Email" },
                    { id: "BOTH" as const, icon: Send, label: "SMS + Email" },
                  ] as const
                ).map(({ id, icon: Icon, label }) => (
                  <Button
                    key={id}
                    type="button"
                    variant={channel === id ? "default" : "outline"}
                    className={cn(
                      "gap-1.5",
                      channel === id ? "bg-brand-navy hover:bg-brand-navy/90" : "",
                    )}
                    onClick={() => setChannel(id)}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Templates + message */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Message template</CardTitle>
              <CardDescription>Pre-built win-back copy — edit freely or insert merge fields.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {WINBACK_MESSAGE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTemplate(t.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      templateId === t.id
                        ? "border-brand-navy bg-brand-navy text-white"
                        : "hover:bg-brand-light/20",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer">Optional offer (shown as {"{offer}"})</Label>
                <Input
                  id="offer"
                  placeholder='e.g. $20 off next visit or code WELCOME20'
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                />
              </div>

              {(channel === "EMAIL" || channel === "BOTH") && (
                <div className="space-y-2">
                  <Label>Email subject</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
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
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">When to send</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={scheduleMode === "draft" ? "default" : "outline"}
                  className={scheduleMode === "draft" ? "bg-brand-navy hover:bg-brand-navy/90" : ""}
                  onClick={() => setScheduleMode("draft")}
                >
                  Save draft
                </Button>
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
                  className={cn(
                    "gap-1.5",
                    scheduleMode === "later" ? "bg-brand-navy hover:bg-brand-navy/90" : "",
                  )}
                  onClick={() => setScheduleMode("later")}
                >
                  <CalendarClock className="size-4" />
                  Schedule
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
                    Scheduled campaigns auto-send at the chosen time (checked every 15 minutes).
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-2">
          <div className="sticky top-4 space-y-4">
            <Card className="border-brand-light/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription>
                  Sample for Alex Johnson · {CAMPAIGN_CHANNEL_LABEL[channel]}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {previewSubject ? (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Subject</p>
                    <p className="text-sm font-medium">{previewSubject}</p>
                  </div>
                ) : null}
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{previewBody}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  ~{audienceCount ?? "…"} customers match · last visit {lapsedDays}+ days ago
                </p>
              </CardContent>
            </Card>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full bg-brand-navy hover:bg-brand-navy/90"
                disabled={pending}
                onClick={() => submit(scheduleMode === "later" && !scheduledAt ? "draft" : scheduleMode)}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {scheduleMode === "now"
                  ? "Send win-back now"
                  : scheduleMode === "later" && scheduledAt
                    ? "Schedule win-back"
                    : "Save win-back draft"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/marketing/campaigns">← Back to campaigns</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
