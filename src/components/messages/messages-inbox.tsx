"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Car,
  Check,
  CheckCheck,
  Loader2,
  MessageSquare,
  PanelRight,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
} from "lucide-react";

import { JobBoardHistoryProvider } from "@/components/job-board/job-board-history-provider";
import { MessagesThreadContextRail } from "@/components/messages/messages-thread-context-rail";
import { Button } from "@/components/ui/button";
import { useSmsUiEnabled } from "@/lib/shop-capabilities";
import { customerInitials } from "@/lib/format";
import { formatPhoneInput } from "@/lib/phone";
import type { ConversationRow } from "@/server/messages-inbox";
import type { MessageThreadContext } from "@/server/messages-thread-context";
import type { MessageRow } from "@/lib/messaging-types";
import { sendText } from "@/server/actions/messaging";
import {
  loadMessageThreadContext,
  openConversation,
} from "@/server/actions/messaging-settings";
import { cn } from "@/lib/utils";
import { fmtDate, fmtDateTime, toDate } from "@/lib/datetime";

const QUICK_REPLIES = [
  "Your vehicle is ready for pickup!",
  "Running about 15 minutes behind today — thanks for your patience.",
  "Thanks so much — see you then!",
  "What time works best for you this week?",
] as const;

const SMS_SEGMENT = 160;

type AvatarTone = "azure" | "orange" | "navy";

