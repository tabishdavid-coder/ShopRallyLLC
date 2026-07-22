import { redirect } from "next/navigation";

import { getShopId } from "@/lib/shop";
import { getShopSubscription } from "@/lib/subscription";

/** Default Communications section — Phone & SMS when entitled; else email. */
export default async function CommunicationsSettingsPage() {
  const shopId = await getShopId();
  const sub = await getShopSubscription(shopId);
  if (sub.features.customerSms) {
    redirect("/settings/communications/phone-sms");
  }
  redirect("/settings/communications/email");
}
