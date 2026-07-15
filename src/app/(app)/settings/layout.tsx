import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SettingsShell } from "@/components/settings/settings-shell";
import { SettingsPlanProvider } from "@/lib/settings-plan-context";
import { settingsRouteDenied } from "@/lib/settings-plan-gates";
import { getShopId } from "@/lib/shop";
import { getShopSubscription } from "@/lib/subscription";

export const metadata: Metadata = { title: "Shop Settings — ShopRally" };

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const shopId = await getShopId();
  const sub = await getShopSubscription(shopId);
  const denied = settingsRouteDenied(pathname, sub.features);
  if (denied) {
    redirect(`/settings/subscription?upgrade=${denied}`);
  }

  return (
    <SettingsPlanProvider plan={sub.plan} features={sub.features}>
      <SettingsShell>{children}</SettingsShell>
    </SettingsPlanProvider>
  );
}
