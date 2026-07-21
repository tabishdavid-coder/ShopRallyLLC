"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Check, MessageSquare, X, XCircle } from "lucide-react";

import { EmailNotConfiguredBanner } from "@/components/email/email-not-configured-banner";
import {
  CustomerShareDialogShell,
  SHARE_MESSAGE_MAX,
  ShareAttachmentsPanel,
  ShareChannelSwitch,
  ShareCopyLinkQuiet,
  ShareCustomerPreviewButton,
  ShareFieldLabel,
  ShareRecipientHeader,
  ShareWhereGoingPanel,
  shareInputClassName,
  shareTextareaClassName,
} from "@/components/share/customer-share-dialog-shell";
import { Button } from "@/components/ui/button";
import { useSmsUiEnabled } from "@/lib/shop-capabilities";
import {
  getPlansShareSendStatus,
  sharePlansSignupLink,
  type PlansShareSendStatus,
  type SharePlansMethod,
} from "@/server/actions/maintenance-subscriptions";
import { cn } from "@/lib/utils";

export type PlansShareCustomer = {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string | null;
  email: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plansUrl: string;
  shopName: string;
  customer?: PlansShareCustomer | null;
};

type ToastState = { kind: "success" | "error"; message: string } | null;

function buildDefaultMessage(firstName: string | undefined, shopName: string, plansUrl: string) {
  const greeting = firstName?.trim() || "there";
  return [
    `Hello ${greeting},`,
    "",
    `${shopName} invites you to explore our maintenance plans and sign up online.`,
    "",
    `View our maintenance plans: ${plansUrl}`,
  ].join("\n");
}

function mailtoFallback(to: string, shopName: string, body: string) {
  const subject = encodeURIComponent(`Maintenance plans — ${shopName}`);
  return `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${encodeURIComponent(body)}`;
}

function smsFallback(to: string, body: string) {
  const digits = to.replace(/\D/g, "");
  const phone = digits.length >= 10 ? `+1${digits.slice(-10)}` : to;
  return `sms:${phone}?&body=${encodeURIComponent(body)}`;
}

function resultToastMessage(
  method: SharePlansMethod,
  results: { channel: "email" | "sms"; mode: "live" | "mock" | "fallback" }[],
): string {
  const r = results.find((c) => (method === "EMAIL" ? c.channel === "email" : c.channel === "sms"));
  if (!r) return "Sent!";
  if (r.channel === "email") {
    if (r.mode === "live") return "Email sent.";
    return "Email sent (dev mock).";
  }
  if (r.mode === "live") return "Text sent.";
  return "Text logged (dev mock).";
}

