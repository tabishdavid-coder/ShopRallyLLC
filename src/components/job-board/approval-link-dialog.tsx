"use client";

import { useState } from "react";
import { Copy, Check, Mail, MessageSquare, Link2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSmsUiEnabled } from "@/lib/shop-capabilities";

/**
 * Shows the generated customer approval link with Copy / Email actions.
 * (Email opens the user's mail app — live Resend send when configured.)
 */
export function ApprovalLinkDialog({
  open,
  onOpenChange,
  url,
  customerName,
  phone,
  roNumber,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  url: string;
  customerName: string;
  phone: string | null;
  roNumber: number;
}) {
  const smsEnabled = useSmsUiEnabled();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the field is selectable as a fallback */
    }
  }

  const message =
    `Hi${customerName ? ` ${customerName}` : ""}, your estimate for RO #${roNumber} is ready. ` +
    `Review and approve it here: ${url}`;
  const mailto = `mailto:?subject=${encodeURIComponent(
    `Your estimate for RO #${roNumber}`,
  )}&body=${encodeURIComponent(message)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-md">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" /> Customer approval link
          </DialogTitle>
          <DialogDescription>
            Send this link to the customer. When they approve, the estimate moves to
            Work-In-Progress automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 gap-2">
          <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="text-xs" />
          <Button onClick={copy} variant="outline" className="shrink-0 gap-1.5">
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className={smsEnabled ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
          <Button asChild variant="outline" className="gap-1.5">
            <a href={mailto}>
              <Mail className="size-4" /> Email
            </a>
          </Button>
          {smsEnabled ? (
            <Button asChild variant="outline" className="gap-1.5">
              <a href={`sms:${phone ?? ""}?&body=${encodeURIComponent(message)}`}>
                <MessageSquare className="size-4" /> Text
              </a>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
