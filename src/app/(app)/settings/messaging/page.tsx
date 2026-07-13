import { redirect } from "next/navigation";

import { getShopId } from "@/lib/shop";
import { getShopSubscription } from "@/lib/subscription";

/** Legacy URL — Phone & SMS lives under Communications (Pro+ only). */
export default async function MessagingSettingsRedirectPage() {
  const shopId = await getShopId();
  const sub = await getShopSubscription(shopId);
  if (!sub.features.customerSms) {
    redirect("/settings/communications/email");
  }
  redirect("/settings/communications/phone-sms");
}
