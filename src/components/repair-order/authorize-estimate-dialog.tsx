"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  Store,
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
import { useSmsUiEnabled } from "@/lib/shop-capabilities";
import { approveRepairOrder, createApprovalLink } from "@/server/actions/job-board";
import { sendEstimateLink } from "@/server/actions/share";

/**
 * Customer link vs shop authorization: send an approval link, or authorize in-shop
 * and move the RO to Work-In-Progress immediately.
 */
export function AuthorizeEstimateDialog({
  open,
  onOpenChange,
  roId,
  roNumber,
  customerName: _customerName,
  phone: _phone,
  onShopApproved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roId: string;
  roNumber: number;
  customerName: string;
  phone: string | null;
  /** Optimistic board update before refresh (job board). */
  onShopApproved?: () => void;
}) {
  const smsEnabled = useSmsUiEnabled();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setUrl(null);
      setLinkError(null);
      setCopied(false);
      setStatus(null);
      return;
    }

    setLinkLoading(true);
    setLinkError(null);
    createApprovalLink(roId)
      .then((res) => {
        if (res.ok) setUrl(res.url);
        else setLinkError(res.error);
      })
      .catch((e) => {
        setLinkError(e instanceof Error ? e.message : "Could not generate link.");
      })
      .finally(() => setLinkLoading(false));
  }, [open, roId]);

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* field is selectable as fallback */
    }
  }

  function send(channel: "email" | "sms") {
    setStatus(null);
    start(async () => {
      try {
        const res = await sendEstimateLink(roId, channel);
        if (res.ok) {
          if (res.mode === "fallback" && res.fallbackUrl) {
            window.location.href = res.fallbackUrl;
            setStatus("Opened your email app.");
          } else {
            setStatus(channel === "email" ? "Approval link emailed." : "Approval link sent.");
          }
          router.refresh();
        } else {
          setStatus(res.error);
        }
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Send failed.");
      }
    });
  }

  function shopAuthorize() {
    setStatus(null);
    start(async () => {
      const res = await approveRepairOrder(roId);
      if (!res.ok) {
        setStatus(res.error);
        return;
      }
      onShopApproved?.();
      router.refresh();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-lg font-semibold text-brand-navy">Authorize estimate</DialogTitle>
          <DialogDescription>
            Choose how to authorize RO #{roNumber}. Customer approval keeps the estimate in place until
            they respond; shop authorization starts work immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          {/* Option A — customer */}
          <div className="flex flex-col rounded-lg border-2 border-brand-light/60 bg-brand-light/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-brand-navy">
              <Send className="size-5 shrink-0" />
              <h3 className="font-semibold">Send for customer approval</h3>
            </div>
            <p className="mb-4 flex-1 text-sm text-on-brand-wash">
              Email or text a link to the customer. The repair order stays in Estimates until they
              approve — you&apos;ll be notified when they do.
            </p>

            {linkLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Preparing link…
              </div>
            ) : linkError ? (
              <p className="text-sm text-destructive">{linkError}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={url ?? ""}
                    onFocus={(e) => e.currentTarget.select()}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyLink}
                    disabled={!url || pending}
                    className="shrink-0 gap-1"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className={smsEnabled ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-brand-navy/20 hover:bg-brand-light/20"
                    disabled={!url || pending}
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
                      disabled={!url || pending}
                      onClick={() => send("sms")}
                    >
                      <MessageSquare className="size-4" /> Text link
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Option B — shop */}
          <div className="flex flex-col rounded-lg border-2 border-emerald-300/80 bg-emerald-50/80 p-4">
            <div className="mb-2 flex items-center gap-2 text-emerald-800">
              <Store className="size-5 shrink-0" />
              <h3 className="font-semibold">In-shop approval</h3>
            </div>
            <p className="mb-4 flex-1 text-sm text-emerald-900/75">
              Approve on behalf of the customer and move this repair order to Work-In-Progress
              now. Jobs will be marked approved; no customer notification is sent.
            </p>
            <Button
              type="button"
              onClick={shopAuthorize}
              disabled={pending}
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Start work now
            </Button>
          </div>
        </div>

        {status ? <p className="px-5 pb-2 text-sm text-muted-foreground">{status}</p> : null}

        <DialogFooter className="border-t px-5 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
