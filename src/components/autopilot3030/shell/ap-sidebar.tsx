"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import {
  Check,
  ChevronLeft,
  Loader2,
  MoreVertical,
  Pin,
  Plus,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";

import { ShopRallyMark } from "@/components/brand/shoprally-logo";
import { useRoIntakeOptional } from "@/components/repair-order/ro-intake-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { BRAND } from "@/lib/brand";
import { isPlanHiddenNavHref } from "@/lib/crm-access";
import { isClerkConfigured } from "@/lib/clerk-auth-client";
import { syncClerkActiveOrg } from "@/lib/clerk-org-client";
import type { Shop } from "@/lib/shop";
import { useShopCapabilities } from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";
import { switchShop } from "@/server/actions/platform";

const SIDEBAR_PINNED_KEY = "sr_sidebar_pinned";
const LEGACY_SIDEBAR_COLLAPSED_KEY = "sr_ap_sidebar_collapsed";

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

/** Microsoft-style flyout label when the sidebar is collapsed to the icon rail. */
function SidebarFlyoutWrap({
  label,
  section,
  collapsed,
  children,
}: {
  label: string;
  section?: string;
  collapsed?: boolean;
  children: ReactNode;
}) {
  if (!collapsed) {
    return <>{children}</>;
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="ap-sidebar-flyout-trigger">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={10} className="ap-sidebar-flyout">
        {section ? <span className="ap-sidebar-flyout-section">{section}</span> : null}
        <span className="ap-sidebar-flyout-label">{label}</span>
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarLink({
  item,
  pathname,
  unreadSmsCount = 0,
  collapsed,
  sectionLabel,
}: {
  item: ApNavLink;
  pathname: string;
  unreadSmsCount?: number;
  collapsed?: boolean;
  sectionLabel?: string;
}) {
  const active = apSidebarNavItemIsActive(pathname, item);
  const Icon = item.icon;
  const messageBadge =
    item.href === "/messages" && unreadSmsCount > 0 ? (
      <Badge className="ap-sidebar-badge ap-badge-accent text-white">
        {unreadSmsCount > 9 ? "9+" : unreadSmsCount}
      </Badge>
    ) : null;

  const linkBody = (
    <>
      <span className="ap-sidebar-icon-wrap shrink-0">
        <Icon
          className={cn("ap-sidebar-icon shrink-0", item.disabled ? "opacity-70" : "opacity-90")}
          aria-hidden
        />
        {messageBadge}
      </span>
      <span className="ap-sidebar-reveal min-w-0 truncate" aria-hidden={collapsed}>
        {item.title}
      </span>
      {item.stub ? (
        <Badge
          variant="outline"
          className="ap-sidebar-reveal h-4 shrink-0 border-white/20 bg-white/10 px-1 text-[9px] text-white/80"
          aria-hidden={collapsed}
        >
          Soon
        </Badge>
      ) : null}
    </>
  );

  const linkClass = cn(apSidebarLinkClass(active), "relative");

  if (item.disabled) {
    return (
      <SidebarFlyoutWrap label={item.title} section={sectionLabel} collapsed={collapsed}>
        <span className={cn(linkClass, "cursor-not-allowed opacity-45")}>{linkBody}</span>
      </SidebarFlyoutWrap>
    );
  }

  return (
    <SidebarFlyoutWrap label={item.title} section={sectionLabel} collapsed={collapsed}>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        title={collapsed ? undefined : item.description}
        className={linkClass}
      >
        {linkBody}
      </Link>
    </SidebarFlyoutWrap>
  );
}

function SidebarCreateButton({ collapsed }: { collapsed?: boolean }) {
  const { openIntake, config } = useRoIntakeOptional();

  const className = cn(
    "ap-sidebar-create-btn bg-brand-orange font-semibold text-white shadow-md hover:bg-brand-orange/90 active:bg-brand-orange/85",
  );

  const buttonBody = (
    <>
      <span className="ap-sidebar-icon-wrap shrink-0">
        <Plus className="ap-sidebar-icon shrink-0" aria-hidden />
      </span>
      <span className="ap-sidebar-reveal truncate" aria-hidden={collapsed}>
        {AP_TERMS.newRepairOrder}
      </span>
    </>
  );

  const button = config ? (
    <Button
      type="button"
      className={className}
      aria-label={AP_TERMS.newRepairOrder}
      onClick={() => openIntake()}
    >
      {buttonBody}
    </Button>
  ) : (
    <Button type="button" className={className} aria-label={AP_TERMS.newRepairOrder} asChild>
      <Link href="/repair-orders/new">{buttonBody}</Link>
    </Button>
  );

  return (
    <SidebarFlyoutWrap label={AP_TERMS.newRepairOrder} collapsed={collapsed}>
      {button}
    </SidebarFlyoutWrap>
  );
}

function SidebarShopFooterInner({
  shops,
  activeShopId,
  collapsed,
  pinned,
  onTogglePin,
  clerk,
}: {
  shops: Shop[];
  activeShopId: string;
  collapsed?: boolean;
  pinned?: boolean;
  onTogglePin: () => void;
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

  const pinLabel = pinned ? "Collapse" : "Keep expanded";

  const pinBtn = (
    <SidebarFlyoutWrap label={pinLabel} collapsed={collapsed}>
      <button
        type="button"
        onClick={onTogglePin}
        className="ap-sidebar-footer-pin rounded-lg py-1 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        aria-label={pinned ? "Collapse sidebar to icon rail" : "Keep sidebar expanded"}
      >
        <span className="ap-sidebar-icon-wrap shrink-0">
          {pinned ? (
            <ChevronLeft className="ap-sidebar-icon shrink-0" aria-hidden />
          ) : (
            <Pin className="ap-sidebar-icon shrink-0" aria-hidden />
          )}
        </span>
        <span className="ap-sidebar-reveal truncate" aria-hidden={collapsed}>
          {pinLabel}
        </span>
      </button>
    </SidebarFlyoutWrap>
  );

  if (!active) return <div className="space-y-1">{pinBtn}</div>;

  const initials = shopInitials(active.name, active.code);

  const shopName = shortShopName(active.name);

  const shopButton = (
    <button
      type="button"
      className="ap-sidebar-footer-shop border border-white/10 bg-white/5 py-1 text-left transition-colors hover:bg-white/10"
    >
      <span className="ap-sidebar-icon-wrap shrink-0">
        <span className="ap-sidebar-shop-avatar">
          {pending ? <Loader2 className="size-3 animate-spin" /> : initials}
        </span>
      </span>
      <span className="ap-sidebar-reveal min-w-0 flex-1" aria-hidden={collapsed}>
        <span className="block truncate text-[13px] font-semibold text-white">{shopName}</span>
        <span className="block truncate text-[11px] text-white/55">Shop workspace</span>
      </span>
      <MoreVertical
        className="ap-sidebar-reveal ap-sidebar-icon shrink-0 text-white/50"
        aria-hidden={collapsed}
      />
    </button>
  );

  const shopTrigger =
    collapsed ? (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>{shopButton}</DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" sideOffset={10} className="ap-sidebar-flyout">
          <span className="ap-sidebar-flyout-section">Shop workspace</span>
          <span className="ap-sidebar-flyout-label">{shopName}</span>
        </TooltipContent>
      </Tooltip>
    ) : (
      <DropdownMenuTrigger asChild>{shopButton}</DropdownMenuTrigger>
    );

  return (
    <div className="space-y-2">
      <DropdownMenu>{shopTrigger}
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
      {pinBtn}
    </div>
  );
}

function SidebarShopFooter(props: {
  shops: Shop[];
  activeShopId: string;
  collapsed?: boolean;
  pinned?: boolean;
  onTogglePin: () => void;
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
  pinned?: boolean;
  onTogglePin: () => void;
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
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    try {
      const pinnedPref = localStorage.getItem(SIDEBAR_PINNED_KEY);
      if (pinnedPref === "1") {
        setPinned(true);
        return;
      }
      if (pinnedPref === null) {
        const legacyCollapsed = localStorage.getItem(LEGACY_SIDEBAR_COLLAPSED_KEY);
        if (legacyCollapsed === "0") {
          setPinned(true);
          localStorage.setItem(SIDEBAR_PINNED_KEY, "1");
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  function togglePin() {
    setPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_PINNED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const collapsed = !pinned;

  return (
    <aside
      className={cn(
        "ap-sidebar",
        collapsed && "ap-sidebar--collapsed",
        pinned && "ap-sidebar--pinned",
      )}
      aria-label="Main navigation"
      data-collapsed={collapsed ? "true" : "false"}
      data-pinned={pinned ? "true" : "false"}
    >
      <div className="ap-sidebar-header ap-sidebar-body-pad shrink-0 py-3">
        <SidebarFlyoutWrap label={BRAND.name} collapsed={collapsed}>
          <Link href={AP_HOME_HREF} aria-label={BRAND.name} className="ap-sidebar-logo-link cursor-pointer">
            <span className="ap-sidebar-icon-wrap shrink-0">
              <ShopRallyMark size={24} variant="onDark" decorative className="ap-sidebar-icon" />
            </span>
            <span className="ap-sidebar-reveal ap-sidebar-logo-wordmark truncate">{BRAND.name}</span>
          </Link>
        </SidebarFlyoutWrap>
      </div>

      <div className="ap-sidebar-body-pad shrink-0 pt-3">
        <SidebarCreateButton collapsed={collapsed} />
      </div>

      <div className="ap-sidebar-body-pad min-h-0 flex-1 overflow-y-auto overscroll-contain py-3">
        {AP_SIDEBAR_NAV_GROUPS.map((group) => {
          const filtered = filterItems(group.items, allowedNavHrefs, planFlags);
          if (filtered.length === 0) return null;
          return (
            <div key={group.id} className="ap-sidebar-nav-group pb-3">
              <p className={cn(apSidebarSectionClass(), "ap-sidebar-reveal")} aria-hidden={collapsed}>
                {group.label}
              </p>
              <div className="mt-1 space-y-0.5">
                {filtered.map((item) => (
                  <SidebarLink
                    key={`${group.id}-${item.href}-${item.title}`}
                    item={item}
                    pathname={pathname}
                    unreadSmsCount={unreadSmsCount}
                    collapsed={collapsed}
                    sectionLabel={group.label}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ap-sidebar-footer ap-sidebar-body-pad shrink-0 py-3">
        <SidebarShopFooter
          shops={shops}
          activeShopId={activeShopId}
          collapsed={collapsed}
          pinned={pinned}
          onTogglePin={togglePin}
        />
      </div>
    </aside>
  );
}
