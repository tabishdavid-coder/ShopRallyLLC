"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type KeyboardEvent } from "react";
import { Building2, CircleHelp, Search, Warehouse } from "lucide-react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { CrmUserMenu } from "@/components/crm/crm-user-menu";
import { ShopSwitcherCompact } from "@/components/rp2/shop-switcher-compact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AP_BRAND } from "@/lib/autopilot3030/brand";
import { isIsolated3030Preview } from "@/lib/autopilot3030/shell-variant";
import { fallbackGlobalSearchHref } from "@/lib/global-search";
import type { Shop } from "@/lib/shop";
import { resolveGlobalSearchTarget } from "@/server/actions/global-search";
import type { AppNotification } from "@/server/notifications";
import { cn } from "@/lib/utils";

export function ApTopBar({
  shops,
  activeShopId,
  notifications,
  unreadCount = 0,
  isPlatformAdmin = false,
  userDisplayName = "Staff",
  userInitials = "ST",
}: {
  shops: Shop[];
  activeShopId: string;
  notifications: AppNotification[];
  unreadCount?: number;
  isPlatformAdmin?: boolean;
  allowedSectionIds?: string[];
  /** @deprecated Top section nav removed — Menu lives in the sidebar. */
  showSectionNav?: boolean;
  userDisplayName?: string;
  userInitials?: string;
}) {
  const router = useRouter();
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
      <div className="ap-top-bar-inner flex w-full items-center gap-2 px-3 md:gap-3 md:px-5">
        <div className="relative min-w-0 flex-1 md:max-w-xl lg:max-w-2xl xl:max-w-3xl">
          <Search className="ap-text-subtle pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={submitSearch}
            placeholder="Search customers, repair orders, VIN, plates..."
            className="ap-search-input h-10 rounded-lg border-border/80 bg-muted/30 pl-10 pr-14 text-sm shadow-none"
            disabled={searchPending}
            aria-label="Global search"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center rounded border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
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
          <ShopSwitcherCompact
            shops={shops}
            activeShopId={activeShopId}
            triggerClassName={cn(
              "hidden h-9 max-w-[240px] gap-1.5 border-border/80 bg-background sm:inline-flex",
            )}
            leadingIcon={<Warehouse className="size-3.5 shrink-0 text-muted-foreground" />}
          />
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            triggerClassName="size-9 px-0 text-foreground/80 hover:bg-muted"
            iconOnly
          />
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="ap-topbar-link-idle hidden size-9 sm:inline-flex"
            aria-label="Help"
          >
            <Link href="/support">
              <CircleHelp className="size-4" />
            </Link>
          </Button>
          <CrmUserMenu
            displayName={userDisplayName}
            initials={userInitials}
            showChevron
          />
        </div>
      </div>
    </header>
  );
}
