import { redirect } from "next/navigation";

import { getShopId } from "@/lib/shop";
import { getShopSubscription } from "@/lib/subscription";

/** Legacy URL — Notifications lives under Communications (Ignition+ when entitled). */
export default async function NotificationsSettingsRedirectPage() {
  const shopId = await getShopId();
  const sub = await getShopSubscription(shopId);
  if (!sub.features.customerSms) {
    redirect("/settings/communications/email");
  }
  redirect("/settings/communications/notifications");
}
