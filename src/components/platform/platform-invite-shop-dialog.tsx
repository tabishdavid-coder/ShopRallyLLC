"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { createShopIntakeInvite } from "@/server/actions/shop-intake";

export function PlatformInviteShopDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectName, setProspectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    intakeUrl: string;
    emailSent: boolean;
    mailtoUrl?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setProspectEmail("");
    setProspectName("");
    setError(null);
    setResult(null);
    setCopied(false);
  }

  function send() {
    setError(null);
    start(async () => {
      const res = await createShopIntakeInvite({ prospectEmail, prospectName });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult({
        intakeUrl: res.intakeUrl,
        emailSent: res.emailSent,
        mailtoUrl: res.mailtoUrl,
      });
      if (res.mailtoUrl && !res.emailSent) {
        window.open(res.mailtoUrl, "_blank");
      }
    });
  }

  function copyLink() {
    if (!result?.intakeUrl) return;
    void navigator.clipboard.writeText(result.intakeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-brand-navy">Send intake link</DialogTitle>
          <DialogDescription>
            Email a prospect a secure link to complete shop onboarding. Submissions land in your
            pending queue for approval.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {result.emailSent ? (
                <p className="flex items-center gap-2 font-medium">
                  <Mail className="size-4" />
                  Invite email sent to {prospectEmail}
                </p>
              ) : (
                <p>Link ready — copy it or use the mailto draft we opened.</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Intake URL (expires in 14 days, single use)</Label>
              <div className="flex gap-2">
                <Input readOnly value={result.intakeUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                  {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
            {result.mailtoUrl ? (
              <Button variant="outline" className="w-full" asChild>
                <a href={result.mailtoUrl} target="_blank" rel="noreferrer">
                  <Mail className="mr-2 size-4" />
                  Open mailto draft
                </a>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="invite-email">Prospect email *</Label>
              <Input
                id="invite-email"
                type="email"
                value={prospectEmail}
                onChange={(e) => setProspectEmail(e.target.value)}
                placeholder="owner@prospectshop.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="invite-name">Contact name (optional)</Label>
              <Input
                id="invite-name"
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button className="bg-brand-navy" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button className="gap-1.5 bg-brand-navy" disabled={pending} onClick={send}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Link2 className="size-4" />
                )}
                Generate & send link
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
