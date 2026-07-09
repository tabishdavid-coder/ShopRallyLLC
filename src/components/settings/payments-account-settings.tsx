import { TransactionFeesCard } from "@/components/payments/transaction-fees-card";
import { StripeConnectPanel } from "@/components/settings/stripe-connect-panel";
import { getShopId } from "@/lib/shop";
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
