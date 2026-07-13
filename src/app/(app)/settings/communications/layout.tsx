import { MessagesSquare } from "lucide-react";
import { redirect } from "next/navigation";

import { SettingsSubnav, communicationsSubnavForPlan } from "@/components/settings/settings-subnav";
import { SettingsHero } from "@/components/settings/settings-hero";
import { getShopId } from "@/lib/shop";
import { getShopSubscription } from "@/lib/subscription";

export default async function CommunicationsSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shopId = await getShopId();
  const sub = await getShopSubscription(shopId);
  const subnav = communicationsSubnavForPlan(sub.features);
  if (subnav.length === 0) {
    redirect("/settings/subscription?upgrade=customerSms");
  }

  return (
    <div className="space-y-5">
      <SettingsHero
        icon={MessagesSquare}
        title="Communications"
        description={
          sub.features.customerSms
            ? "Phone & SMS, email sending, and customer/staff notifications — how ShopRally talks to your customers."
            : "Email sending and customer/staff notifications — how ShopRally talks to your customers."
        }
      />
      <SettingsSubnav items={subnav} ariaLabel="Communications settings">
        {children}
      </SettingsSubnav>
    </div>
  );
}
