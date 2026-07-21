# Google Business Profile — Reviews (Marketing)

ShopRally integrates with the [Google Business Profile API](https://developers.google.com/my-business/content/review-data) so shops can list, filter, and reply to Google reviews from **Marketing → Reviews** — similar to Tekmetric/Shopmonkey reputation modules.

**Plan:** Google Reviews inbox (connect, sync, reply) is included on **Core and above**. AI reply drafts remain Elite / `aiSuite`. Review-request **campaigns** stay Pro+ (Growth Engine).

## Architecture

| Layer | Responsibility |
| --- | --- |
| **Platform** | Google Cloud project, OAuth client, Business Profile API access |
| **Shop** | OAuth connect per shop → refresh token + GBP account/location IDs in `ShopIntegration` (`vendorKey: google_reviews`) |
| **Cache** | `GoogleReview` rows synced from Google (or seeded in mock mode) |
| **UI** | `/marketing/reviews` inbox + `/vendors/integrations/google-reviews` connect |
| **Background** | Inngest cron every 6h + `GET /api/cron/google-reviews-sync` (Bearer `CRON_SECRET`) |

## Environment variables

```env
GOOGLE_CLIENT_ID=          # OAuth 2.0 Web client ID
GOOGLE_CLIENT_SECRET=      # OAuth client secret
GOOGLE_REDIRECT_URI=       # Default: {APP_URL}/api/google/reviews/callback
APP_URL=http://localhost:3031
CRON_SECRET=               # Protects manual fleet sync cron
```

Without Google OAuth env vars, the app runs in **mock mode** with seeded demo reviews for the demo shop.

## Shop setup checklist

1. **Verified Google Business Profile** for the shop location (owner/manager access).
2. **Google Cloud project** with Business Profile APIs enabled and **API access approved** by Google (not open by default — submit access request with use case).
3. **OAuth consent screen** — external or internal, with scope `https://www.googleapis.com/auth/business.manage`.
4. In ShopRally: **Vendors → Google Reviews → Sign in with Google**, pick account + location from the picker, then **Sync reviews**.

## OAuth flow

1. Shop admin clicks **Sign in with Google**.
2. Redirect to Google consent (`access_type=offline`, `prompt=consent`).
3. Callback: `GET /api/google/reviews/callback?code=…&state=…`
4. Server exchanges code for refresh token, stores in `ShopIntegration.config`.
5. UI loads accounts/locations via Account Management + Business Information APIs; shop saves selection (includes Place ID for review links).
6. Sync pulls reviews (paginated) into `GoogleReview`.

## API endpoints used (live mode)

| Action | Method | URL |
| --- | --- | --- |
| List accounts | GET | `mybusinessaccountmanagement.googleapis.com/v1/accounts` |
| List locations | GET | `mybusinessbusinessinformation.googleapis.com/v1/accounts/{id}/locations` |
| List reviews | GET | `mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews` |
| Reply / update reply | PUT | `…/reviews/{reviewId}/reply` body `{ "comment": "…" }` |

## Sync scale

- Page size **50**, up to **40 pages** per shop sync (2,000 reviews cap per run; continues on next sync if truncated).
- DB upserts in **25-row** transactions.
- Fleet sync concurrency **3** shops at a time (Inngest + cron).

```bash
npm run test:google-reviews-scale
```

## Mock vs connected

| Mode | When | Behavior |
| --- | --- | --- |
| **Mock** | No OAuth env or shop not fully connected | Seeded demo reviews; replies save to DB only |
| **Connected** | Env + refresh token + account/location IDs | Sync pulls from Google; replies POST to Google |

## Local testing

```bash
npm run db:push      # apply GoogleReview schema
npm run db:seed      # loads 5 demo reviews for shop_demo
npm run dev
# Open http://localhost:3031/marketing/reviews
```

- Filter: All / Needs reply / 1–2 star / 5 star
- Reply to a review — persists in Postgres immediately
- **Sync** re-fetches from Google when connected, else refreshes mock seed if empty

## Deferred

- **Request review** SMS/email after completed RO (post-service campaign — Pro+)
- Token encryption at rest
- Multi-location shops (one location per shop today; picker supports choosing among many)
