import { PaymentsAccountSettings } from "@/components/settings/payments-account-settings";

export const metadata = { title: "Payment account — Growth Engine" };
export const dynamic = "force-dynamic";

export default function MarketingPaymentAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  return <PaymentsAccountSettings searchParams={searchParams} />;
}
