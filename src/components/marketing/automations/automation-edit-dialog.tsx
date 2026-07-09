"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Mail, MessageSquare, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AUTOMATION_MERGE_FIELDS,
  applyAutomationMergeFields,
  getAutomationTemplate,
  smsCharacterRemaining,
  triggerUnitLabel,
} from "@/lib/automations";
import { cn } from "@/lib/utils";
import type { AutomationDetail } from "@/server/automations";
import {
  getAutomationDetailAction,
  sendTestAutomation,
  updateAutomation,
} from "@/server/actions/automations";

type Props = {
  automationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
};

export function AutomationEditDialog({ automationId, open, onOpenChange, canManage }: Props) {
  const [detail, setDetail] = useState<AutomationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [triggerAmount, setTriggerAmount] = useState(1);
  const [triggerUnit, setTriggerUnit] = useState<"HOURS" | "DAYS" | "MONTHS">("DAYS");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [includeBusinessCustomers, setIncludeBusinessCustomers] = useState(true);
  const [limitOnePerCustomer, setLimitOnePerCustomer] = useState(false);
  const [includeBookingLinkCta, setIncludeBookingLinkCta] = useState(true);
  const [smsExpanded, setSmsExpanded] = useState(true);
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAutomationDetailAction(automationId).then((result) => {
      if (cancelled) return;
      if (!result.ok || !result.data) {
        setError(result.ok ? "Automation not found." : result.error);
        setLoading(false);
        return;
      }
      const data = result.data;
      setDetail(data);
      setName(data.name);
      setTriggerAmount(data.triggerAmount ?? 1);
      setTriggerUnit((data.triggerUnit as "HOURS" | "DAYS" | "MONTHS") ?? "DAYS");
      setEmailEnabled(data.emailEnabled);
      setSmsEnabled(data.smsEnabled);
      setSmsMessage(data.smsMessage);
      setEmailSubject(data.emailSubject ?? "");
      setEmailBody(data.emailBody ?? "");
      setIncludeBusinessCustomers(data.includeBusinessCustomers);
      setLimitOnePerCustomer(data.limitOnePerCustomer);
      setIncludeBookingLinkCta(data.includeBookingLinkCta);
      setSmsExpanded(data.smsEnabled || !data.emailEnabled);
      setEmailExpanded(data.emailEnabled);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, automationId]);

  const tpl = detail ? getAutomationTemplate(detail.key) : null;
  const isInstant = detail?.triggerTiming === "INSTANT";
  const isBefore = detail?.triggerTiming === "BEFORE";

  const previewVars = {
    first_name: "Henry",
    customer_name: "Henry Johnson",
    shop_name: "In & Out AutoHaus Garage",
    shop_phone: "(518) 555-0100",
    booking_link: "https://example.com/book",
    review_link: "https://example.com/review",
    appointment_date: "01/01/2025",
    appointment_time: "12:00 PM",
    vehicle_make_model: "Ford Explorer",
  };

  const smsPreview = applyAutomationMergeFields(smsMessage, previewVars);
  const emailPreviewBody = applyAutomationMergeFields(emailBody || smsMessage, previewVars);

  function save() {
    if (!detail) return;
    setError(null);
    startTransition(async () => {
      const result = await updateAutomation({
        id: detail.id,
        name,
        triggerAmount: isInstant ? null : triggerAmount,
        triggerUnit: isInstant ? null : triggerUnit,
        emailEnabled,
        smsEnabled,
        smsMessage,
        emailSubject: emailSubject || undefined,
        emailBody: emailBody || undefined,
        includeBusinessCustomers,
        limitOnePerCustomer,
        includeBookingLinkCta,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      onOpenChange(false);
    });
  }

  function sendTest(channel: "SMS" | "EMAIL") {
    if (!detail) return;
    startTransition(async () => {
      const result = await sendTestAutomation(
        detail.id,
        channel,
        testPhone || undefined,
        testEmail || undefined,
      );
      if (!result.ok) setError(result.error);
      else setError(null);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {loading || !detail ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-brand-navy" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{tpl?.name ?? detail.name}</DialogTitle>
              <DialogDescription>{tpl?.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Automation name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canManage}
                />
              </div>

              {!isInstant ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-2">
                    <Label>{tpl?.triggerLabel ?? "Trigger timing"}</Label>
                    <div className="flex items-center gap-2">
                      {!isBefore && !isInstant ? (
                        <span className="text-sm text-muted-foreground">Send after</span>
                      ) : null}
                      {isBefore ? (
                        <span className="text-sm text-muted-foreground">Send</span>
                      ) : null}
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        className="w-20"
                        value={triggerAmount}
                        onChange={(e) => setTriggerAmount(Number(e.target.value))}
                        disabled={!canManage}
                      />
                      <Select
                        value={triggerUnit}
                        onValueChange={(v) =>
                          setTriggerUnit(v as "HOURS" | "DAYS" | "MONTHS")
                        }
                        disabled={!canManage}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOURS">
                            {triggerUnitLabel("HOURS", triggerAmount)}
                          </SelectItem>
                          <SelectItem value="DAYS">
                            {triggerUnitLabel("DAYS", triggerAmount)}
                          </SelectItem>
                          <SelectItem value="MONTHS">
                            {triggerUnitLabel("MONTHS", triggerAmount)}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {isBefore ? (
                        <span className="text-sm text-muted-foreground">before appointment</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {detail.key.startsWith("LOST_CUSTOMER") ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={includeBusinessCustomers}
                    onCheckedChange={(v) => setIncludeBusinessCustomers(v === true)}
                    disabled={!canManage}
                  />
                  Include Business Customers
                </label>
              ) : null}

              {detail.key === "REVIEW_REQUEST" ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={limitOnePerCustomer}
                    onCheckedChange={(v) => setLimitOnePerCustomer(v === true)}
                    disabled={!canManage}
                  />
                  Limit to one request per customer
                </label>
              ) : null}

              {/* SMS section */}
              <div className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() => setSmsExpanded((v) => !v)}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <MessageSquare className="size-4" />
                    Text Notification
                    <ChannelBadge enabled={smsEnabled} label="Text" />
                  </span>
                  <span className="text-sm text-brand-navy">
                    {smsExpanded ? "Collapse" : "Show message"}
                  </span>
                </button>
                {smsExpanded ? (
                  <div className="border-t p-4">
                    <label className="mb-3 flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={smsEnabled}
                        onCheckedChange={(v) => setSmsEnabled(v === true)}
                        disabled={!canManage}
                      />
                      Enable automation to start sending messages
                    </label>
                    {!smsEnabled ? (
                      <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        This message will only be sent if the toggle is enabled.
                      </p>
                    ) : null}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-1">
                          {AUTOMATION_MERGE_FIELDS.map((f) => (
                            <button
                              key={f.key}
                              type="button"
                              className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs hover:bg-brand-light/30"
                              onClick={() => setSmsMessage((m) => `${m}${f.token}`)}
                              disabled={!canManage}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                        <Textarea
                          value={smsMessage}
                          onChange={(e) => setSmsMessage(e.target.value)}
                          rows={5}
                          className="font-mono text-sm"
                          disabled={!canManage}
                        />
                        <p className="text-xs text-muted-foreground">
                          {smsCharacterRemaining(smsMessage)} characters remaining
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Phone for test"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            className="max-w-xs"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pending || !canManage}
                            onClick={() => sendTest("SMS")}
                          >
                            Send test
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-48 rounded-2xl border-8 border-slate-800 bg-white p-3 shadow-lg">
                          <div className="mb-2 text-center text-[10px] text-muted-foreground">
                            SMS Preview
                          </div>
                          <div className="rounded-lg bg-emerald-100 p-2 text-[11px] leading-snug">
                            {smsPreview}
                          </div>
                          <Smartphone className="mx-auto mt-2 size-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Email section */}
              <div className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() => setEmailExpanded((v) => !v)}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Mail className="size-4" />
                    Email Notification
                    <ChannelBadge enabled={emailEnabled} label="Email" />
                  </span>
                  <span className="text-sm text-brand-navy">
                    {emailExpanded ? "Collapse" : "Show message"}
                  </span>
                </button>
                {emailExpanded ? (
                  <div className="border-t p-4">
                    <label className="mb-3 flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={emailEnabled}
                        onCheckedChange={(v) => setEmailEnabled(v === true)}
                        disabled={!canManage}
                      />
                      Enable automation to start sending messages
                    </label>
                    {!emailEnabled ? (
                      <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        This message will only be sent if the toggle is enabled.
                      </p>
                    ) : null}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Email subject</Label>
                          <Input
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            disabled={!canManage}
                          />
                        </div>
                        <Textarea
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          rows={8}
                          disabled={!canManage}
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={includeBookingLinkCta}
                            onCheckedChange={(v) => setIncludeBookingLinkCta(v === true)}
                            disabled={!canManage}
                          />
                          Include Booking Link Call to Action
                        </label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Email for test"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            className="max-w-xs"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pending || !canManage}
                            onClick={() => sendTest("EMAIL")}
                          >
                            Send test
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Email preview
                        </p>
                        <p className="mt-2 text-sm font-medium">
                          {applyAutomationMergeFields(emailSubject, previewVars)}
                        </p>
                        <div className="mt-3 whitespace-pre-wrap text-sm">{emailPreviewBody}</div>
                        {includeBookingLinkCta ? (
                          <Button
                            size="sm"
                            className="mt-4 bg-brand-navy hover:bg-brand-navy/90"
                            disabled
                          >
                            Schedule Now
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {success ? (
                <p className="text-sm text-emerald-600">Automation saved.</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-brand-navy hover:bg-brand-navy/90"
                disabled={pending || !canManage}
                onClick={save}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Save Automation
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChannelBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
        enabled ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
