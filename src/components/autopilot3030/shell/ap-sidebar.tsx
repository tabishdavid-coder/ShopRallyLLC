"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import { Badge } from "@/components/ui/badge";
import {
  AP_HOME_HREF,
  AP_OPERATIONS_NAV_ITEMS,
  apNavItemIsActive,
  type ApNavLink,
} from "@/lib/autopilot3030/nav";
import { apSidebarLinkClass, apSidebarSectionClass } from "@/lib/autopilot3030/nav-active";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { cn } from "@/lib/utils";

function filterItems(items: ApNavLink[], allowedNavHrefs?: string[]): ApNavLink[] {
  if (!allowedNavHrefs) return items;
  const allowed = new Set(allowedNavHrefs);
  return items.filter((item) => allowed.has(item.href) || item.stub);
}

function SidebarLink({
  item,
  pathname,
  sectionItems,
  activeOverride,
  unreadSmsCount = 0,
}: {
  item: ApNavLink;
  pathname: string;
  sectionItems: ApNavLink[];
  activeOverride?: boolean;
  unreadSmsCount?: number;
}) {
  const active = activeOverride ?? apNavItemIsActive(pathname, item, sectionItems);
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <span
        className={cn(apSidebarLinkClass(false), "cursor-not-allowed opacity-45")}
        title="Coming soon"
      >
        <Icon className="size-4 shrink-0 opacity-70" aria-hidden />
        <span className="truncate">{item.title}</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={apSidebarLinkClass(active)}
    >
      <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
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
    </Link>
  );
}

function SidebarGroup({
  label,
  items,
  pathname,
  unreadSmsCount,
  allowedNavHrefs,
  activeFn,
}: {
  label: string;
  items: ApNavLink[];
  pathname: string;
  unreadSmsCount?: number;
  allowedNavHrefs?: string[];
  activeFn?: (pathname: string, href: string) => boolean;
}) {
  const filtered = filterItems(items, allowedNavHrefs);
  if (filtered.length === 0) return null;

  return (
    <div className="pb-3">
      <p className={apSidebarSectionClass()}>{label}</p>
      <div className="mt-1 space-y-0.5">
        {filtered.map((item) => (
          <SidebarLink
            key={`${label}-${item.href}-${item.title}`}
            item={item}
            pathname={pathname}
            sectionItems={filtered}
            unreadSmsCount={unreadSmsCount}
            activeOverride={activeFn ? activeFn(pathname, item.href) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/** Left sidebar — Operations only; section subnavs live on landing pages. */
export function ApSidebar({
  unreadSmsCount = 0,
  allowedNavHrefs,
}: {
  unreadSmsCount?: number;
  allowedNavHrefs?: string[];
}) {
  const pathname = usePathname();

  return (
    <aside className="ap-sidebar" aria-label="Main navigation">
      <div className="ap-sidebar-header shrink-0 px-4 py-3">
        <ShopRallyLogo
          href={AP_HOME_HREF}
          size="sm"
          variant="onDark"
          className="max-w-full"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3">
        <SidebarGroup
          label="Operations"
          items={AP_OPERATIONS_NAV_ITEMS}
          pathname={pathname}
          unreadSmsCount={unreadSmsCount}
          allowedNavHrefs={allowedNavHrefs}
        />
      </div>

      {pathname !== "/repair-orders/new" ? (
        <div className="ap-sidebar-footer shrink-0 px-2.5 py-3">
          <Link
            href="/repair-orders/new"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-orange/90 active:bg-brand-orange/85"
          >
            <Plus className="size-4 shrink-0" aria-hidden />
            <span>{AP_TERMS.newRepairOrder}</span>
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
