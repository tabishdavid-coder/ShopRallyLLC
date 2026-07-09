"use client";

import { usePathname } from "next/navigation";
import { Columns3 } from "lucide-react";

import { EnterShopCrmButton } from "@/components/platform/enter-shop-crm-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import { isNavItemActive, PLATFORM_NAV_GROUPS } from "@/lib/nav";
import type { Shop } from "@/lib/shop";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function PlatformSidebar({
  shops,
  activeShopId,
}: {
  shops: Shop[];
  activeShopId: string;
}) {
  const pathname = usePathname();
  const activeShop = shops.find((s) => s.id === activeShopId) ?? shops[0];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader>
        <div className="px-1 py-1.5 group-data-[collapsible=icon]:px-0">
          <ShopRallyLogo
            href="/platform"
            size="sm"
            variant="onDark"
            className="group-data-[collapsible=icon]:justify-center"
          />
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted-foreground group-data-[collapsible=icon]:hidden">
            Master CRM
          </p>
        </div>
        <p className="px-2 text-[10px] leading-snug text-sidebar-muted-foreground group-data-[collapsible=icon]:hidden">
          Manage ShopRally — shops, billing, onboarding, and compliance. Enter a shop for day-to-day
          operations.
        </p>
      </SidebarHeader>

      <SidebarContent>
        {PLATFORM_NAV_GROUPS.map((group, i) => (
          <SidebarGroup key={group.label ?? `group-${i}`}>
            {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isNavItemActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          active &&
                            "!bg-sidebar-primary !text-sidebar-primary-foreground hover:!bg-sidebar-primary/90 hover:!text-sidebar-primary-foreground font-semibold",
                        )}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {activeShop ? (
          <div className="px-2 pb-2 group-data-[collapsible=icon]:px-0">
            <EnterShopCrmButton
              shopId={activeShop.id}
              shopName={activeShop.name}
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <Columns3 className="size-4 shrink-0" />
              <span className="truncate group-data-[collapsible=icon]:hidden">
                Shop CRM · {activeShop.name}
              </span>
            </EnterShopCrmButton>
          </div>
        ) : null}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
