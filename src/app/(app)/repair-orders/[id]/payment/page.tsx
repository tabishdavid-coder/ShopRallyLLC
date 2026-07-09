import { redirect } from "next/navigation";

import { roEstimateActionHref } from "@/lib/ro-context-actions";

/** Payment collection moved into the RO Finance drawer — redirect legacy tab links there. */
export default async function RoPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(roEstimateActionHref(id, "payment"));
}
