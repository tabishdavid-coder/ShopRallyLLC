"use client";

import { useEffect, useState, useTransition } from "react";

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
import { useSmsUiEnabled } from "@/lib/shop-capabilities";
import { formatPhoneInput } from "@/lib/phone";
import { getShopEmailSendStatus } from "@/server/actions/email-settings";
import { getEstimateLink, shareEstimate, type ShareMethod } from "@/server/actions/share";

export function ShareEstimateDialog({
  open,
  onOpenChange,
  roId,
  roNumber,
  customerFirstName,
  customerName,
  shopName,
  phones,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roId: string;
  roNumber: number;
  customerFirstName: string;
  /** Full display name for recipient header; falls back to first name. */
  customerName?: string;
  shopName: string;
  phones: { label: string; value: string }[];
  email: string | null;
}) {
  const [method, setMethod] = useState<ShareMethod>("EMAIL");
  const [phoneChoice, setPhoneChoice] = useState<string>(phones[0]?.value ?? "other");
  const [otherPhone, setOtherPhone] = useState("");
  const [emailChoice, setEmailChoice] = useState<string>(email ? "primary" : "other");
  const [otherEmail, setOtherEmail] = useState("");
  const [subject, setSubject] = useState(`Your estimate for RO #${roNumber}`);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"live" | "mock" | "fallback" | null>(null);
  const [emailLive, setEmailLive] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  const smsEnabled = useSmsUiEnabled();

  const recipientDisplay =
    customerName?.trim() || customerFirstName?.trim() || "Customer";

  useEffect(() => {
    if (!open) return;
    setDone(null);
    setError(null);
    setLink(null);
    setLinkError(null);
    setSubject(`Your estimate for RO #${roNumber}`);
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
  }, [open, roId, roNumber]);

  useEffect(() => {
    if (link) {
      setMessage(
        `Hello ${customerFirstName || "there"}, your estimate from ${shopName} is ready. Review the work, acknowledge the shop terms, and approve: ${link}`,
      );
    }
  }, [link, customerFirstName, shopName]);

  const recipientEmail =
    emailChoice === "other" ? otherEmail.trim() : (email ?? "").trim();
  const recipientPhone =
    phoneChoice === "other" ? otherPhone.trim() : (phoneChoice || "").trim();
  const recipient = method === "SMS" ? recipientPhone : recipientEmail;

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

  const success =
    done == null
      ? null
      : `Estimate shared${
          done === "mock" ? " (mock — no live send)" : done === "fallback" ? " (opened your email app)" : ""
        }.`;

  return (
    <CustomerShareDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Share estimate"
      description={`RO #${roNumber} · Send for customer review & approval`}
      banner={
        <>
          {method === "EMAIL" && emailLive === false ? (
            <EmailNotConfiguredBanner
              showMailtoButton={Boolean(recipient.trim())}
              onMailtoFallback={() => {
                const to = encodeURIComponent(recipient.trim());
                const sub = encodeURIComponent(subject.trim() || `Your estimate for RO #${roNumber}`);
                const body = encodeURIComponent(message);
                window.location.href = `mailto:${to}?subject=${sub}&body=${body}`;
              }}
            />
          ) : null}
        </>
      }
      left={
        <>
          <ShareRecipientHeader name={recipientDisplay} />

          {method === "EMAIL" ? (
            <div>
              <ShareFieldLabel htmlFor="share-estimate-subject">Subject</ShareFieldLabel>
              <input
                id="share-estimate-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={shareInputClassName()}
              />
            </div>
          ) : null}

          <div>
            <ShareFieldLabel htmlFor="share-estimate-message" required>
              Message
            </ShareFieldLabel>
            <textarea
              id="share-estimate-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, SHARE_MESSAGE_MAX))}
              placeholder={linkError ?? "Write a short message for the customer…"}
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
            onChange={setMethod}
            smsEnabled={smsEnabled}
            name="share-estimate-method"
          />
          <ShareWhereGoingPanel
            method={method}
            email={recipientEmail || null}
            phone={recipientPhone || null}
          >
            {method === "SMS" && smsEnabled ? (
              <div className="space-y-1.5">
                {phones.map((p, i) => (
                  <label key={p.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="share-estimate-phone"
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
                    name="share-estimate-phone"
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
                    className={`mt-1 ${shareInputClassName()}`}
                  />
                ) : null}
              </div>
            ) : (
              <div className="space-y-1.5">
                {email ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="share-estimate-email"
                      checked={emailChoice === "primary"}
                      onChange={() => setEmailChoice("primary")}
                      className="size-4 accent-primary"
                    />
                    Use customer email
                  </label>
                ) : null}
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="share-estimate-email"
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
                    className={`mt-1 ${shareInputClassName()}`}
                  />
                ) : null}
              </div>
            )}
          </ShareWhereGoingPanel>
          <ShareAttachmentsPanel includedLabel="Customer estimate & approval page" />
        </>
      }
      footerLeft={
        <>
          <ShareCustomerPreviewButton link={link} linkLoading={linkLoading} />
          <ShareCopyLinkQuiet
            link={link}
            linkLoading={linkLoading}
            linkError={linkError}
            copied={copied}
            onCopy={copyLink}
            copyLabel="Copy link"
          />
        </>
      }
      onSend={send}
      sendDisabled={!link || !message.trim() || !recipient.trim()}
      pending={pending}
      error={error}
      success={success}
    />
  );
}
