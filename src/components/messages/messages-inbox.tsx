"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SMS_ENABLED } from "@/lib/features";
import { customerInitials } from "@/lib/format";
import type { ConversationRow } from "@/server/messages-inbox";
import type { MessageRow } from "@/lib/messaging-types";
import { sendText } from "@/server/actions/messaging";
import { openConversation } from "@/server/actions/messaging-settings";
import { cn } from "@/lib/utils";
import { fmtDate, fmtDateTime, toDate } from "@/lib/datetime";

function fmtTime(d: Date | string) {
  return fmtDateTime(d);
}

function fmtListTime(d: Date | string) {
  const now = new Date();
  const dt = toDate(d);
  const diffMs = now.getTime() - dt.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 24) {
    return fmtDateTime(d, { hour: "numeric", minute: "2-digit", hour12: true });
  }
  if (diffH < 24 * 7) {
    return fmtDateTime(d, { weekday: "short" });
  }
  return fmtDateTime(d, { month: "short", day: "numeric" });
}

function fmtDateSeparator(d: Date | string) {
  return fmtDate(d, { month: "short", day: "numeric", year: "numeric" });
}

function sameDay(a: Date | string, b: Date | string) {
  const da = toDate(a);
  const db = toDate(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function MessagesInbox({
  conversations: initial,
  initialCustomerId,
  mockMode = false,
}: {
  conversations: ConversationRow[];
  initialCustomerId?: string | null;
  mockMode?: boolean;
}) {
  const [conversations, setConversations] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (initialCustomerId) return initialCustomerId;
    return initial[0]?.customerId ?? null;
  });
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [pending, start] = useTransition();
  const threadEndRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.customerId === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === "unread" && c.unreadCount === 0) return false;
      if (!q) return true;
      return (
        c.customerName.toLowerCase().includes(q) ||
        (c.customerPhone?.toLowerCase().includes(q) ?? false) ||
        c.lastBody.toLowerCase().includes(q)
      );
    });
  }, [conversations, search, filter]);

  useEffect(() => {
    setConversations(initial);
  }, [initial]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    openConversation(selectedId)
      .then((m) => {
        setMessages(m);
        setConversations((rows) =>
          rows.map((r) =>
            r.customerId === selectedId ? { ...r, unreadCount: 0 } : r,
          ),
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load thread."))
      .finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => {
    if (!loading && selectedId) {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, selectedId]);

  function send() {
    if (!selectedId || !body.trim()) return;
    start(async () => {
      const res = await sendText(selectedId, body);
      if (res.ok) {
        setMessages(res.messages);
        setBody("");
        setError(null);
        setConversations((rows) =>
          rows.map((r) =>
            r.customerId === selectedId
              ? {
                  ...r,
                  lastBody: body.trim(),
                  lastMessageAt: new Date(),
                  lastDirection: "OUTBOUND" as const,
                }
              : r,
          ),
        );
      } else {
        setError(res.error);
        if (res.messages) setMessages(res.messages);
      }
    });
  }

  if (!SMS_ENABLED) {
    return (
      <p className="text-sm text-muted-foreground">
        SMS is disabled. Set SMS_ENABLED to enable messaging.
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {mockMode ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <strong>Demo mode.</strong> Twilio is not configured — messages are stored locally and
          logged to the console. Configure your shop number in{" "}
          <Link href="/settings/communications/phone-sms" className="font-medium underline">
            Settings → Phone &amp; SMS
          </Link>
          .
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden border-t bg-card">
        <div
          className={cn(
            "flex w-full shrink-0 flex-col border-r sm:w-72 md:w-80 lg:w-96",
            "min-h-0",
            selected && "hidden sm:flex",
          )}
        >
          <div className="shrink-0 space-y-2 border-b px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">Messages</h2>
                <p className="text-[11px] text-muted-foreground">
                  2-way SMS ·{" "}
                  <Link href="/settings/communications/phone-sms" className="text-primary hover:underline">
                    Phone settings
                  </Link>
                </p>
              </div>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled title="Coming soon">
                <Plus className="size-3" />
                New
              </Button>
            </div>
            <div className="relative min-w-0">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search conversations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f === "all" ? "All" : "Unread"}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {conversations.length === 0
                  ? "No conversations yet. Text a customer from a repair order or wait for an inbound message."
                  : "No conversations match your search."}
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.customerId}
                  type="button"
                  onClick={() => setSelectedId(c.customerId)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-accent/50",
                    selectedId === c.customerId && "bg-accent/60",
                  )}
                >
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="bg-brand-navy/10 text-xs font-semibold text-brand-navy">
                      {customerInitials({
                        firstName: c.customerFirstName,
                        lastName: c.customerLastName,
                      })}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{c.customerName}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {c.unreadCount > 0 ? (
                          <span className="size-2 rounded-full bg-brand-navy" aria-label="Unread" />
                        ) : null}
                        <span className="text-[10px] text-muted-foreground">
                          {fmtListTime(c.lastMessageAt)}
                        </span>
                      </span>
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{c.lastBody}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col bg-background",
            !selected && "hidden sm:flex",
          )}
        >
          {selected ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 px-2 text-xs sm:hidden"
                  onClick={() => setSelectedId(null)}
                >
                  ← Back
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    <Link
                      href={`/customers?customer=${selected.customerId}`}
                      className="hover:text-primary hover:underline"
                    >
                      {selected.customerName}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.customerPhone ?? "No phone"}
                    {selected.repairOrderNumber ? (
                      <>
                        {" · "}
                        <Link
                          href={`/repair-orders/${selected.repairOrderId}/estimate`}
                          className="text-primary hover:underline"
                        >
                          RO #{selected.repairOrderNumber}
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost" className="hidden shrink-0 gap-1.5 text-xs sm:inline-flex">
                  <Link href={`/customers?customer=${selected.customerId}`}>
                    <User className="size-3.5" />
                    Customer
                  </Link>
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 px-3 py-3 sm:px-4">
                <div className="flex min-h-full flex-col justify-end space-y-3">
                {loading ? (
                  <div className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading…
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                    <MessageSquare className="size-10 opacity-40" />
                    <p className="text-sm">No messages in this thread.</p>
                    <p className="text-xs">Send a text below to start the conversation.</p>
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const prev = messages[i - 1];
                    const showDate = !prev || !sameDay(m.createdAt, prev.createdAt);
                    return (
                      <div key={m.id}>
                        {showDate ? (
                          <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {fmtDateSeparator(m.createdAt)}
                          </p>
                        ) : null}
                        <div
                          className={cn(
                            "flex",
                            m.direction === "OUTBOUND" ? "justify-end" : "justify-start",
                          )}
                        >
                          <div
                            className={
                              m.direction === "OUTBOUND"
                                ? "msg-bubble-outbound"
                                : "msg-bubble-inbound"
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
                              {m.direction === "INBOUND" && selected.customerPhone
                                ? `From: ${selected.customerPhone} · `
                                : null}
                              {fmtTime(m.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={threadEndRef} aria-hidden />
                </div>
              </div>

              {error ? (
                <p className="shrink-0 border-t bg-destructive/10 px-4 py-1.5 text-xs text-destructive">
                  {error}
                </p>
              ) : null}

              <div className="relative z-10 shrink-0 border-t bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
                    placeholder="Type a message…"
                    disabled={!selected.customerPhone}
                    className="min-h-11 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-placeholder-foreground focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-11"
                      disabled
                      title="Attachments (coming soon)"
                      aria-label="Attach file"
                    >
                      <Paperclip className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-11"
                      disabled
                      title="Templates (coming soon)"
                      aria-label="Message templates"
                    >
                      <FileText className="size-4" />
                    </Button>
                    <Button
                      onClick={send}
                      disabled={pending || !body.trim() || !selected.customerPhone}
                      size="icon"
                      className="size-11"
                      aria-label="Send message"
                    >
                      {pending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
              <MessageSquare className="size-10 opacity-40" />
              <p className="text-sm font-medium">Select a conversation</p>
              <p className="max-w-xs text-xs">
                Choose a thread on the left, or text a customer from their repair order.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
