import type { Metadata } from "next";

import { SettingsOverview } from "@/components/settings/settings-overview";

export const metadata: Metadata = { title: "Shop Settings — ShopRally" };

export default function SettingsOverviewPage() {
  return <SettingsOverview />;
}
