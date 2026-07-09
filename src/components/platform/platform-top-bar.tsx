"use client";

import { usePathname } from "next/navigation";
import { Columns3 } from "lucide-react";

import { EnterShopCrmButton } from "@/components/platform/enter-shop-crm-button";
import { PlatformBreadcrumbs } from "@/components/platform/platform-breadcrumbs";
import { platformNavTitle } from "@/lib/nav";
import type { Shop } from "@/lib/shop";

export function PlatformTopBar({
  shops,
  activeShopId,
}: {
  shops: Shop[];
  activeShopId: string;
}) {
  const pathname = usePathname();
  const title = platformNavTitle(pathname) ?? "Overview";
  const activeShop = shops.find((s) => s.id === activeShopId) ?? shops[0];

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-brand-navy/10 bg-brand-navy text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-light">
            Master CRM · ShopRally operator
          </p>
          <h1 className="mt-0.5 truncate text-lg font-bold">{title}</h1>
          <PlatformBreadcrumbs className="mt-1.5" />
        </div>
        {activeShop ? (
          <EnterShopCrmButton
            shopId={activeShop.id}
            shopName={activeShop.name}
            size="sm"
            className="shrink-0 gap-1.5 bg-brand-light text-brand-navy hover:bg-brand-light/90"
          >
            <Columns3 className="size-3.5" />
            Enter {activeShop.name}
          </EnterShopCrmButton>
        ) : null}
      </div>
    </header>
  );
}