export function SharePlansLinkDialog({
  open,
  onOpenChange,
  plansUrl,
  shopName,
  customer,
}: Props) {
  const smsEnabled = useSmsUiEnabled();
  const [method, setMethod] = useState<SharePlansMethod>("EMAIL");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<PlansShareSendStatus | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setToast(null);
    setCopied(false);
    setMethod(customer?.phone && !customer?.email ? "SMS" : "EMAIL");
    setTo(customer?.phone ?? customer?.email ?? "");
    setMessage(buildDefaultMessage(customer?.firstName, shopName, plansUrl));
    getPlansShareSendStatus()
      .then(setSendStatus)
      .catch(() =>
        setSendStatus({ emailLive: false, smsEnabled, smsConfigured: false, smsLive: false }),
      );
  }, [open, plansUrl, shopName, customer, smsEnabled]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  function copyLink() {
    navigator.clipboard?.writeText(plansUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function validateBeforeSend(): string | null {
    if (method === "EMAIL") {
      const email = to.trim() || customer?.email?.trim() || "";
      if (!email) {
        return customer
          ? "This customer has no email on file. Enter an email address."
          : "Enter an email address.";
      }
      if (!email.includes("@")) return "Enter a valid email address.";
    } else {
      const phone = to.trim() || customer?.phone?.trim() || "";
      if (!phone) {
        return customer
          ? "This customer has no phone number on file. Enter a phone number."
          : "Enter a phone number.";
      }
      if (phone.replace(/\D/g, "").length < 10) return "Enter a valid phone number.";
      if (!customer?.id) return "Select a customer to send a text.";
    }
    if (!message.trim()) return "Message is empty.";
    return null;
  }

  function send() {
    setError(null);
    const validationError = validateBeforeSend();
    if (validationError) {
      setError(validationError);
      setToast({ kind: "error", message: validationError });
      return;
    }

    const channel = method === "SMS" ? "sms" : "email";
    const email = method === "EMAIL" ? to.trim() || customer?.email?.trim() : undefined;
    const phone = method === "SMS" ? to.trim() || customer?.phone?.trim() : undefined;

    start(async () => {
      const res = await sharePlansSignupLink({
        customerId: customer?.id,
        channel,
        email,
        phone,
        message,
      });
      if (res.ok) {
        const msg = resultToastMessage(method, res.channelResults);
        setToast({ kind: "success", message: msg });
        setTimeout(() => onOpenChange(false), 1400);
      } else {
        setError(res.error);
        setToast({ kind: "error", message: res.error });
      }
    });
  }

  const showEmailWarning = sendStatus && !sendStatus.emailLive;
  const showSmsWarning = sendStatus && smsEnabled && !sendStatus.smsLive;
  const displayEmail =
    method === "EMAIL" ? to.trim() || customer?.email?.trim() || "" : customer?.email?.trim() || "";
  const displayPhone =
    method === "SMS" ? to.trim() || customer?.phone?.trim() || "" : customer?.phone?.trim() || "";
  const recipient = to.trim() || (method === "EMAIL" ? customer?.email : customer?.phone) || "";

  return (
    <>
      <CustomerShareDialogShell
        open={open}
        onOpenChange={onOpenChange}
        title="Share signup link"
        description="Invite the customer to your public maintenance plans page"
        banner={
          <>
            {showEmailWarning && method === "EMAIL" ? (
              <EmailNotConfiguredBanner
                showMailtoButton={Boolean(recipient)}
                onMailtoFallback={() => {
                  window.location.href = mailtoFallback(recipient, shopName, message);
                }}
              />
            ) : null}
            {showSmsWarning && method === "SMS" ? (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-2">
                  <p>
                    {sendStatus?.smsConfigured
                      ? "Twilio is in mock mode — texts are logged, not delivered live."
                      : "Shop SMS is not fully configured — texts are logged in dev."}
                  </p>
                  {recipient ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => {
                        window.location.href = smsFallback(recipient, message);
                      }}
                    >
                      <MessageSquare className="size-3.5" />
                      Open in Messages
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        }
        left={
          <>
            <ShareRecipientHeader
              name={
                [customer?.firstName, customer?.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || "Customer"
              }
            />
            <div>
              <ShareFieldLabel htmlFor="share-plans-msg" required>
                Message
              </ShareFieldLabel>
              <textarea
                id="share-plans-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, SHARE_MESSAGE_MAX))}
                className={shareTextareaClassName()}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {message.length}/{SHARE_MESSAGE_MAX}
              </p>
            </div>
          </>
        }
        right={
          <>
            <ShareChannelSwitch
              method={method}
              onChange={(m) => {
                setMethod(m);
                setError(null);
                if (m === "SMS" && customer?.phone) setTo(customer.phone);
                if (m === "EMAIL" && customer?.email) setTo(customer.email);
              }}
              smsEnabled={smsEnabled}
              name="share-plans-method"
            />
            <ShareWhereGoingPanel
              method={method}
              email={displayEmail || null}
              phone={displayPhone || null}
            >
              <div>
                <ShareFieldLabel htmlFor="share-plans-to" required>
                  {method === "SMS" ? "Phone" : "Email"}
                </ShareFieldLabel>
                <input
                  id="share-plans-to"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder={method === "SMS" ? "(555) 555-5555" : "customer@email.com"}
                  className={shareInputClassName()}
                />
              </div>
            </ShareWhereGoingPanel>
            <ShareAttachmentsPanel includedLabel="Public maintenance plans page" />
          </>
        }
        footerLeft={
          <>
            <ShareCustomerPreviewButton link={plansUrl} />
            <ShareCopyLinkQuiet
              link={plansUrl}
              copied={copied}
              onCopy={copyLink}
              copyLabel="Copy link"
            />
          </>
        }
        onSend={send}
        sendDisabled={!message.trim()}
        pending={pending}
        sendLabel={`Send to ${customer?.firstName || "customer"}`}
        error={error}
      />

      {toast ? (
        <div
          role="status"
          className={cn(
            "fixed bottom-6 left-1/2 z-[60] flex w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 items-start gap-2 rounded-lg border px-3 py-2.5 shadow-md",
            toast.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-destructive/30 bg-destructive/5 text-destructive",
          )}
        >
          {toast.kind === "success" ? (
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </>
  );
}
