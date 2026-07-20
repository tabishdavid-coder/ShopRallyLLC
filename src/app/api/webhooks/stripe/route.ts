import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe, isStripeEnabled } from "@/lib/stripe";
import { rateLimitRouteAsync } from "@/lib/rate-limit";
import { handleCheckoutSessionCompleted } from "@/server/services/stripe-payments";
import { handleDepositCheckoutCompleted } from "@/server/services/stripe-deposit";
import { handleMaintenanceCheckoutCompleted } from "@/server/services/stripe-maintenance";
import { handleSeoCheckoutCompleted, SEO_CHECKOUT_KIND } from "@/server/services/seo-stripe-checkout";
import {
  handlePlanCheckoutCompleted,
  PLAN_CHECKOUT_KIND,
} from "@/server/services/plan-stripe-checkout";
import { handleAccountDeauthorized, handleAccountUpdated } from "@/server/services/stripe-connect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe webhook — invoice payments, maintenance enrollments, SEO add-on purchases.
 * Stripe Dashboard → Developers → Webhooks → Add endpoint:
 *   https://YOUR_DOMAIN/api/webhooks/stripe
 * Events: checkout.session.completed, account.updated, account.application.deauthorized
 * Local dev: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */
export async function POST(request: Request) {
  if (!isStripeEnabled()) {
    return new NextResponse("Stripe not configured", { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const limited = await rateLimitRouteAsync("stripe-webhook", ip, 200, 60_000);
  if (!limited.ok) {
    return new NextResponse("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else if (
      process.env.NODE_ENV === "development" &&
      process.env.STRIPE_WEBHOOK_DEV_ALLOW === "1"
    ) {
      event = JSON.parse(body) as Stripe.Event;
    } else {
      return new NextResponse("Missing webhook signature", { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    console.error("[stripe webhook] signature verification failed:", message);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.checkoutKind === "maintenance_plan") {
          await handleMaintenanceCheckoutCompleted(session);
        } else if (session.metadata?.checkoutKind === SEO_CHECKOUT_KIND) {
          await handleSeoCheckoutCompleted(session);
        } else if (session.metadata?.checkoutKind === PLAN_CHECKOUT_KIND) {
          await handlePlanCheckoutCompleted(session);
        } else if (session.metadata?.checkoutKind === "estimate_deposit") {
          await handleDepositCheckoutCompleted(session);
        } else {
          await handleCheckoutSessionCompleted(session);
        }
        break;
      }
      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      case "account.application.deauthorized": {
        const deauth = event.data.object as { account?: string };
        const accountId =
          deauth.account ??
          (typeof event.account === "string" ? event.account : undefined);
        if (accountId) await handleAccountDeauthorized(accountId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
