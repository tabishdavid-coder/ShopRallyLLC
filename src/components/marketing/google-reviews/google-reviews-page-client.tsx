"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";

import {
  GoogleReviewsConnectBanner,
  GoogleReviewsOAuthSuccessBanner,
} from "@/components/marketing/google-reviews/google-reviews-connect-banner";
import { GoogleReviewsInbox } from "@/components/marketing/google-reviews/google-reviews-inbox";
import { ReviewReplyTonePanel } from "@/components/marketing/google-reviews/review-reply-tone-panel";
import { GoogleReviewsSyncButton } from "@/components/marketing/google-reviews/google-reviews-sync-button";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import type { ReviewReplyTone } from "@/lib/review-reply-tone";
import type { GoogleReviewFilter } from "@/server/google-reviews";
import type { GoogleReviewsInbox as InboxData } from "@/server/google-reviews";

export function GoogleReviewsPageClient({
  inbox,
  filter,
  connected,
  hasGoogleAccount,
  envConfigured,
  oauthSuccessMessage,
  oauthError,
  aiReviewReplies,
  reviewReplyTone,
}: {
  inbox: InboxData;
  filter: GoogleReviewFilter;
  connected: boolean;
  hasGoogleAccount: boolean;
  envConfigured: boolean;
  oauthSuccessMessage?: string | null;
  oauthError?: string | null;
  aiReviewReplies: boolean;
  reviewReplyTone: ReviewReplyTone;
}) {
  const [showSuccess, setShowSuccess] = useState(Boolean(oauthSuccessMessage));
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const successText =
    oauthSuccessMessage ??
    "You can now sync reviews and reply from this inbox.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Google Reviews</h2>
          <p className="text-sm text-muted-foreground">
            Monitor reputation and respond to customer feedback from one inbox.
            {aiReviewReplies
              ? ` Draft replies with AI on ${PLANS.ENTERPRISE.name} — always review before posting.`
              : ` Manual replies on all plans · AI drafting on ${PLANS.ENTERPRISE.name}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GoogleReviewsSyncButton
            prominent={showSuccess}
            onMessage={(msg) => setSyncNote(msg)}
          />
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/vendors/integrations/google-reviews">
              <Settings2 className="size-3.5" />
              Setup
            </Link>
          </Button>
        </div>
      </div>

      {showSuccess ? (
        <div className="space-y-3">
          <GoogleReviewsOAuthSuccessBanner
            message={successText}
            onDismiss={() => setShowSuccess(false)}
          />
          <p className="text-sm text-muted-foreground">
            Next step: sync reviews to pull in your latest Google feedback.
          </p>
        </div>
      ) : null}

      {oauthError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {oauthError}
        </p>
      ) : null}

      {syncNote ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {syncNote}
        </p>
      ) : null}

      <GoogleReviewsConnectBanner
        connected={connected}
        hasGoogleAccount={hasGoogleAccount}
        envConfigured={envConfigured}
        locationName={inbox.locationName}
      />

      {aiReviewReplies ? <ReviewReplyTonePanel initialTone={reviewReplyTone} /> : null}

      <GoogleReviewsInbox
        inbox={inbox}
        filter={filter}
        hasGoogleAccount={hasGoogleAccount}
        envConfigured={envConfigured}
        aiReviewReplies={aiReviewReplies}
      />
    </div>
  );
}
