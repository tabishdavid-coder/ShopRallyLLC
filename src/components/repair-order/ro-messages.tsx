"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MessageSquare, Send, Link2, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SMS_ENABLED } from "@/lib/features";
import type { MessageRow, SendResult } from "@/lib/messaging-types";
import { getMessages, sendText, sendEstimateLink } from "@/server/actions/messaging";

function fmtTime(d: Date) {
  return new Date(d).toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function RoMessages(props: {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  marketingOptIn: boolean;
  roId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  if (!SMS_ENABLED) return null;
  return <RoMessagesPanel {...props} />;
}

function RoMessagesPanel({
  customerId,
  customerName,
  customerPhone,
  marketingOptIn,
  roId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  marketingOptIn: boolean;
  roId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"live" | "mock" | "fallback" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getMessages(customerId, roId)
      .then((m) => setMessages(m))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load messages."))
      .finally(() => setLoading(false));
  }, [open, customerId, roId]);

  useEffect(() => {
    if (open) threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function apply(res: SendResult) {
    if (res.messages) setMessages(res.messages);
    if (res.ok) {
      setMode(res.mode);
      setError(null);
      if (res.mode === "fallback" && res.fallbackUrl) window.location.href = res.fallbackUrl;
    } else setError(res.error);
  }

  function send() {
    if (!body.trim()) return;
    start(async () => {
      const res = await sendText(customerId, body, roId);
      apply(res);
      if (res.ok) setBody("");
    });
  }

  function sendLink() {
    start(async () => apply(await sendEstimateLink(roId, "sms")));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {hideTrigger ? null : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Messages"
          title="Text customer"
          className="rounded-md p-1 hover:bg-accent hover:text-foreground"
        >
          <MessageSquare className="size-4" />
        </button>
      )}

      <DialogContent className="flex h-[600px] max-h-[85vh] flex-col gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            {customerName}
            {mode ? (
              <Badge variant={mode === "live" ? "default" : "secondary"} className="text-[10px]">
                {mode === "live" ? "SMS" : mode === "fallback" ? "Fallback" : "Mock (no live send)"}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>{customerPhone ?? "No phone number on file"}</DialogDescription>
        </DialogHeader>

        {!marketingOptIn ? (
          <p className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-900">
            No SMS marketing opt-in on file. Transactional shop messages (estimates, status) are OK;
            confirm consent before promotional texts (TCPA).
          </p>
        ) : null}

        <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 px-4 py-3">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              No messages yet. Send a text or share the estimate link.
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
                <div
                  className={
                    m.direction === "OUTBOUND" ? "msg-bubble-outbound" : "msg-bubble-inbound"
                  }
                >
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div
                    className={
                      m.direction === "OUTBOUND"
                        ? "msg-bubble-outbound-meta"
                        : "msg-bubble-inbound-meta"
                    }
                  >
                    {fmtTime(m.createdAt)}
                    {m.status === "failed" ? " · failed" : m.status === "mock" ? " · mock" : ""}
                    {m.status && ["queued", "sent", "delivered"].includes(m.status) ? ` · ${m.status}` : ""}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={threadEndRef} />
        </div>

        {error ? <p className="border-t bg-destructive/10 px-4 py-1.5 text-xs text-destructive">{error}</p> : null}

        <div className="space-y-2 border-t p-3">
          <Button variant="outline" size="sm" onClick={sendLink} disabled={pending || !customerPhone} className="w-full gap-1.5">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            Send estimate link
          </Button>
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder={customerPhone ? "Type a message…" : "Add a phone number to send texts"}
              disabled={!customerPhone}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <Button onClick={send} disabled={pending || !body.trim() || !customerPhone} size="icon" aria-label="Send">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
