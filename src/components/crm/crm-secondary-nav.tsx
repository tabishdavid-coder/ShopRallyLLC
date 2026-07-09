"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  CRM_DASHBOARD_SECTION,
  CRM_GROWTH_NAV_ITEMS,
  crmSectionForPath,
  isDashboardSidebarPath,
  type CrmNavLink,
} from "@/lib/crm-nav";
import {
  crmMobilePillClass,
  crmNavItemIsActive,
  crmSidebarNavClass,
} from "@/lib/crm-nav-active";
import { subnavBarClass, subnavTabClass } from "@/lib/subnav-styles";
import { cn } from "@/lib/utils";

function filterNavItems(items: CrmNavLink[], allowedNavHrefs?: string[]): CrmNavLink[] {
  if (!allowedNavHrefs) return items;
  const allowed = new Set(allowedNavHrefs);
  return items.filter((item) => allowed.has(item.href) || item.stub);
}

/** Left sidebar — dashboard shop tools only (top header covers other sections). */
export function CrmSecondaryNav({
  unreadSmsCount = 0,
  allowedNavHrefs,
  plannedChangeId,
}: {
  unreadSmsCount?: number;
  allowedNavHrefs?: string[];
  plannedChangeId?: string;
}) {
  const pathname = usePathname();
  const dashboardItems = filterNavItems(CRM_DASHBOARD_SECTION.items, allowedNavHrefs);

  return (
    <aside
      className="crm-sidebar-chrome crm-sidebar-panel hidden shrink-0 flex-col border-r md:flex"
      data-planned-change={plannedChangeId}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 overflow-y-auto overscroll-contain">
          <div className="shrink-0 border-b border-sidebar-border px-3 py-2.5">
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-brand-light">
              {CRM_DASHBOARD_SECTION.label}
            </p>
          </div>
          <nav
            className="crm-sidebar-nav-compact crm-sidebar-work-nav space-y-1 p-2.5 pb-3"
            aria-label="Dashboard navigation"
          >
            {dashboardItems.map((item) => (
              <SidebarNavItem
                key={`${item.href}-${item.title}`}
                item={item}
                pathname={pathname}
                sectionItems={dashboardItems}
                unreadSmsCount={unreadSmsCount}
              />
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}

function SidebarNavItem({
  item,
  pathname,
  sectionItems,
  unreadSmsCount,
}: {
  item: CrmNavLink;
  pathname: string;
  sectionItems: CrmNavLink[];
  unreadSmsCount: number;
}) {
  const active = crmNavItemIsActive(pathname, item, sectionItems);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(crmSidebarNavClass(active), "crm-sidebar-nav-item group")}
    >
      <Icon className="crm-sidebar-work-icon" aria-hidden />
      <span className="crm-sidebar-work-label min-w-0 flex-1 truncate">
        <span className="flex items-center gap-1.5">
          {item.title}
          {item.stub ? (
            <Badge variant="outline" className="h-4 border-white/25 bg-white/10 px-1.5 text-[9px] text-white/85">
              Soon
            </Badge>
          ) : null}
          {item.href === "/messages" && unreadSmsCount > 0 ? (
            <Badge className="h-4 bg-brand-red px-1.5 text-[9px] text-white">
              {unreadSmsCount > 9 ? "9+" : unreadSmsCount}
            </Badge>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

/** Horizontal sub-nav for Growth Engine and multi-item top sections. */
export function CrmSectionSubnav({
  allowedNavHrefs,
  allowedSectionIds,
}: {
  allowedNavHrefs?: string[];
  allowedSectionIds?: string[];
}) {
  const pathname = usePathname();
  const growthOk = !allowedSectionIds || allowedSectionIds.includes("growth");

  if (pathname === "/marketing" || pathname.startsWith("/marketing/")) {
    if (!growthOk) return null;
    const growthItems = CRM_GROWTH_NAV_ITEMS;
    return (
      <nav
        className={cn(
          subnavBarClass(),
          "scrollbar-none shrink-0 overflow-x-auto border-b border-border bg-card/80",
        )}
        aria-label="Growth Engine navigation"
      >
        {growthItems.map((item) => {
          const active = crmNavItemIsActive(pathname, item, growthItems);
          const Icon = item.icon;
          return (
            <Link
              key={item.href + item.title}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(subnavTabClass(active), "inline-flex items-center gap-1.5")}
            >
              <Icon className={cn("size-3.5 shrink-0", active ? "text-brand-navy" : "text-muted-foreground")} />
              {item.title}
            </Link>
          );
        })}
      </nav>
    );
  }

  const section = crmSectionForPath(pathname);
  const sectionItems = filterNavItems(section.items, allowedNavHrefs);

  if (
    section.id === "dashboard" ||
    section.id === "tech-board" ||
    section.id === "workflow" ||
    section.id === "reports" ||
    section.id === "growth" ||
    section.items.length <= 1 ||
    sectionItems.length <= 1
  ) {
    return null;
  }

  return (
    <nav
      className={cn(
        subnavBarClass(),
        "scrollbar-none shrink-0 overflow-x-auto border-b border-border bg-card/80",
      )}
      aria-label={`${section.label} navigation`}
    >
      {sectionItems.map((item) => {
        const active = crmNavItemIsActive(pathname, item, sectionItems);
        const Icon = item.icon;
        return (
          <Link
            key={item.href + item.title}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(subnavTabClass(active), "inline-flex items-center gap-1.5")}
          >
            <Icon className={cn("size-3.5 shrink-0", active ? "text-brand-navy" : "text-muted-foreground")} />
            {item.title}
            {item.stub ? (
              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                Soon
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile Dashboard pills — when browsing Dashboard routes (sidebar hidden on mobile). */
export function CrmMobileSectionNav({
  unreadSmsCount = 0,
  allowedNavHrefs,
}: {
  unreadSmsCount?: number;
  allowedNavHrefs?: string[];
}) {
  const pathname = usePathname();

  if (!isDashboardSidebarPath(pathname)) return null;

  const items = filterNavItems(CRM_DASHBOARD_SECTION.items, allowedNavHrefs);

  return (
    <div className="crm-mobile-nav-chrome flex gap-1 overflow-x-auto border-b px-3 py-2 md:hidden">
      {items.map((item) => {
        const active = crmNavItemIsActive(pathname, item, items);
        return (
          <Link
            key={item.href + item.title}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={crmMobilePillClass(active)}
          >
            {item.title}
            {item.href === "/messages" && unreadSmsCount > 0 ? ` (${unreadSmsCount})` : ""}
          </Link>
        );
      })}
    </div>
  );
}
