import { GROWTH_PRODUCTS, growthEnginePageTitle } from "@/lib/growth-engine-brand";
import { GoogleReviewsPageClient } from "@/components/marketing/google-reviews/google-reviews-page-client";
import {
  ensureMockGoogleReviews,
  getGoogleReviewsInbox,
  getGoogleReviewsIntegration,
  type GoogleReviewFilter,
} from "@/server/google-reviews";
import { getIntegrationStatus } from "@/server/integrations";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";
import { getReviewReplyAiSettings } from "@/server/actions/google-reviews";

export const metadata = {
  title: growthEnginePageTitle(GROWTH_PRODUCTS.reputationPilot.label),
};
export const dynamic = "force-dynamic";

const FILTERS: GoogleReviewFilter[] = ["all", "needs-reply", "low", "five-star"];

function parseFilter(raw: string | undefined): GoogleReviewFilter {
  if (raw && FILTERS.includes(raw as GoogleReviewFilter)) return raw as GoogleReviewFilter;
  return "all";
}

function oauthErrorToPlain(raw: string | undefined): string | null {
  if (!raw) return null;
  switch (raw) {
    case "access_denied":
      return "Google sign-in was cancelled. Try again when you're ready.";
    case "missing_code":
      return "Google did not return a sign-in code. Please try again.";
    case "invalid_state":
      return "Sign-in session expired. Start over with Sign in with Google.";
    default:
      if (raw.includes("GOOGLE_CLIENT")) {
        return "Google sign-in is not configured on this site yet. Contact your ShopRally admin.";
      }
      return raw;
  }
}

export default async function GoogleReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; connected?: string; message?: string; error?: string }>;
}) {
  const shopId = await getShopId();
  await ensureMockGoogleReviews(shopId);

  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const [inbox, integration, status, aiReviewReplies, replySettings] = await Promise.all([
    getGoogleReviewsInbox(filter),
    getGoogleReviewsIntegration(shopId),
    getIntegrationStatus("google-reviews"),
    canUseFeature(shopId, "ai_review_replies"),
    getReviewReplyAiSettings(),
  ]);

  return (
    <GoogleReviewsPageClient
      inbox={inbox}
      filter={filter}
      connected={integration.connected}
      hasGoogleAccount={Boolean(integration.config.refreshToken)}
      envConfigured={status.envConfigured}
      oauthSuccessMessage={params.connected ? (params.message ?? "Google account connected.") : null}
      oauthError={oauthErrorToPlain(params.error)}
      aiReviewReplies={aiReviewReplies}
      reviewReplyTone={replySettings.tone}
    />
  );
}
