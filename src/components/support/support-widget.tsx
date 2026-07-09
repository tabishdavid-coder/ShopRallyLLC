"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronDown,
  HelpCircle,
  Loader2,
  MessageCircle,
  Minus,
  Paperclip,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShopRallyMark } from "@/components/brand/shoprally-logo";
import { cn } from "@/lib/utils";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_HREF } from "@/lib/support";
import { askFaqQuestion } from "@/server/actions/support";

type ChatMessage = {
  id: string;
  role: "agent" | "user";
  body: string;
  at: Date;
};

type Conversation = {
  id: string;
  startedAt: Date;
  messages: ChatMessage[];
  ended?: boolean;
};

function formatStarted(d: Date): string {
  return `Started ${d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

const WELCOME =
  "Hi there! You're speaking with ShopRally Support. Ask a product question here, " +
  "browse our FAQ, or submit a ticket — we'll get back to you within one business day. " +
  "What can I help you with today?";

export function SupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [view, setView] = useState<"home" | "chat">("home");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [active?.messages.length, open]);

  function startConversation() {
    const id = crypto.randomUUID();
    const conv: Conversation = {
      id,
      startedAt: new Date(),
      messages: [
        {
          id: "welcome",
          role: "agent",
          body: WELCOME,
          at: new Date(),
        },
      ],
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
    setView("chat");
    setOpen(true);
    setMinimized(false);
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text || !activeId) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      body: text,
      at: new Date(),
    };
    setDraft("");
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, messages: [...c.messages, userMsg] } : c,
      ),
    );

    start(async () => {
      const res = await askFaqQuestion(text);
      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        body: res.ok ? res.answer : "Something went wrong — please email info@getshoprally.com.",
        at: new Date(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, messages: [...c.messages, agentMsg] } : c,
        ),
      );
    });
  }

  // Hide on /messages — composer + send button sit bottom-right and overlap this FAB.
  if (pathname.startsWith("/messages")) {
    return null;
  }

  if (minimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <Button
          size="icon"
          className="size-12 rounded-full bg-brand-navy shadow-lg hover:bg-brand-navy/90"
          aria-label="Open help"
          onClick={() => setMinimized(false)}
        >
          <HelpCircle className="size-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div className="flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b bg-brand-navy px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <ShopRallyMark size={28} variant="default" decorative className="rounded-md" />
              <span className="font-semibold">ShopRally</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10"
                aria-label="Minimize"
                onClick={() => {
                  setMinimized(true);
                  setOpen(false);
                }}
              >
                <Minus className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
          </div>

          {view === "home" ? (
            <div className="flex max-h-[420px] flex-col">
              <div className="border-b px-4 py-3">
                <p className="font-medium">Have questions? We&apos;re here to help.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Email{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-navy hover:underline">
                    {SUPPORT_EMAIL}
                  </a>
                  {" · "}
                  <a href={SUPPORT_PHONE_HREF} className="text-brand-navy hover:underline">
                    {SUPPORT_PHONE}
                  </a>
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {conversations.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No conversations yet.
                  </p>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-start gap-3 rounded-md px-2 py-3 text-left hover:bg-accent/50"
                      onClick={() => {
                        setActiveId(c.id);
                        setView("chat");
                      }}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-red/10">
                        <MessageCircle className="size-4 text-brand-red" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">{formatStarted(c.startedAt)}</p>
                        <p className="truncate text-sm">
                          {c.messages[c.messages.length - 1]?.body ?? "Conversation"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t p-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={startConversation}
                >
                  New conversation
                </Button>
              </div>

              <div className="flex justify-center gap-3 border-t px-4 py-2 text-xs text-muted-foreground">
                <Link href="/about" className="hover:text-foreground hover:underline">
                  About
                </Link>
                <Link href="/terms" className="hover:text-foreground hover:underline">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-foreground hover:underline">
                  Privacy
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex max-h-[420px] flex-col">
              <div className="border-b px-4 py-2 text-xs text-muted-foreground">
                {active ? formatStarted(active.startedAt) : ""}
                <button
                  type="button"
                  className="ml-2 text-brand-navy hover:underline"
                  onClick={() => setView("home")}
                >
                  ← All conversations
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {active?.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex gap-2",
                      m.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {m.role === "agent" ? (
                      <ShopRallyMark size={28} variant="default" decorative className="shrink-0 rounded-full" />
                    ) : null}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                        m.role === "user"
                          ? "bg-brand-navy text-white"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
                {pending ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Thinking…
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 border-t p-3">
                <Button variant="ghost" size="icon-sm" aria-label="Attach file" disabled>
                  <Paperclip className="size-4 text-muted-foreground" />
                </Button>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button
                  size="icon-sm"
                  className="bg-brand-navy"
                  disabled={!draft.trim() || pending}
                  aria-label="Send"
                  onClick={sendMessage}
                >
                  <Send className="size-4" />
                </Button>
              </div>

              <div className="border-t px-4 py-2 text-center">
                <Link href="/support#contact-form" className="text-xs text-brand-navy hover:underline">
                  Need more help? Contact support →
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <Button
        size="icon"
        className="size-12 rounded-full bg-brand-navy shadow-lg hover:bg-brand-navy/90"
        aria-label="Help and support"
        onClick={() => {
          setOpen((v) => !v);
          setMinimized(false);
        }}
      >
        <HelpCircle className="size-5" />
      </Button>
    </div>
  );
}
