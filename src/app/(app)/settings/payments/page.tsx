import { redirect } from "next/navigation";

/** Legacy settings URL — Payment account lives under Shop Growth. */
export default async function SettingsPaymentsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const q = await searchParams;
  const suffix = q.connect ? `?connect=${q.connect}` : "";
  redirect(`/marketing/payment-account${suffix}`);
}
