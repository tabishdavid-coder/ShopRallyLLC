# Stripe invoice payments — test guide

Matches the Tekmetric-style flow from the setup screenshot (Step 2 CRM lane).

## Prerequisites

1. **Stripe Dashboard** → activate **Checkout** and **Invoices** (Step 3 in setup guide).
2. Copy keys into `.env`:
   - `STRIPE_SECRET_KEY=sk_test_…`
   - `STRIPE_WEBHOOK_SECRET=whsec_…` (from Stripe CLI or Dashboard webhook)
   - `APP_URL=http://localhost:3000`
3. Start webhook forwarding (local dev):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Restart ShopRally: `npm run dev`

## Step 2 — CRM invoice pay flow

1. Open a **completed** repair order → **Payment** tab.
2. Click **View & Share Invoice** → send via **Email** or **SMS** (or copy link).
3. Open the public link (`/invoice/[token]`) in an incognito window.
4. Click **Pay invoice** → Stripe Checkout opens (navy `#16588E` button branding).
5. Pay with test card:
   - Number: `4242 4242 4242 4242`
   - Expiry: any future date
   - CVC: any 3 digits
   - ZIP: any 5 digits
6. After redirect back:
   - Public invoice shows **Paid in full**
   - RO **Payment** tab shows payment in **Payment history** (Stripe)
   - **Dashboard → Gross volume** reflects the payment amount

## Verify in Stripe Dashboard

- **Payments** → status **Succeeded**
- **Customers** → payment linked to checkout session

## Settings reference (Step 5)

ShopRally: **Admin → Payments → Account** shows Stripe Connect status (Tekmetric-equivalent). Legacy path Settings → Integrations → Stripe redirects here.

Tekmetric equivalent: Admin → Payments → Account → Sign in to see details / Connect with Stripe.

## Not in this MVP

- **Step 4 — Website `/shop-tires` deposit flow** — separate marketing site project; CRM only handles RO invoice balance.
- Stripe Terminal / card-present hardware (manual card record + Checkout link supported from Payment tab).
- Store credit wallet.
- Embedded Connect onboarding (`@stripe/connect-js`) — Account Links redirect is live.
- Stripe Billing for platform subscription tiers (see `/billing` — separate from Connect).

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| No Pay button on invoice | Set `STRIPE_SECRET_KEY` and restart dev server |
| Payment succeeds but invoice still open | Webhook not received — run `stripe listen` or add production webhook URL |
| Redirect goes to wrong host | Set `APP_URL` to your public origin |
