"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2, Loader2, Check, HelpCircle } from "lucide-react";

import { EmailNotConfiguredBanner } from "@/components/email/email-not-configured-banner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SMS_ENABLED } from "@/lib/features";
import { formatPhoneInput } from "@/lib/phone";
import { getShopEmailSendStatus } from "@/server/actions/email-settings";
import { getEstimateLink, shareEstimate, type ShareMethod } from "@/server/actions/share";

const MAX = 2048;

export function ShareEstimateDialog({
  open,
  onOpenChange,
  roId,
  roNumber,
  customerFirstName,
  shopName,
  phones,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roId: string;
  roNumber: number;
  customerFirstName: string;
  shopName: string;
  /** Customer's phone numbers, primary first (shown starred). */
  phones: { label: string; value: string }[];
  email: string | null;
}) {
  const [method, setMethod] = useState<ShareMethod>("EMAIL");
  const [phoneChoice, setPhoneChoice] = useState<string>(phones[0]?.value ?? "other");
  const [otherPhone, setOtherPhone] = useState("");
  const [emailChoice, setEmailChoice] = useState<string>(email ? "primary" : "other");
  const [otherEmail, setOtherEmail] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"live" | "mock" | "fallback" | null>(null);
  const [emailLive, setEmailLive] = useState<boolean | null>(null);
  const [pending, start] = useTransition();

  // Fetch (and lazily mint) the approval link when the dialog opens.
  useEffect(() => {
    if (!open) return;
    setDone(null);
    setError(null);
    setLink(null);
    setLinkError(null);
    setLinkLoading(true);
    getShopEmailSendStatus()
      .then((s) => setEmailLive(s.live))
      .catch(() => setEmailLive(false));
    getEstimateLink(roId)
      .then((res) => {
        if (res.ok) {
          setLink(res.url);
          setLinkError(null);
        } else {
          setLinkError(res.error);
        }
      })
      .catch((e) => {
        setLinkError(e instanceof Error ? e.message : "Could not generate estimate link.");
      })
      .finally(() => setLinkLoading(false));
  }, [open, roId]);

  // Build the default message once the link is known.
  useEffect(() => {
    if (link) {
      setMessage(
        `Hello ${customerFirstName || "there"}, your estimate from ${shopName} is ready ${link}`,
      );
    }
  }, [link, customerFirstName, shopName]);

  const recipient =
    method === "SMS"
      ? phoneChoice === "other"
        ? otherPhone
        : phoneChoice
      : emailChoice === "other"
        ? otherEmail
        : (email ?? "");

  function copyLink() {
    if (!link) return;
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function send() {
    setError(null);
    start(async () => {
      const res = await shareEstimate({ roId, method, to: recipient, message });
      if (res.ok) {
        setDone(res.mode);
        if (res.mode === "fallback" && res.fallbackUrl) {
          window.location.href = res.fallbackUrl;
        }
        setTimeout(() => onOpenChange(false), res.mode === "fallback" ? 400 : 1200);
      } else {
        setError(res.error);
      }
    });
  }

  const shareMethods: ShareMethod[] = SMS_ENABLED ? ["EMAIL", "SMS"] : ["EMAIL"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-3.5">
          <DialogTitle className="text-lg font-semibold">Share Estimate</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          {/* Method */}
          {shareMethods.length > 1 ? (
            <fieldset>
              <legend className="mb-1.5 text-sm text-muted-foreground">Select method for sharing:</legend>
              <div className="space-y-1.5">
                {shareMethods.map((m) => (
                  <label key={m} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="share-method"
                      checked={method === m}
                      onChange={() => setMethod(m)}
                      className="size-4 accent-primary"
                    />
                    {m === "EMAIL" ? "Email" : "SMS"}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {method === "EMAIL" && emailLive === false ? (
            <EmailNotConfiguredBanner
              showMailtoButton={Boolean(recipient.trim())}
              onMailtoFallback={() => {
                const to = encodeURIComponent(recipient.trim());
                const subject = encodeURIComponent(`Your estimate for RO #${roNumber}`);
                const body = encodeURIComponent(message);
                window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
              }}
            />
          ) : null}

          {/* Recipient */}
          {method === "SMS" && SMS_ENABLED ? (
            <fieldset>
              <legend className="mb-1.5 text-sm text-muted-foreground">Select phone number:</legend>
              <div className="space-y-1.5">
                {phones.map((p, i) => (
                  <label key={p.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="share-phone"
                      checked={phoneChoice === p.value}
                      onChange={() => setPhoneChoice(p.value)}
                      className="size-4 accent-primary"
                    />
                    {p.label}
                    {i === 0 ? <span className="text-amber-500">★</span> : null}
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="share-phone"
                    checked={phoneChoice === "other"}
                    onChange={() => setPhoneChoice("other")}
                    className="size-4 accent-primary"
                  />
                  Other
                </label>
                {phoneChoice === "other" ? (
                  <input
                    type="tel"
                    value={otherPhone}
                    onChange={(e) => setOtherPhone(formatPhoneInput(e.target.value))}
                    placeholder="555-555-5555"
                    className="ml-6 block w-56 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                ) : null}
              </div>
            </fieldset>
          ) : (
            <fieldset>
              <legend className="mb-1.5 text-sm text-muted-foreground">Select email address:</legend>
              <div className="space-y-1.5">
                {email ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="share-email"
                      checked={emailChoice === "primary"}
                      onChange={() => setEmailChoice("primary")}
                      className="size-4 accent-primary"
                    />
                    {email}
                  </label>
                ) : null}
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="share-email"
                    checked={emailChoice === "other"}
                    onChange={() => setEmailChoice("other")}
                    className="size-4 accent-primary"
                  />
                  Other
                </label>
                {emailChoice === "other" ? (
                  <input
                    type="email"
                    value={otherEmail}
                    onChange={(e) => setOtherEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="ml-6 block w-64 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                ) : null}
              </div>
            </fieldset>
          )}

          {/* Message */}
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              Message <span className="text-destructive">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
              rows={4}
              placeholder={
                linkLoading ? "Loading estimate link…" : linkError ?? "Estimate link unavailable."
              }
              className="block w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">Character limit {MAX}</p>
          </div>

          {/* Expiry note */}
          <div className="brand-callout py-2.5">
            Share Estimate links automatically expire in 30 days
          </div>

          {linkError ? <p className="text-xs text-destructive">Could not generate link: {linkError}</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {done ? (
            <p className="text-xs text-emerald-600">
              Estimate shared
              {done === "mock" ? " (mock — no live send)" : done === "fallback" ? " (opened your email app)" : ""}.
            </p>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={copyLink}
            disabled={!link}
            className="flex items-center gap-1.5 text-sm font-medium text-primary disabled:opacity-50"
          >
            {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
            {copied ? "COPIED" : "COPY ESTIMATE LINK"}
          </button>
          <HelpCircle className="size-4 text-muted-foreground" />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              CANCEL
            </Button>
            <Button size="sm" onClick={send} disabled={pending || !link || !message.trim() || !recipient.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              SEND
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
