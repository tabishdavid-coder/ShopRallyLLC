import { TransactionFeesCard } from "@/components/payments/transaction-fees-card";
import { StripeConnectPanel } from "@/components/settings/stripe-connect-panel";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";
import { AgreementType } from "@/generated/prisma";
import { getCurrentAgreementDocument, shopHasCurrentAgreement } from "@/server/legal";
import { getPlatformStripeConfig } from "@/server/actions/stripe-connect";
import {
  getShopConnectPrerequisites,
  getShopStripeStatus,
  syncShopFromStripeAccount,
} from "@/server/services/stripe-connect";

/** Stripe Connect + transaction fees — shared by settings and payments module routes. */
export async function PaymentsAccountSettings({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const query = await searchParams;
  const shopId = await getShopId();

  const stripeOnPlan = await canUseFeature(shopId, "stripePayments");
  if (!stripeOnPlan) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        <p className="font-semibold">Stripe Connect is on Pro &amp; Elite</p>
        <p className="mt-2 text-amber-900/90">
          Core includes manual payment capture (cash, check, card terminal recorded in-shop). Online
          Stripe Checkout and Connect payouts require Pro or Elite.
        </p>
        <Button asChild className="mt-4 bg-brand-navy" size="sm">
          <Link href="/settings/subscription">View plans</Link>
        </Button>
      </div>
    );
  }

  if (query.connect === "return" || query.connect === "refresh") {
    try {
      await syncShopFromStripeAccount(shopId);
    } catch {
      // Non-fatal — shop can click Refresh status
    }
  }

  const [shopStripe, prereqs, platform, paymentAddendumAccepted, paymentAddendumDoc] =
    await Promise.all([
      getShopStripeStatus(shopId),
      getShopConnectPrerequisites(shopId),
      getPlatformStripeConfig(),
      shopHasCurrentAgreement(shopId, AgreementType.PAYMENT_ADDENDUM),
      getCurrentAgreementDocument(AgreementType.PAYMENT_ADDENDUM),
    ]);

  const connectReturn =
    query.connect === "return" || query.connect === "refresh"
      ? (query.connect as "return" | "refresh")
      : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <StripeConnectPanel
        status={shopStripe}
        prereqs={prereqs}
        platform={platform}
        connectReturn={connectReturn}
        variant="account"
        paymentAddendumAccepted={paymentAddendumAccepted}
        paymentAddendumVersion={paymentAddendumDoc?.version ?? null}
      />
      <TransactionFeesCard />
    </div>
  );
}
