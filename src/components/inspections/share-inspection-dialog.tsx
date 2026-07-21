"use client";

import { useEffect, useState, useTransition } from "react";

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
import {
  getInspectionShareLink,
  shareInspection,
} from "@/server/actions/inspections";

export function ShareInspectionDialog({
  open,
  onOpenChange,
  inspectionId,
  roNumber,
  customerFirstName,
  customerName,
  shopName,
  phones,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspectionId: string;
  roNumber: number;
  customerFirstName: string;
  /** Full display name for recipient header; falls back to first name. */
  customerName?: string;
  shopName: string;
  phones: { label: string; value: string }[];
  email: string | null;
}) {
  const smsEnabled = useSmsUiEnabled();
  const [method, setMethod] = useState<"SMS" | "EMAIL">("EMAIL");
  const [phoneChoice, setPhoneChoice] = useState<string>(phones[0]?.value ?? "other");
  const [otherPhone, setOtherPhone] = useState("");
  const [emailChoice, setEmailChoice] = useState<string>(email ? "primary" : "other");
  const [otherEmail, setOtherEmail] = useState("");
  const [subject, setSubject] = useState(`Your vehicle inspection — RO #${roNumber}`);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"live" | "mock" | "fallback" | null>(null);
  const [pending, start] = useTransition();

  const recipientDisplay =
    customerName?.trim() || customerFirstName?.trim() || "Customer";

  useEffect(() => {
    if (!open) return;
    setDone(null);
    setError(null);
    setLink(null);
    setLinkError(null);
    setSubject(`Your vehicle inspection — RO #${roNumber}`);
    setLinkLoading(true);
    getInspectionShareLink(inspectionId)
      .then((res) => {
        if (res.ok) {
          setLink(res.url);
          setLinkError(null);
        } else {
          setLinkError(res.error);
        }
      })
      .catch((e) => {
        setLinkError(e instanceof Error ? e.message : "Could not generate link.");
      })
      .finally(() => setLinkLoading(false));
  }, [open, inspectionId, roNumber]);

  useEffect(() => {
    if (link) {
      setMessage(
        `Hello ${customerFirstName || "there"}, your vehicle inspection from ${shopName} for RO #${roNumber} is ready: ${link}`,
      );
    }
  }, [link, customerFirstName, shopName, roNumber]);

  const recipientEmail =
    emailChoice === "other" ? otherEmail.trim() : (email ?? "").trim();
  const recipientPhone =
    phoneChoice === "other" ? otherPhone.trim() : (phoneChoice || "").trim();

  function resolveTo(): string {
    return method === "SMS" ? recipientPhone : recipientEmail;
  }

  function send() {
    setError(null);
    start(async () => {
      const res = await shareInspection({
        inspectionId,
        method,
        to: resolveTo(),
        message,
      });
      if (res.ok) {
        setDone(res.mode);
        if (res.fallbackUrl) window.open(res.fallbackUrl, "_blank");
      } else {
        setError(res.error);
      }
    });
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const success =
    done == null
      ? null
      : done === "live"
        ? "Sent successfully."
        : "Opened fallback composer.";

  return (
    <CustomerShareDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Share inspection"
      description={`RO #${roNumber} · Customer view of inspection results`}
      left={
        <>
          <ShareRecipientHeader name={recipientDisplay} />

          {method === "EMAIL" ? (
            <div>
              <ShareFieldLabel htmlFor="share-inspection-subject">Subject</ShareFieldLabel>
              <input
                id="share-inspection-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={shareInputClassName()}
              />
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col">
            <ShareFieldLabel htmlFor="share-inspection-message" required>
              Message
            </ShareFieldLabel>
            <textarea
              id="share-inspection-message"
              className={shareTextareaClassName()}
              value={message}
              maxLength={SHARE_MESSAGE_MAX}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={linkError ?? "Write a short message for the customer…"}
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
            name="share-inspection-method"
          />
          <ShareWhereGoingPanel
            method={method}
            email={recipientEmail || null}
            phone={recipientPhone || null}
          >
            {method === "SMS" ? (
              <div className="space-y-1.5">
                {phones.map((p) => (
                  <label key={p.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={phoneChoice === p.value}
                      onChange={() => setPhoneChoice(p.value)}
                      className="size-4 accent-primary"
                    />
                    {p.label}
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={phoneChoice === "other"}
                    onChange={() => setPhoneChoice("other")}
                    className="size-4 accent-primary"
                  />
                  Other
                </label>
                {phoneChoice === "other" ? (
                  <input
                    className={`mt-1 ${shareInputClassName()}`}
                    value={otherPhone}
                    onChange={(e) => setOtherPhone(formatPhoneInput(e.target.value))}
                    placeholder="Phone number"
                  />
                ) : null}
              </div>
            ) : (
              <div className="space-y-1.5">
                {email ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
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
                    checked={emailChoice === "other"}
                    onChange={() => setEmailChoice("other")}
                    className="size-4 accent-primary"
                  />
                  Other email
                </label>
                {emailChoice === "other" ? (
                  <input
                    className={`mt-1 ${shareInputClassName()}`}
                    value={otherEmail}
                    onChange={(e) => setOtherEmail(e.target.value)}
                    placeholder="Email address"
                  />
                ) : null}
              </div>
            )}
          </ShareWhereGoingPanel>
          <ShareAttachmentsPanel includedLabel="Customer inspection results page" />
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
      sendDisabled={!message.trim() || !resolveTo().trim()}
      pending={pending}
      error={error}
      success={success}
      cancelLabel="Close"
    />
  );
}
