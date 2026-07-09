"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { isNavItemActive, NAV_GROUPS } from "@/lib/nav";
import type { Shop } from "@/lib/shop";
import { ShopSwitcher } from "@/components/shop-switcher";
import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import { cn } from "@/lib/utils";

/** Legacy shop sidebar — Master CRM uses `PlatformSidebar` under `/platform/**`. */
export function AppSidebar({
  shops,
  activeShopId,
  isPlatformAdmin = false,
  unreadSmsCount = 0,
}: {
  shops: Shop[];
  activeShopId: string;
  isPlatformAdmin?: boolean;
  unreadSmsCount?: number;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="px-1 py-1.5 group-data-[collapsible=icon]:px-0">
          <ShopRallyLogo
            href="/dashboard"
            size="sm"
            variant="onDark"
            className="group-data-[collapsible=icon]:justify-center"
          />
        </div>
        <ShopSwitcher
          shops={shops}
          activeShopId={activeShopId}
          isPlatformAdmin={isPlatformAdmin}
          platformMode={false}
        />
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group, i) => (
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
                      {item.href === "/messages" && unreadSmsCount > 0 ? (
                        <SidebarMenuBadge className="bg-brand-red text-white">
                          {unreadSmsCount > 9 ? "9+" : unreadSmsCount}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Avatar className="size-8 rounded-md">
                <AvatarFallback className="rounded-md text-xs">DT</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">David Tabish</span>
                <span className="truncate text-xs text-sidebar-muted-foreground">Owner</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
