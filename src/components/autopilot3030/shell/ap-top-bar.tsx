"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition, type KeyboardEvent } from "react";
import { Building2, LifeBuoy, Plus, Search } from "lucide-react";

import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CrmUserMenu } from "@/components/crm/crm-user-menu";
import { ShopSwitcherCompact } from "@/components/rp2/shop-switcher-compact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AP_BRAND } from "@/lib/autopilot3030/brand";
import { AP_HOME_HREF } from "@/lib/autopilot3030/nav";
import { ApTopSectionNav } from "@/components/autopilot3030/shell/ap-top-section-nav";
import { isIsolated3030Preview } from "@/lib/autopilot3030/shell-variant";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { fallbackGlobalSearchHref } from "@/lib/global-search";
import type { Shop } from "@/lib/shop";
import { resolveGlobalSearchTarget } from "@/server/actions/global-search";
import type { AppNotification } from "@/server/notifications";

export function ApTopBar({
  shops,
  activeShopId,
  notifications,
  unreadCount = 0,
  isPlatformAdmin = false,
  allowedSectionIds,
  showSectionNav = false,
  userDisplayName = "Staff",
  userInitials = "ST",
}: {
  shops: Shop[];
  activeShopId: string;
  notifications: AppNotification[];
  unreadCount?: number;
  isPlatformAdmin?: boolean;
  allowedSectionIds?: string[];
  showSectionNav?: boolean;
  userDisplayName?: string;
  userInitials?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchPending, startSearch] = useTransition();
  const showPreviewBanner = isIsolated3030Preview();

  function submitSearch(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = globalQuery.trim();
    if (!q) return;
    startSearch(async () => {
      try {
        const { href } = await resolveGlobalSearchTarget(q);
        router.push(href);
      } catch {
        router.push(fallbackGlobalSearchHref(q));
      }
    });
  }

  return (
    <header className="ap-top-bar sticky top-0 z-30 shrink-0">
      {showPreviewBanner ? (
        <div className="ap-preview-banner flex items-center justify-center gap-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest md:text-[11px]">
          {AP_BRAND.previewLabel} — isolated preview · not deployed
        </div>
      ) : null}
      <div className="ap-top-bar-inner flex w-full items-center gap-2 px-3 md:gap-3 md:px-4">
        <ShopRallyLogo href={AP_HOME_HREF} size="sm" className="mr-2 shrink-0" />

        <div className="relative min-w-0 flex-1 md:max-w-md lg:max-w-lg xl:max-w-xl">
          <Search className="ap-text-subtle pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={submitSearch}
            placeholder="Search customers, ROs, plates…"
            className="ap-search-input h-9 pl-9 text-sm shadow-none"
            disabled={searchPending}
            aria-label="Global search"
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {isPlatformAdmin ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="ap-topbar-link-idle hidden gap-1 md:inline-flex"
            >
              <Link href="/platform">
                <Building2 className="size-4" />
                Master CRM
              </Link>
            </Button>
          ) : null}
          {pathname !== "/repair-orders/new" ? (
            <Button
              asChild
              size="sm"
              className="ap-accent-btn inline-flex gap-1.5 shadow-sm"
            >
              <Link href="/repair-orders/new">
                <Plus className="size-4" />
                <span className="hidden sm:inline">{AP_TERMS.newRepairOrder}</span>
                <span className="sm:hidden">{AP_TERMS.newRepairOrderShort}</span>
              </Link>
            </Button>
          ) : null}
          <ShopSwitcherCompact shops={shops} activeShopId={activeShopId} />
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="ap-topbar-link-idle hidden sm:inline-flex"
          >
            <Link href="/support">
              <LifeBuoy className="size-4" />
            </Link>
          </Button>
          <CrmUserMenu displayName={userDisplayName} initials={userInitials} />
        </div>
      </div>
      {showSectionNav ? <ApTopSectionNav allowedSectionIds={allowedSectionIds} /> : null}
    </header>
  );
}
