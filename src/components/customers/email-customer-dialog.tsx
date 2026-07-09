"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Mail } from "lucide-react";

import { EmailNotConfiguredBanner } from "@/components/email/email-not-configured-banner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getShopEmailSendStatus } from "@/server/actions/email-settings";
import { sendCustomerEmail } from "@/server/actions/customers";

export function EmailCustomerDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  email: string | null;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [emailLive, setEmailLive] = useState<boolean | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDone(null);
    setSubject("");
    setBody("");
    getShopEmailSendStatus()
      .then((s) => setEmailLive(s.live))
      .catch(() => setEmailLive(false));
  }, [open]);

  function mailtoFallback() {
    if (!email) return;
    const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  function handleSend() {
    if (!email) {
      setError("This customer has no email on file.");
      return;
    }
    if (!subject.trim()) {
      setError("Enter a subject.");
      return;
    }
    if (!body.trim()) {
      setError("Enter a message.");
      return;
    }
    setError(null);
    setDone(null);
    start(async () => {
      const res = await sendCustomerEmail({
        customerId,
        subject: subject.trim(),
        body: body.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.mode === "fallback" && res.fallbackUrl) {
        window.location.href = res.fallbackUrl;
        setDone("Opened your email app.");
        return;
      }
      if (res.mode === "mock") {
        setDone("Email logged (dev mode). Configure shop email for live sends.");
        return;
      }
      setDone("Email sent.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-4" />
            Email {customerName}
          </DialogTitle>
        </DialogHeader>

        {!email ? (
          <p className="text-sm text-muted-foreground">
            Add an email address on this customer before sending.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email-to">To</Label>
              <Input id="email-to" value={email} readOnly className="bg-muted/40" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-body">Message</Label>
              <Textarea
                id="email-body"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message…"
              />
            </div>

            {emailLive === false ? (
              <EmailNotConfiguredBanner
                showMailtoButton
                onMailtoFallback={mailtoFallback}
              />
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {done ? <p className="text-sm text-emerald-600">{done}</p> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
                disabled={pending}
                onClick={handleSend}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Send
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
