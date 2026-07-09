import { PaymentsAccountSettings } from "@/components/settings/payments-account-settings";

export const dynamic = "force-dynamic";

export default function PaymentsAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  return <PaymentsAccountSettings searchParams={searchParams} />;
}
