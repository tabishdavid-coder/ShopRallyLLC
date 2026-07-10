import { MessagesSquare } from "lucide-react";

import { SettingsSubnav, COMMUNICATIONS_SUBNAV } from "@/components/settings/settings-subnav";
import { SettingsHero } from "@/components/settings/settings-hero";

export default function CommunicationsSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <SettingsHero
        icon={MessagesSquare}
        title="Communications"
        description="Phone & SMS, email sending, and customer/staff notifications — how ShopRally talks to your customers."
      />
      <SettingsSubnav items={COMMUNICATIONS_SUBNAV} ariaLabel="Communications settings">
        {children}
      </SettingsSubnav>
    </div>
  );
}
