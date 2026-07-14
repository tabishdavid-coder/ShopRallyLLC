import { MessagesSquare } from "lucide-react";

import { SettingsHero } from "@/components/settings/settings-hero";
import { CommunicationsSubnav } from "@/components/settings/communications-subnav";

export default function CommunicationsSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <SettingsHero
        icon={MessagesSquare}
        title="Communications"
        description="Phone & SMS, email sending, and customer/staff notifications — how ShopRally talks to your customers."
      />
      <CommunicationsSubnav>{children}</CommunicationsSubnav>
    </div>
  );
}
