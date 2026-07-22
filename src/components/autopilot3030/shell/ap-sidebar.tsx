"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreVertical,
  Plus,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";

import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import { useRoIntakeOptional } from "@/components/repair-order/ro-intake-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AP_HOME_HREF,
  AP_SIDEBAR_NAV_GROUPS,
  apSidebarNavItemIsActive,
  type ApNavLink,
} from "@/lib/autopilot3030/nav";
import { apSidebarLinkClass, apSidebarSectionClass } from "@/lib/autopilot3030/nav-active";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { isPlanHiddenNavHref } from "@/lib/crm-access";
import { isClerkConfigured } from "@/lib/clerk-auth-client";
import { syncClerkActiveOrg } from "@/lib/clerk-org-client";
import type { Shop } from "@/lib/shop";
import { useShopCapabilities } from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";
import { switchShop } from "@/server/actions/platform";

const SIDEBAR_COLLAPSED_KEY = "sr_ap_sidebar_collapsed";

function navHrefAllowed(href: string, allowed: Set<string>): boolean {
  if (allowed.has(href)) return true;
  if (allowed.has("/dashboard") && href.startsWith("/dashboard")) {
    return true;
  }
  if (href === "/marketing" && [...allowed].some((h) => h.startsWith("/marketing"))) {
    return true;
  }
  // Catalog — inventory only.
  if (href === "/inventory" && allowed.has("/inventory")) {
    return true;
  }
  // Admin hub covers settings when any admin surface is permitted.
  if (
    href === "/settings" &&
    [
      "/settings",
      "/employees",
      "/support",
      "/vendors/integrations",
      "/canned-jobs",
      "/labor-guide",
      "/inspections",
    ].some((h) => allowed.has(h) || [...allowed].some((a) => a.startsWith(`${h}/`)))
  ) {
    return true;
  }
  return false;
}

function filterItems(
  items: ApNavLink[],
  allowedNavHrefs: string[] | undefined,
  planFlags: { growth: boolean; maintenancePrograms: boolean; sms: boolean },
): ApNavLink[] {
  return items.filter((item) => {
    if (isPlanHiddenNavHref(item.href, planFlags)) return false;
    if (!allowedNavHrefs) return true;
    const allowed = new Set(allowedNavHrefs);
    return item.stub || navHrefAllowed(item.href, allowed);
  });
}

function shopInitials(name: string, code?: string): string {
  if (code && code.length >= 2) return code.slice(0, 2).toUpperCase();
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "SH";
}

function shortShopName(name: string): string {
  return name.replace(/\s+Garage$/i, "").trim() || name;
}

function SidebarLink({
  item,
  pathname,
  unreadSmsCount = 0,
  collapsed,
}: {
  item: ApNavLink;
  pathname: string;
  unreadSmsCount?: number;
  collapsed?: boolean;
}) {
  const active = apSidebarNavItemIsActive(pathname, item);
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <span
        className={cn(
          apSidebarLinkClass(false),
          "cursor-not-allowed opacity-45",
          collapsed && "justify-center px-0",
        )}
        title={item.title}
      >
        <Icon className="size-4 shrink-0 opacity-70" aria-hidden />
        {!collapsed ? <span className="truncate">{item.title}</span> : null}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.title : item.description}
      className={cn(
        apSidebarLinkClass(active),
        "relative",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          {item.stub ? (
            <Badge
              variant="outline"
              className="h-4 border-white/20 bg-white/10 px-1 text-[9px] text-white/80"
            >
              Soon
            </Badge>
          ) : null}
          {item.href === "/messages" && unreadSmsCount > 0 ? (
            <Badge className="ap-badge-accent h-4 px-1.5 text-[9px] text-white">
              {unreadSmsCount > 9 ? "9+" : unreadSmsCount}
            </Badge>
          ) : null}
        </>
      ) : item.href === "/messages" && unreadSmsCount > 0 ? (
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-brand-orange" />
      ) : null}
    </Link>
  );
}

function SidebarCreateButton({ collapsed }: { collapsed?: boolean }) {
  const { openIntake, config } = useRoIntakeOptional();

  const className = cn(
    "w-full gap-1.5 bg-brand-orange font-semibold text-white shadow-md hover:bg-brand-orange/90 active:bg-brand-orange/85",
    collapsed ? "h-10 px-0 justify-center" : "h-10 justify-start rounded-lg px-3",
  );

  if (config) {
    return (
      <Button
        type="button"
        className={className}
        aria-label={AP_TERMS.newRepairOrder}
        onClick={() => openIntake()}
      >
        <Plus className="size-4 shrink-0" aria-hidden />
        {collapsed ? null : <span>{AP_TERMS.newRepairOrder}</span>}
      </Button>
    );
  }

  return (
    <Button type="button" className={className} aria-label={AP_TERMS.newRepairOrder} asChild>
      <Link href="/repair-orders/new">
        <Plus className="size-4 shrink-0" aria-hidden />
        {collapsed ? null : <span>{AP_TERMS.newRepairOrder}</span>}
      </Link>
    </Button>
  );
}

