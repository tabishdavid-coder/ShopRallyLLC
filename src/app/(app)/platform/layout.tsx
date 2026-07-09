import { redirect } from "next/navigation";

import { PlatformShell } from "@/components/platform/platform-shell";
import { isPlatformAdmin } from "@/lib/platform";
import { getShopId, listShops } from "@/lib/shop";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isPlatformAdmin())) {
    redirect("/dashboard");
  }

  const [shops, activeShopId] = await Promise.all([listShops(), getShopId()]);

  return (
    <PlatformShell shops={shops} activeShopId={activeShopId}>
      {children}
    </PlatformShell>
  );
}