function avatarTone(id: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 3;
  return (["azure", "orange", "navy"] as const)[h]!;
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

function fmtBubbleTime(d: Date | string) {
  return fmtDateTime(d, { hour: "numeric", minute: "2-digit", hour12: true });
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

function vehicleLine(ctx: MessageThreadContext | null): string | null {
  const v = ctx?.primaryVehicle;
  if (!v) return null;
  const base = [v.year, v.make, v.model].filter(Boolean).join(" ");
  if (!base) return null;
  return v.trim ? `${base} ${v.trim}` : base;
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
  const smsEnabled = useSmsUiEnabled();
  const [conversations, setConversations] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (initialCustomerId) return initialCustomerId;
    return initial[0]?.customerId ?? null;
  });
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [threadContext, setThreadContext] = useState<MessageThreadContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [pending, start] = useTransition();
  const threadEndRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.customerId === selectedId) ?? null;
  const selectedTone = selected ? avatarTone(selected.customerId) : "azure";
  const selectedVehicle = vehicleLine(threadContext);
  const openRo =
    threadContext?.openRepairOrders.find((ro) => ro.status === "ESTIMATE") ??
    threadContext?.openRepairOrders[0] ??
    null;

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
    setMobileDetailsOpen(false);
    setBody("");
    setError(null);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setThreadContext(null);
      return;
    }
    setLoading(true);
    setContextLoading(true);
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

    loadMessageThreadContext(selectedId)
      .then(setThreadContext)
      .catch(() => setThreadContext(null))
      .finally(() => setContextLoading(false));
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

  if (!smsEnabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Two-way SMS isn&apos;t available for this shop yet. Share estimates and invoices by email,
        or ask a platform admin to enable SMS under Release flags when you&apos;re ready.
      </p>
    );
  }

  const charCount = body.length;
  const initials = selected
    ? customerInitials({
        firstName: selected.customerFirstName,
        lastName: selected.customerLastName,
      })
    : "";

  return (
    <JobBoardHistoryProvider>
    <div className="msg-workspace flex h-full min-h-0 flex-col overflow-hidden">
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Column 1 — conversation list */}
        <section
          className={cn(
            "flex w-full shrink-0 flex-col border-r border-[var(--msg-border)] bg-white sm:w-[296px]",
            "min-h-0",
            selected && "hidden sm:flex",
          )}
        >
          <div className="flex shrink-0 items-center justify-between px-4 pb-2.5 pt-4">
            <h2 className="text-base font-bold text-[var(--msg-text)]">Messages</h2>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 rounded-[7px] border-[var(--msg-border-2)] bg-[var(--msg-bg)] px-2.5 text-xs font-semibold text-[var(--msg-text-2)] shadow-none hover:bg-[#EEF1F6]"
              disabled
              title="Coming soon"
            >
              <Plus className="size-3.5" strokeWidth={2.3} />
              New
            </Button>
          </div>

          <div className="mx-4 mb-2.5 flex items-center gap-1.5 rounded-lg border border-[var(--msg-border)] bg-[var(--msg-bg)] px-2.5 py-1.5">
            <Search className="size-3.5 shrink-0 text-[var(--msg-text-3)]" />
            <input
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[var(--msg-text)] outline-none placeholder:text-[var(--msg-text-3)]"
            />
          </div>

          <div className="mx-4 mb-3 flex gap-1 rounded-[9px] bg-[var(--msg-bg)] p-0.5">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 rounded-[7px] py-1.5 text-center text-xs font-semibold transition-colors",
                  filter === f
                    ? "bg-white text-[var(--msg-text)] shadow-sm"
                    : "bg-transparent text-[var(--msg-text-2)] hover:text-[var(--msg-text)]",
                )}
              >
                {f === "all" ? "All" : "Unread"}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-[var(--msg-text-2)]">
                {conversations.length === 0
                  ? "No conversations yet. Text a customer from a repair order or wait for an inbound message."
                  : "No conversations match your search."}
              </p>
            ) : (
              filtered.map((c) => {
                const unread = c.unreadCount > 0;
                const tone = avatarTone(c.customerId);
                return (
                  <button
                    key={c.customerId}
                    type="button"
                    onClick={() => setSelectedId(c.customerId)}
                    className={cn(
                      "mb-0.5 flex w-full items-start gap-2.5 rounded-[10px] border px-2 py-2.5 text-left transition-colors",
                      selectedId === c.customerId
                        ? "border-[#D6E9FD] bg-[var(--msg-azure-tint)]"
                        : "border-transparent hover:bg-[var(--msg-bg)]",
                    )}
                  >
                    <span
                      className={cn(
                        "msg-avatar",
                        tone === "azure" && "msg-avatar-azure",
                        tone === "orange" && "msg-avatar-orange",
                        tone === "navy" && "msg-avatar-navy",
                      )}
                    >
                      {customerInitials({
                        firstName: c.customerFirstName,
                        lastName: c.customerLastName,
                      })}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-1.5">
                        <span
                          className={cn(
                            "truncate text-[13.5px] text-[var(--msg-text)]",
                            unread ? "font-bold" : "font-semibold",
                          )}
                        >
                          {c.customerName}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[11px]",
                            unread
                              ? "font-bold text-[var(--msg-azure-2)]"
                              : "text-[var(--msg-text-3)]",
                          )}
                        >
                          {fmtListTime(c.lastMessageAt)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-px block truncate text-xs",
                          unread
                            ? "font-medium text-[var(--msg-text)]"
                            : "text-[var(--msg-text-2)]",
                        )}
                      >
                        {c.lastBody}
                      </span>
                    </span>
                    {unread ? (
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--msg-azure)]"
                        aria-label="Unread"
                      />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Columns 2 + 3 — thread + context rail */}
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 overflow-hidden",
            !selected && "hidden sm:flex",
          )}
        >
          <section className="msg-thread-canvas flex min-h-0 min-w-0 flex-1 flex-col">
            {selected ? (
              <>
                <header className="flex shrink-0 items-center gap-3 border-b border-[var(--msg-border)] bg-white px-4 py-3.5 sm:px-5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 px-2 text-xs sm:hidden"
                    onClick={() => setSelectedId(null)}
                  >
                    ← Back
                  </Button>
                  <span
                    className={cn(
                      "msg-avatar hidden sm:flex",
                      selectedTone === "azure" && "msg-avatar-azure",
                      selectedTone === "orange" && "msg-avatar-orange",
                      selectedTone === "navy" && "msg-avatar-navy",
                    )}
                  >
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1 leading-snug">
                    <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-[14.5px] font-bold text-[var(--msg-text)]">
                      <span className="truncate">{selected.customerName}</span>
                      {selectedVehicle ? (
                        <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-[var(--msg-border-2)] bg-[var(--msg-bg)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--msg-text-2)]">
                          <Car className="size-3 shrink-0" />
                          <span className="truncate">{selectedVehicle}</span>
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-[var(--msg-text-2)]">
                      {selected.customerPhone
                        ? formatPhoneInput(selected.customerPhone)
                        : "No phone on file"}
                    </p>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-1.5">
                    {selected.customerPhone ? (
                      <a
                        href={`tel:${selected.customerPhone}`}
                        className="flex size-[34px] items-center justify-center rounded-lg text-[var(--msg-text-2)] hover:border hover:border-[var(--msg-border)] hover:bg-[var(--msg-bg)]"
                        aria-label="Call customer"
                      >
                        <Phone className="size-4" />
                      </a>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 gap-1.5 rounded-lg border-[var(--msg-border-2)] text-xs lg:hidden"
                      onClick={() => setMobileDetailsOpen(true)}
                    >
                      <PanelRight className="size-3.5" />
                      Details
                    </Button>
                  </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
                  <div className="flex min-h-full flex-col justify-end gap-3.5">
                    {loading ? (
                      <div className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-[var(--msg-text-2)]">
                        <Loader2 className="size-4 animate-spin" /> Loading…
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-[var(--msg-text-2)]">
                        <MessageSquare className="size-10 opacity-40" />
                        <p className="text-sm font-medium">No messages in this thread.</p>
                        <p className="text-xs">Send a text below to start the conversation.</p>
                      </div>
                    ) : (
                      <>
                        {messages[0] ? (
                          <div className="mb-1 flex flex-col items-center gap-2.5 self-center">
                            <span className="msg-sys-pill">
                              Conversation started · {fmtDateSeparator(messages[0].createdAt)}
                            </span>
                          </div>
                        ) : null}

                        {openRo && selectedVehicle ? (
                          <div className="mx-auto flex w-full max-w-[420px] items-center gap-2.5 rounded-xl border border-[var(--msg-border)] bg-white px-3.5 py-2.5 shadow-sm">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[var(--msg-azure-tint)] text-[var(--msg-azure-2)]">
                              <Car className="size-4" />
                            </div>
                            <p className="text-xs leading-snug text-[var(--msg-text-2)]">
                              <b className="font-bold text-[var(--msg-text)]">{selectedVehicle}</b>
                              {" — "}
                              RO #{openRo.number}
                              {openRo.status === "ESTIMATE" ? " estimate" : ""}
                            </p>
                          </div>
                        ) : null}

                        {messages.map((m, i) => {
                          const prev = messages[i - 1];
                          const showDate = i > 0 && (!prev || !sameDay(m.createdAt, prev.createdAt));
                          const outbound = m.direction === "OUTBOUND";
                          return (
                            <div key={m.id}>
                              {showDate ? (
                                <div className="mb-3 flex justify-center">
                                  <span className="msg-date-separator">
                                    {fmtDateSeparator(m.createdAt)}
                                  </span>
                                </div>
                              ) : null}
                              <div
                                className={cn(
                                  "flex",
                                  outbound ? "justify-end" : "justify-start",
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex max-w-[64%] flex-col",
                                    outbound ? "items-end" : "items-start",
                                  )}
                                >
                                  <div
                                    className={
                                      outbound ? "msg-bubble-outbound" : "msg-bubble-inbound"
                                    }
                                  >
                                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                                  </div>
                                  <div
                                    className={
                                      outbound
                                        ? "msg-bubble-outbound-meta"
                                        : "msg-bubble-inbound-meta"
                                    }
                                  >
                                    {outbound ? (
                                      <>
                                        {m.status === "delivered" || m.status === "read" ? (
                                          <CheckCheck className="size-3 text-[var(--msg-azure)]" />
                                        ) : (
                                          <Check className="size-3" />
                                        )}
                                        <span>
                                          {m.status === "failed"
                                            ? "Failed"
                                            : m.status === "delivered" || m.status === "read"
                                              ? "Delivered"
                                              : "Sent"}{" "}
                                          · {fmtBubbleTime(m.createdAt)}
                                        </span>
                                      </>
                                    ) : (
                                      <span>{fmtBubbleTime(m.createdAt)}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                    <div ref={threadEndRef} aria-hidden />
                  </div>
                </div>

                {error ? (
                  <p className="shrink-0 border-t border-destructive/20 bg-destructive/10 px-4 py-1.5 text-xs text-destructive">
                    {error}
                  </p>
                ) : null}

                <div className="relative z-10 shrink-0 border-t border-[var(--msg-border)] bg-white px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-2.5">
                  <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {QUICK_REPLIES.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setBody(chip)}
                        className="shrink-0 rounded-full border border-[var(--msg-border-2)] bg-[var(--msg-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--msg-text-2)] transition-colors hover:border-[#D6E9FD] hover:bg-[var(--msg-azure-tint)] hover:text-[var(--msg-azure-2)]"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--msg-border)] bg-[var(--msg-bg)] py-1.5 pl-3 pr-2">
                    <button
                      type="button"
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--msg-text-3)] hover:bg-[#EAEEF4] hover:text-[var(--msg-text-2)]"
                      disabled
                      title="Attachments (coming soon)"
                      aria-label="Attach file"
                    >
                      <Paperclip className="size-4" />
                    </button>
                    <input
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      placeholder="Type a message…"
                      disabled={!selected.customerPhone}
                      className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--msg-text)] outline-none placeholder:text-[var(--msg-text-3)] disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={send}
                      disabled={pending || !body.trim() || !selected.customerPhone}
                      className="msg-send-btn"
                      aria-label="Send message"
                    >
                      {pending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Send className="size-3.5 -ml-px fill-current" />
                      )}
                    </button>
                  </div>
                  <div
                    className={cn(
                      "flex justify-end px-1 pt-1 text-[10.5px]",
                      charCount > SMS_SEGMENT
                        ? "font-semibold text-[var(--msg-orange-2)]"
                        : "text-[var(--msg-text-3)]",
                    )}
                  >
                    {charCount} / {SMS_SEGMENT}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-2 px-4 text-center text-[var(--msg-text-2)]">
                  <MessageSquare className="size-10 opacity-40" />
                  <p className="text-sm font-medium text-[var(--msg-text)]">Select a conversation</p>
                  <p className="max-w-xs text-xs">
                    Choose a thread on the left, or text a customer from their repair order.
                  </p>
                </div>
              </div>
            )}
          </section>

          <MessagesThreadContextRail
            selected={selected}
            context={threadContext}
            contextLoading={contextLoading}
            avatarTone={selected ? selectedTone : undefined}
            mockMode={mockMode}
            mobileOpen={mobileDetailsOpen}
            onMobileClose={() => setMobileDetailsOpen(false)}
            onEstimateSent={() => {
              if (selectedId) {
                openConversation(selectedId).then(setMessages).catch(() => {});
              }
            }}
          />
        </div>
      </div>
    </div>
    </JobBoardHistoryProvider>
  );
}
