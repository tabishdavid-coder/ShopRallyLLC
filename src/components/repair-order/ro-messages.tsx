"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, Send, Link2, Loader2, X, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSmsUiEnabled } from "@/lib/shop-capabilities";
import type { MessageRow, SendResult } from "@/lib/messaging-types";
import { getMessages, sendText, sendEstimateLink } from "@/server/actions/messaging";
import { cn } from "@/lib/utils";

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
  const smsEnabled = useSmsUiEnabled();
  if (!smsEnabled) return null;
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
  const [minimized, setMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"live" | "mock" | "fallback" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Expanding when switching customer/RO (e.g. another job-board Chat click).
  useEffect(() => {
    setMinimized(false);
  }, [customerId, roId]);

  useEffect(() => {
    if (!open) {
      setMinimized(false);
      return;
    }
    setLoading(true);
    getMessages(customerId, roId)
      .then((m) => setMessages(m))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load messages."))
      .finally(() => setLoading(false));
  }, [open, customerId, roId]);

  useEffect(() => {
    if (open && !minimized) threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, minimized]);

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

  function close() {
    setMinimized(false);
    setOpen(false);
  }

  // Portal to body so `fixed` is viewport-correct (not clipped/offset by shell overflow
  // or dnd-kit transforms on the job board).
  const dock =
    open && minimized ? (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className={cn(
          // bottom-20 clears the Help FAB (~48px + bottom-5) so chip stacks above it
          "fixed bottom-20 right-4 z-[70] flex max-w-[280px] items-center gap-2 rounded-md",
          "border border-border bg-background px-3 py-2 text-left shadow-lg",
          "ring-1 ring-foreground/10 hover:bg-accent"
        )}
        aria-label={`Expand chat with ${customerName}`}
      >
        <MessageSquare className="size-4 shrink-0 text-brand-navy" />
        <span className="truncate text-sm font-medium">{customerName}</span>
      </button>
    ) : open && !minimized ? (
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`Messages with ${customerName}`}
        className={cn(
          // Sit above Help FAB; leave ~5rem bottom + top breathing room in max-height
          "fixed bottom-20 right-4 z-[70] flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden",
          "h-[min(520px,calc(100vh-6.5rem))] max-h-[calc(100vh-6.5rem)] rounded-md border border-border",
          "bg-background shadow-xl ring-1 ring-foreground/10"
        )}
      >
        <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base font-semibold leading-tight">
              <span className="truncate">{customerName}</span>
              {mode ? (
                <Badge variant={mode === "live" ? "default" : "secondary"} className="shrink-0 text-[10px]">
                  {mode === "live" ? "SMS" : mode === "fallback" ? "Fallback" : "Mock (no live send)"}
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {customerPhone ?? "No phone number on file"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setMinimized(true)}
              aria-label="Minimize chat"
              title="Minimize"
            >
              <Minus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={close}
              aria-label="Close chat"
              title="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {!marketingOptIn ? (
          <p className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-900">
            No SMS marketing opt-in on file. Transactional shop messages (estimates, status) are OK;
            confirm consent before promotional texts (TCPA).
          </p>
        ) : null}

        <div className="msg-thread-canvas flex-1 space-y-2 overflow-y-auto px-4 py-3">
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
          <Button
            variant="outline"
            size="sm"
            onClick={sendLink}
            disabled={pending || !customerPhone}
            className="w-full gap-1.5"
          >
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
      </div>
    ) : null;

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          onClick={() => {
            setMinimized(false);
            setOpen(true);
          }}
          aria-label="Messages"
          title="Text customer"
          className="rounded-md p-1 hover:bg-accent hover:text-foreground"
        >
          <MessageSquare className="size-4" />
        </button>
      )}
      {mounted && dock ? createPortal(dock, document.body) : null}
    </>
  );
}
