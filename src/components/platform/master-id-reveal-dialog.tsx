"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MasterIdRevealDialog({
  open,
  onOpenChange,
  masterId,
  shopName,
  onContinue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterId: string | null;
  shopName: string;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  function copy() {
    if (!masterId) return;
    void navigator.clipboard.writeText(masterId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (!masterId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-navy">
            <KeyRound className="size-5 text-brand-red" />
            Shop master key
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{shopName}</span> is ready. Save this
            master key now — it identifies the tenant for API access, support, and future Clerk org
            linking.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-brand-navy/20 bg-brand-navy/5 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Master ID
          </p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 break-all font-mono text-sm font-semibold text-brand-navy">
              {masterId}
            </code>
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={copy}>
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-amber-800">
            This key is shown once here. Store it securely before continuing.
          </p>
        </div>
        <DialogFooter>
          <Button className="w-full bg-brand-navy sm:w-auto" onClick={onContinue}>
            Continue to onboarding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
