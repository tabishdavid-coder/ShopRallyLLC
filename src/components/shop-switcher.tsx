"use client";

import Link from "next/link";
import { ChevronsUpDown, Plus, Check, Loader2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Shop } from "@/lib/shop";
import { syncClerkActiveOrg } from "@/lib/clerk-org-client";
import { isClerkConfigured } from "@/lib/clerk-auth-client";
import { switchShop } from "@/server/actions/platform";
import { useClerk } from "@clerk/nextjs";

export function ShopSwitcher({
  shops,
  activeShopId,
  isPlatformAdmin,
  platformMode = false,
}: {
  shops: Shop[];
  activeShopId: string;
  isPlatformAdmin?: boolean;
  platformMode?: boolean;
}) {
  if (isClerkConfigured()) {
    return (
      <ShopSwitcherWithClerk
        shops={shops}
        activeShopId={activeShopId}
        isPlatformAdmin={isPlatformAdmin}
        platformMode={platformMode}
      />
    );
  }

  return (
    <ShopSwitcherInner
      shops={shops}
      activeShopId={activeShopId}
      isPlatformAdmin={isPlatformAdmin}
      platformMode={platformMode}
    />
  );
}

function ShopSwitcherWithClerk(props: {
  shops: Shop[];
  activeShopId: string;
  isPlatformAdmin?: boolean;
  platformMode?: boolean;
}) {
  const clerk = useClerk();
  return <ShopSwitcherInner {...props} clerk={clerk} />;
}

function ShopSwitcherInner({
  shops,
  activeShopId,
  isPlatformAdmin,
  platformMode = false,
  clerk,
}: {
  shops: Shop[];
  activeShopId: string;
  isPlatformAdmin?: boolean;
  platformMode?: boolean;
  clerk?: ReturnType<typeof useClerk>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const active = shops.find((s) => s.id === activeShopId) ?? shops[0];
  const [error, setError] = useState<string | null>(null);

  function selectShop(shop: Shop) {
    if (shop.id === activeShopId && !platformMode) return;
    setError(null);
    start(async () => {
      const res = await switchShop(shop.id);
      if (res.ok) {
        if (clerk) await syncClerkActiveOrg(clerk, shop.id);
        router.push("/job-board");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (platformMode) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-brand-red text-primary-foreground">
                  <Shield className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Platform owner</span>
                  <span className="truncate text-xs text-sidebar-muted-foreground">
                    Manage shops & tenants
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
              align="start"
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Context
              </DropdownMenuLabel>
              <DropdownMenuItem className="gap-2" disabled>
                <div className="flex size-6 items-center justify-center rounded-sm border bg-brand-red/10 text-brand-red">
                  <Shield className="size-3.5" />
                </div>
                Platform owner
                <Check className="ml-auto size-4" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Open shop CRM
              </DropdownMenuLabel>
              {shops.map((shop) => (
                <DropdownMenuItem
                  key={shop.id}
                  onClick={() => selectShop(shop)}
                  className="gap-2"
                  disabled={pending}
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border text-[10px] font-bold">
                    {shop.code}
                  </div>
                  {shop.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!active) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-muted text-xs font-bold">
              ?
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">No shop selected</span>
              <span className="truncate text-xs text-sidebar-muted-foreground">
                {shops.length === 0 ? "No shop access" : "Pick a shop below"}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
              disabled={pending}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
                {pending ? <Loader2 className="size-4 animate-spin" /> : active.code}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{active.name}</span>
                <span className="truncate text-xs text-sidebar-muted-foreground">
                  {error ? error : "Auto repair shop"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            align="start"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Shops
            </DropdownMenuLabel>
            {shops.map((shop) => (
              <DropdownMenuItem
                key={shop.id}
                onClick={() => selectShop(shop)}
                className="gap-2"
                disabled={pending}
              >
                <div className="flex size-6 items-center justify-center rounded-sm border text-[10px] font-bold">
                  {shop.code}
                </div>
                {shop.name}
                {shop.id === activeShopId && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
            ))}
            {isPlatformAdmin ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" asChild>
                  <Link href="/platform">
                    <Shield className="size-4 text-brand-red" />
                    Platform owner
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-muted-foreground" asChild>
                  <Link href="/platform/shops?create=1">
                    <Plus className="size-4" />
                    Add shop
                  </Link>
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
