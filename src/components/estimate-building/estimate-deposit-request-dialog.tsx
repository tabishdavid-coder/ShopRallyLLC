"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Check,
  Copy,
  Loader2,
  Mail,
  MessageSquare,
  Wallet,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCents } from "@/lib/format";
import { useSmsUiEnabled } from "@/lib/shop-capabilities";
import {
  createDepositRequest,
  recordManualDepositPayment,
  sendDepositRequestLink,
} from "@/server/actions/deposit-request";
import type { DepositRequestSummary } from "@/server/deposit-request";
import { DepositRequestStatus } from "@/generated/prisma";

type DepositInfo = Pick<
  DepositRequestSummary,
  "id" | "amountCents" | "note" | "status" | "sentAt" | "paidAt" | "shareUrl"
>;

/** Request a customer deposit on an estimate RO — amount, optional note, send link, or record in-shop payment. */
export function EstimateDepositRequestDialog({
  open,
  onOpenChange,
  roId,
  roNumber,
  estimateTotalCents,
  existingDeposit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roId: string;
  roNumber: number;
  estimateTotalCents: number;
  existingDeposit: DepositInfo | null;
}) {
  const smsEnabled = useSmsUiEnabled();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [url, setUrl] = useState<string | null>(existingDeposit?.shareUrl ?? null);
  const [depositRequestId, setDepositRequestId] = useState<string | null>(
    existingDeposit?.id ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [manualMethod, setManualMethod] = useState<string>("CASH");
  const [manualRef, setManualRef] = useState("");

  const isPaid = existingDeposit?.status === DepositRequestStatus.PAID;

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setStatus(null);
      return;
    }
    if (existingDeposit) {
      setAmount(String(existingDeposit.amountCents / 100));
      setNote(existingDeposit.note ?? "");
      setUrl(existingDeposit.shareUrl);
      setDepositRequestId(existingDeposit.id);
    } else {
      const suggested =
        estimateTotalCents > 0
          ? Math.min(Math.round(estimateTotalCents * 0.25), estimateTotalCents)
          : 0;
      setAmount(suggested > 0 ? String(suggested / 100) : "");
      setNote("");
      setUrl(null);
      setDepositRequestId(null);
    }
  }, [open, existingDeposit, estimateTotalCents]);

  async function ensureDepositLink(): Promise<{ url: string; id: string } | null> {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setStatus("Enter a valid deposit amount.");
      return null;
    }
    if (estimateTotalCents > 0 && cents > estimateTotalCents) {
      setStatus("Deposit cannot exceed the estimate total.");
      return null;
    }

    const isPending = existingDeposit?.status === DepositRequestStatus.PENDING;
    if (depositRequestId && url && isPending && existingDeposit?.amountCents === cents) {
      return { url, id: depositRequestId };
    }

    const res = await createDepositRequest({
      repairOrderId: roId,
      amountCents: cents,
      note: note.trim() || null,
    });
    if (!res.ok) {
      setStatus(res.error);
      return null;
    }
    setUrl(res.url);
    setDepositRequestId(res.depositRequestId);
    return { url: res.url, id: res.depositRequestId };
  }

  function send(channel: "email" | "sms") {
    setStatus(null);
    start(async () => {
      const link = await ensureDepositLink();
      if (!link) return;
      const res = await sendDepositRequestLink(link.id, channel);
      if (res.ok) {
        if (res.mode === "fallback" && res.fallbackUrl) {
          window.location.href = res.fallbackUrl;
          setStatus("Opened your messaging app.");
        } else {
          setStatus(channel === "email" ? "Deposit link emailed." : "Deposit link sent.");
        }
        router.refresh();
      } else {
        setStatus(res.error);
      }
    });
  }

  async function copyLink() {
    setStatus(null);
    start(async () => {
      const link = await ensureDepositLink();
      if (!link) return;
      try {
        await navigator.clipboard.writeText(link.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        setStatus("Could not copy — select the link field.");
      }
    });
  }

  function recordManual() {
    setStatus(null);
    start(async () => {
      const link = await ensureDepositLink();
      if (!link) return;
      const res = await recordManualDepositPayment({
        depositRequestId: link.id,
        method: manualMethod as "CASH" | "CHECK" | "CARD" | "OTHER",
        reference: manualRef.trim() || null,
      });
      if (res.ok) {
        setStatus("Deposit recorded.");
        router.refresh();
        onOpenChange(false);
      } else {
        setStatus(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-brand-navy">
            <Wallet className="size-5 text-brand-navy" />
            Request deposit
          </DialogTitle>
          <DialogDescription>
            Request a deposit on RO #{roNumber} before work begins. Send a secure payment link or
            record payment received in the shop.
          </DialogDescription>
        </DialogHeader>

        {isPaid && existingDeposit ? (
          <div className="space-y-2 px-5 py-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-semibold">
                Deposit received — {formatCents(existingDeposit.amountCents)}
              </p>
              {existingDeposit.paidAt ? (
                <p className="mt-1 text-emerald-800/80">
                  Paid {existingDeposit.paidAt.toLocaleString("en-US")}
                </p>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Request a new deposit to replace this one (creates a fresh link).
            </p>
          </div>
        ) : null}

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="deposit-amount">Deposit amount ($)</Label>
            <Input
              id="deposit-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
              placeholder="e.g. 75.00"
            />
            {estimateTotalCents > 0 ? (
              <p className="text-xs text-muted-foreground">
                Estimate total: {formatCents(estimateTotalCents)}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="deposit-note">Note for customer (optional)</Label>
            <Textarea
              id="deposit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={pending}
              rows={2}
              placeholder="Parts must be ordered — 50% deposit to proceed."
              className="resize-none"
            />
          </div>

          <div className="rounded-lg border border-brand-light/50 bg-brand-light/10 p-4">
            <p className="mb-3 text-sm font-medium text-brand-navy">Send payment link</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={url ?? ""}
                placeholder="Create deposit to generate link…"
                onFocus={(e) => e.currentTarget.select()}
                className="h-8 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyLink}
                disabled={pending}
                className="shrink-0 gap-1 border-brand-navy/20"
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className={`mt-2 grid gap-2 ${smsEnabled ? "grid-cols-2" : ""}`}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-brand-navy/20 hover:bg-brand-light/20"
                disabled={pending}
                onClick={() => send("email")}
              >
                <Mail className="size-4" /> Email link
              </Button>
              {smsEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-brand-navy/20 hover:bg-brand-light/20"
                  disabled={pending}
                  onClick={() => send("sms")}
                >
                  <MessageSquare className="size-4" /> Text link
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Banknote className="size-4" />
              Record in-shop payment
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={manualMethod} onValueChange={setManualMethod} disabled={pending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="CARD">Card (in person)</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                disabled={pending}
                placeholder="Reference (optional)"
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-3 bg-brand-navy text-white hover:bg-brand-navy/90"
              disabled={pending}
              onClick={recordManual}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Record deposit received"}
            </Button>
          </div>
        </div>

        {status ? <p className="px-5 pb-2 text-sm text-muted-foreground">{status}</p> : null}

        <DialogFooter className="shrink-0 border-t px-5 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
