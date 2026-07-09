"use client";

import Link from "next/link";
import { Building2, Columns3 } from "lucide-react";

import { EnterShopCrmButton } from "@/components/platform/enter-shop-crm-button";
import { Button } from "@/components/ui/button";
import { MASTER_CRM_HOME } from "@/lib/platform-routing";
import type { Shop } from "@/lib/shop";

/** Master vs Shop CRM context — platform routes only (no DEV shell dependency). */
export function PlatformContextCard({ activeShop }: { activeShop: Shop | null }) {
  return (
    <div className="grid gap-4 rounded-xl border border-brand-navy/15 bg-gradient-to-br from-brand-navy/[0.04] to-brand-light/25 p-5 sm:grid-cols-2">
      <div>
        <div className="flex items-center gap-2 text-brand-navy">
          <Building2 className="size-4" aria-hidden />
          <p className="text-sm font-semibold">Master CRM — you are here</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage ShopRally: shops, plans, onboarding, leads, legal, and system health.
        </p>
      </div>
      <div>
        <div className="flex items-center gap-2 text-brand-navy">
          <Columns3 className="size-4" aria-hidden />
          <p className="text-sm font-semibold">Shop CRM — tenant operations</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {activeShop
            ? `Customers, ROs, and payments for ${activeShop.name}.`
            : "Pick a shop under Shops, then enter its CRM."}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {activeShop ? (
            <EnterShopCrmButton
              shopId={activeShop.id}
              shopName={activeShop.name}
              size="sm"
              className="bg-brand-navy"
            />
          ) : (
            <Button asChild size="sm" variant="outline" className="border-brand-navy/30">
              <Link href={`${MASTER_CRM_HOME}/shops`}>Browse shops</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
