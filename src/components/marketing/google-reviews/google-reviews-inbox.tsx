"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, MessageSquare, Pencil, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StarRating } from "@/components/marketing/google-reviews/star-rating";
import { PLANS } from "@/lib/plans";
import { draftGoogleReviewReply, replyToGoogleReview } from "@/server/actions/google-reviews";
import type { ReviewReplyVariant } from "@/lib/review-reply-tone";
import type { GoogleReviewRow } from "@/server/google-reviews";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring min-h-[88px] resize-y";

function formatReviewDate(d: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(d));
}

function ReviewCard({
  review,
  mockMode,
  aiReviewReplies,
}: {
  review: GoogleReviewRow;
  mockMode: boolean;
  aiReviewReplies: boolean;
}) {
  const [editing, setEditing] = useState(!review.reviewReply);
  const [reply, setReply] = useState(review.reviewReply ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedLocally, setSavedLocally] = useState(false);
  const [pending, start] = useTransition();
  const [draftPending, startDraft] = useTransition();

  function save() {
    setError(null);
    setSavedLocally(false);
    start(async () => {
      const res = await replyToGoogleReview({ reviewId: review.id, comment: reply });
      if (res.ok) {
        setEditing(false);
        if (mockMode) setSavedLocally(true);
      } else {
        setError(res.error);
      }
    });
  }

  function draftWithAi(variant: ReviewReplyVariant = "default") {
    setError(null);
    startDraft(async () => {
      const res = await draftGoogleReviewReply({
        reviewId: review.id,
        variant,
        currentDraft: variant !== "default" ? reply : undefined,
      });
      if (res.ok && res.draft) {
        setReply(res.draft);
        setEditing(true);
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{review.reviewerName}</h3>
            <StarRating rating={review.starRating} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatReviewDate(review.googleCreatedAt)}</p>
        </div>
        {!review.reviewReply ? (
          <span className="rounded-full bg-brand-red/10 px-2 py-0.5 text-[11px] font-medium text-brand-red">
            Needs reply
          </span>
        ) : null}
      </div>

      {review.comment ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground">{review.comment}</p>
      ) : (
        <p className="mt-3 text-sm italic text-muted-foreground">No written review — rating only.</p>
      )}

      {review.reviewReply && !editing ? (
        <div className="mt-4 rounded-md border-l-4 border-brand-navy/30 bg-brand-navy/5 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-brand-navy">Your reply</p>
          <p className="mt-1 text-sm text-foreground">{review.reviewReply}</p>
          {review.replyUpdatedAt ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Updated {formatReviewDate(review.replyUpdatedAt)}
              {mockMode ? " · saved locally" : " · posted to Google"}
            </p>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-medium">Reply</label>
            {aiReviewReplies ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-brand-navy/20 text-brand-navy"
                  disabled={draftPending || pending}
                  onClick={() => draftWithAi("default")}
                >
                  {draftPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  Draft with AI
                </Button>
                {reply.trim() ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      disabled={draftPending || pending}
                      onClick={() => draftWithAi("shorter")}
                    >
                      Shorter
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      disabled={draftPending || pending}
                      onClick={() => draftWithAi("longer")}
                    >
                      Longer
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          <textarea
            className={inputCls}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Thank the customer and address their feedback…"
            maxLength={4096}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {aiReviewReplies ? (
            <p className="text-[11px] text-muted-foreground">
              AI drafts are suggestions — edit before posting. You are responsible for published replies.
            </p>
          ) : null}
          {mockMode ? (
            <p className="text-[11px] text-muted-foreground">
              Saved locally — connect Google to publish replies on your Business Profile.
            </p>
          ) : null}
          {savedLocally && mockMode ? (
            <p className="text-xs text-emerald-700">Reply saved. Connect Google to publish it live.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={save} disabled={pending || !reply.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {review.reviewReply ? "Update reply" : mockMode ? "Save draft" : "Post reply"}
            </Button>
            {review.reviewReply ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReply(review.reviewReply ?? "");
                  setEditing(false);
                }}
                disabled={pending}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {mockMode ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
                      {review.reviewReply ? (
                        <>
                          <Pencil className="size-3.5" /> Edit draft
                        </>
                      ) : (
                        <>
                          <MessageSquare className="size-3.5" /> Draft reply
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Connect Google to publish replies on your Business Profile</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
              {review.reviewReply ? (
                <>
                  <Pencil className="size-3.5" /> Edit reply
                </>
              ) : (
                <>
                  <MessageSquare className="size-3.5" /> Reply
                </>
              )}
            </Button>
          )}
          {aiReviewReplies && !review.reviewReply ? (
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 bg-brand-light/30 text-brand-navy hover:bg-brand-light/50"
              disabled={draftPending}
              onClick={() => draftWithAi("default")}
            >
              {draftPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Draft with AI
            </Button>
          ) : null}
          {!aiReviewReplies && !review.reviewReply ? (
            <Button size="sm" variant="ghost" className="text-muted-foreground" asChild>
              <Link href="/billing">
                <Sparkles className="mr-1.5 size-3.5" />
                AI drafts on {PLANS.ENTERPRISE.name}
              </Link>
            </Button>
          ) : null}
        </div>
      )}
    </article>
  );
}

export function GoogleReviewsInbox({
  inbox,
  filter,
  hasGoogleAccount,
  envConfigured,
  aiReviewReplies,
}: {
  inbox: {
    reviews: GoogleReviewRow[];
    averageRating: number;
    totalCount: number;
    needsReplyCount: number;
    mode: "live" | "mock";
    connected: boolean;
    locationName: string | null;
  };
  filter: string;
  hasGoogleAccount: boolean;
  envConfigured: boolean;
  aiReviewReplies: boolean;
}) {
  const mockMode = inbox.mode === "mock" || !inbox.connected;
  const showDemoBadge = mockMode && inbox.totalCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-4xl font-bold tabular-nums text-brand-navy">
              {inbox.averageRating > 0 ? inbox.averageRating.toFixed(1) : "—"}
            </p>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StarRating rating={Math.round(inbox.averageRating)} size="md" />
                {inbox.connected ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Connected
                  </span>
                ) : hasGoogleAccount ? (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                    Google account linked
                  </span>
                ) : showDemoBadge ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    Demo reviews
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {inbox.totalCount} review{inbox.totalCount === 1 ? "" : "s"}
                {inbox.locationName ? ` · ${inbox.locationName}` : null}
                {showDemoBadge && !inbox.connected ? " · connect Google for live data" : null}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip href="/marketing/reviews" label="All" active={filter === "all"} count={inbox.totalCount} />
          <FilterChip
            href="/marketing/reviews?filter=needs-reply"
            label="Needs reply"
            active={filter === "needs-reply"}
            count={inbox.needsReplyCount}
            accent
          />
          <FilterChip href="/marketing/reviews?filter=low" label="1–2 star" active={filter === "low"} />
          <FilterChip href="/marketing/reviews?filter=five-star" label="5 star" active={filter === "five-star"} />
        </div>
      </div>

      {inbox.reviews.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-12 text-center">
          {!inbox.connected ? (
            <div className="mx-auto max-w-md space-y-2">
              <p className="font-medium text-foreground">No reviews yet</p>
              <p className="text-sm text-muted-foreground">
                {hasGoogleAccount
                  ? "Your Google account is linked. Sync reviews or finish location setup to see them here."
                  : envConfigured
                    ? "Connect your Google Business Profile to import reviews, or browse demo data after sync."
                    : "Demo reviews appear after sync. Connect Google when sign-in is enabled on your site."}
              </p>
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link href="/vendors/integrations/google-reviews">Open setup guide</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reviews match this filter.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {inbox.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} mockMode={mockMode} aiReviewReplies={aiReviewReplies} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
  count,
  accent,
}: {
  href: string;
  label: string;
  active: boolean;
  count?: number;
  accent?: boolean;
}) {
  return (
    <a
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-brand-navy bg-brand-navy text-white"
          : accent
            ? "border-brand-red/30 text-brand-red hover:bg-brand-red/5"
            : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
      {count != null && count > 0 ? ` (${count})` : null}
    </a>
  );
}
