"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  REVIEW_REPLY_TONES,
  type ReviewReplyTone,
} from "@/lib/review-reply-tone";
import { updateReviewReplyTone } from "@/server/actions/google-reviews";
import { cn } from "@/lib/utils";

export function ReviewReplyTonePanel({
  initialTone,
  disabled,
}: {
  initialTone: ReviewReplyTone;
  disabled?: boolean;
}) {
  const [tone, setTone] = useState(initialTone);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(next: ReviewReplyTone) {
    setTone(next);
    setSaved(false);
    setError(null);
    start(async () => {
      const res = await updateReviewReplyTone(next);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-lg border border-brand-light/40 bg-brand-light/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-brand-navy">AI reply tone</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Applies to all new AI drafts on this shop. You can still edit before posting.
          </p>
        </div>
        {saved ? <span className="text-xs text-emerald-600">Saved</span> : null}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {REVIEW_REPLY_TONES.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled || pending}
            onClick={() => save(opt.value)}
            className={cn(
              "rounded-md border px-3 py-2 text-left text-sm transition-colors",
              tone === opt.value
                ? "border-brand-navy bg-white shadow-sm"
                : "border-transparent bg-white/60 hover:bg-white",
              (disabled || pending) && "opacity-60",
            )}
          >
            <Label className="cursor-pointer font-medium">{opt.label}</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
          </button>
        ))}
      </div>
      {pending ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Saving…
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