function SidebarShopFooterInner({
  shops,
  activeShopId,
  collapsed,
  onToggleCollapse,
  clerk,
}: {
  shops: Shop[];
  activeShopId: string;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  clerk?: ReturnType<typeof useClerk>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const active = shops.find((s) => s.id === activeShopId) ?? shops[0];

  function selectShop(shop: Shop) {
    if (shop.id === activeShopId) return;
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

  const collapseBtn = (
    <button
      type="button"
      onClick={onToggleCollapse}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white",
        collapsed && "justify-center",
      )}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? (
        <ChevronRight className="size-4" aria-hidden />
      ) : (
        <>
          <ChevronLeft className="size-4 shrink-0" aria-hidden />
          Collapse
        </>
      )}
    </button>
  );

  if (!active) return <div className="space-y-1">{collapseBtn}</div>;

  const initials = shopInitials(active.name, active.code);

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left transition-colors hover:bg-white/10",
              collapsed && "justify-center px-0",
            )}
            title={active.name}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#00A9FF] text-[11px] font-bold text-white">
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : initials}
            </span>
            {!collapsed ? (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-white">
                    {shortShopName(active.name)}
                  </span>
                  <span className="block truncate text-[11px] text-white/55">Shop workspace</span>
                </span>
                <MoreVertical className="size-4 shrink-0 text-white/50" aria-hidden />
              </>
            ) : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56" side="right">
          <DropdownMenuLabel>Switch shop</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {shops.map((shop) => (
            <DropdownMenuItem key={shop.id} onClick={() => selectShop(shop)}>
              <span className="flex-1 truncate">{shop.name}</span>
              {shop.id === activeShopId ? <Check className="size-4 text-brand-navy" /> : null}
            </DropdownMenuItem>
          ))}
          {error ? <p className="px-2 py-1 text-xs text-destructive">{error}</p> : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {collapseBtn}
    </div>
  );
}

function SidebarShopFooter(props: {
  shops: Shop[];
  activeShopId: string;
  collapsed?: boolean;
  onToggleCollapse: () => void;
}) {
  if (isClerkConfigured()) {
    return <SidebarShopFooterWithClerk {...props} />;
  }
  return <SidebarShopFooterInner {...props} />;
}

function SidebarShopFooterWithClerk(props: {
  shops: Shop[];
  activeShopId: string;
  collapsed?: boolean;
  onToggleCollapse: () => void;
}) {
  const clerk = useClerk();
  return <SidebarShopFooterInner {...props} clerk={clerk} />;
}

/** Left sidebar — grouped Menu IA matching redesign screenshot. Keeps ShopRallyLogo. */
export function ApSidebar({
  shops = [],
  activeShopId = "",
  unreadSmsCount = 0,
  allowedNavHrefs,
}: {
  shops?: Shop[];
  activeShopId?: string;
  unreadSmsCount?: number;
  allowedNavHrefs?: string[];
}) {
  const pathname = usePathname();
  const caps = useShopCapabilities();
  const planFlags = {
    growth: caps.marketingCampaigns,
    maintenancePrograms: caps.maintenancePrograms,
    sms: caps.sms,
    stripePayments: caps.stripePayments,
    motorLabor: caps.motorLabor,
  };
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <aside
      className={cn("ap-sidebar", collapsed && "ap-sidebar--collapsed")}
      aria-label="Main navigation"
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div className={cn("ap-sidebar-header shrink-0 px-4 py-3", collapsed && "flex justify-center px-2")}>
        <ShopRallyLogo
          href={AP_HOME_HREF}
          size="sm"
          variant="onDark"
          markOnly={collapsed}
          className="max-w-full"
        />
      </div>

      <div className={cn("shrink-0 px-2.5 pt-3", collapsed && "px-1.5")}>
        <SidebarCreateButton collapsed={collapsed} />
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3",
          collapsed && "px-1.5",
        )}
      >
        {AP_SIDEBAR_NAV_GROUPS.map((group) => {
          const filtered = filterItems(group.items, allowedNavHrefs, planFlags);
          if (filtered.length === 0) return null;
          return (
            <div key={group.id} className="pb-3">
              {!collapsed ? <p className={apSidebarSectionClass()}>{group.label}</p> : null}
              <div className={cn("space-y-0.5", !collapsed && "mt-1")}>
                {filtered.map((item) => (
                  <SidebarLink
                    key={`${group.id}-${item.href}-${item.title}`}
                    item={item}
                    pathname={pathname}
                    unreadSmsCount={unreadSmsCount}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className={cn("ap-sidebar-footer shrink-0 px-2.5 py-3", collapsed && "px-1.5")}>
        <SidebarShopFooter
          shops={shops}
          activeShopId={activeShopId}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
      </div>
    </aside>
  );
}
