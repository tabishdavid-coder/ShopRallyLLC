"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2, Loader2, Check, HelpCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSmsUiEnabled } from "@/lib/shop-capabilities";
import { formatPhoneInput } from "@/lib/phone";
import {
  getInspectionShareLink,
  shareInspection,
} from "@/server/actions/inspections";

const MAX = 2048;

export function ShareInspectionDialog({
  open,
  onOpenChange,
  inspectionId,
  roNumber,
  customerFirstName,
  shopName,
  phones,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspectionId: string;
  roNumber: number;
  customerFirstName: string;
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
  const [message, setMessage] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"live" | "mock" | "fallback" | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setDone(null);
    setError(null);
    setLink(null);
    setLinkError(null);
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
  }, [open, inspectionId]);

  useEffect(() => {
    if (link) {
      setMessage(
        `Hello ${customerFirstName || "there"}, your vehicle inspection from ${shopName} for RO #${roNumber} is ready: ${link}`,
      );
    }
  }, [link, customerFirstName, shopName, roNumber]);

  function resolveTo(): string {
    if (method === "SMS") {
      if (phoneChoice === "other") return otherPhone.trim();
      return phoneChoice;
    }
    if (emailChoice === "other") return otherEmail.trim();
    return email ?? "";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share inspection — RO #{roNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            {linkLoading ? (
              <span className="text-muted-foreground">Generating link…</span>
            ) : link ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-xs">{link}</span>
                <Button type="button" size="sm" variant="outline" onClick={copyLink}>
                  {copied ? <Check className="size-3" /> : "Copy"}
                </Button>
              </div>
            ) : (
              <span className="text-destructive">{linkError ?? "No link"}</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={method === "EMAIL" ? "default" : "outline"}
              onClick={() => setMethod("EMAIL")}
            >
              Email
            </Button>
            <Button
              type="button"
              size="sm"
              variant={method === "SMS" ? "default" : "outline"}
              onClick={() => setMethod("SMS")}
              disabled={!smsEnabled}
            >
              Text
            </Button>
          </div>

          {method === "SMS" ? (
            <div className="space-y-2">
              {phones.map((p) => (
                <label key={p.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={phoneChoice === p.value}
                    onChange={() => setPhoneChoice(p.value)}
                  />
                  {p.label}
                </label>
              ))}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={phoneChoice === "other"}
                  onChange={() => setPhoneChoice("other")}
                />
                Other
              </label>
              {phoneChoice === "other" ? (
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={otherPhone}
                  onChange={(e) => setOtherPhone(formatPhoneInput(e.target.value))}
                  placeholder="Phone number"
                />
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              {email ? (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={emailChoice === "primary"}
                    onChange={() => setEmailChoice("primary")}
                  />
                  {email}
                </label>
              ) : null}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={emailChoice === "other"}
                  onChange={() => setEmailChoice("other")}
                />
                Other email
              </label>
              {emailChoice === "other" ? (
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={otherEmail}
                  onChange={(e) => setOtherEmail(e.target.value)}
                  placeholder="Email address"
                />
              ) : null}
            </div>
          )}

          <textarea
            className="min-h-[120px] w-full rounded-md border px-3 py-2 text-sm"
            value={message}
            maxLength={MAX}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{message.length}/{MAX}</p>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {done ? (
            <p className="text-sm text-emerald-700">
              {done === "live" ? "Sent successfully." : "Opened fallback composer."}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="button" onClick={send} disabled={pending || !message.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Send
              <HelpCircle className="size-3.5 opacity-60" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
