"use client";

import { SettingsSubnav, COMMUNICATIONS_SUBNAV } from "@/components/settings/settings-subnav";
import { useShopCapabilities } from "@/lib/shop-capabilities";

/** Communications left rail — keeps Phone & SMS visible (locked label) on Core. */
export function CommunicationsSubnav({ children }: { children: React.ReactNode }) {
  const { sms } = useShopCapabilities();
  const items = COMMUNICATIONS_SUBNAV.map((item) =>
    item.id === "phone-sms" && !sms ? { ...item, label: "Phone & SMS" } : item,
  );

  return (
    <SettingsSubnav items={items} ariaLabel="Communications settings">
      {children}
    </SettingsSubnav>
  );
}
