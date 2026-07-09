import { redirect } from "next/navigation";

/** Legacy alias — Stripe Connect lives under Shop Growth → Payment account. */
export default async function StripeSettingsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const q = await searchParams;
  const suffix = q.connect ? `?connect=${q.connect}` : "";
  redirect(`/marketing/payment-account${suffix}`);
}
