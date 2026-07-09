import type { Metadata } from "next";

import { SettingsTabs } from "@/components/settings/settings-tabs";

export const metadata: Metadata = { title: "Shop Settings — ShopRally" };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <SettingsTabs />
      {children}
    </div>
  );
}
