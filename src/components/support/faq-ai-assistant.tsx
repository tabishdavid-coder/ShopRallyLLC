"use client";

import { useState, useTransition } from "react";
import { Loader2, Send, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askFaqQuestion } from "@/server/actions/support";

export function FaqAiAssistant() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "keyword" | null>(null);
  const [matches, setMatches] = useState<{ slug: string; question: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    setHelpful(null);
    start(async () => {
      const res = await askFaqQuestion(question);
      if (!res.ok) {
        setError(res.error);
        setAnswer(null);
        return;
      }
      setAnswer(res.answer);
      setSource(res.source);
      setMatches(res.matches);
    });
  }

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Ask a question</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Search our FAQ library. When configured, AI uses your question plus FAQ context for a tailored answer.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How do I connect Stripe for customer payments?"
          rows={2}
          className="min-h-[72px] flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (question.trim().length >= 3) submit();
            }
          }}
        />
        <Button
          className="shrink-0 bg-brand-navy sm:self-end"
          onClick={submit}
          disabled={pending || question.trim().length < 3}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Send className="mr-1.5 size-4" />
              Ask
            </>
          )}
        </Button>
      </div>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      {answer ? (
        <div className="mt-4 rounded-md border border-brand-light/40 bg-brand-light/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy">
              {source === "ai" ? "AI answer" : "Best match"}
            </p>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>

          {matches.length > 0 ? (
            <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
              {matches.map((m) => (
                <li key={m.slug} className="text-muted-foreground">
                  · {m.question}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3">
            <span className="text-xs text-muted-foreground">Was this helpful?</span>
            <Button
              size="sm"
              variant={helpful === true ? "default" : "outline"}
              className="h-7 gap-1"
              onClick={() => setHelpful(true)}
            >
              <ThumbsUp className="size-3.5" /> Yes
            </Button>
            <Button
              size="sm"
              variant={helpful === false ? "default" : "outline"}
              className="h-7 gap-1"
              onClick={() => setHelpful(false)}
            >
              <ThumbsDown className="size-3.5" /> No
            </Button>
            {helpful === false ? (
              <a href="#contact-form" className="text-xs font-medium text-brand-navy underline">
                Contact support instead
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
