"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IdCard, LifeBuoy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  AP_OPERATIONS_NAV_ITEMS,
  apSettingsGroupsForBuild,
  apNavItemIsActive,
  apSectionForPath,
  apSettingsNavActive,
  apShowOperationsPanel,
  type ApNavLink,
} from "@/lib/autopilot3030/nav";
import { apContextNavClass } from "@/lib/autopilot3030/nav-active";
import { isPlanHiddenNavHref } from "@/lib/crm-access";
import { useShopCapabilities } from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";

function filterItems(
  items: ApNavLink[],
  allowedNavHrefs: string[] | undefined,
  planFlags: { growth: boolean; maintenancePrograms: boolean; sms: boolean },
): ApNavLink[] {
  return items.filter((item) => {
    if (isPlanHiddenNavHref(item.href, planFlags)) return false;
    if (!allowedNavHrefs) return true;
    const allowed = new Set(allowedNavHrefs);
    return allowed.has(item.href) || item.stub;
  });
}

function ContextNavLink({
  item,
  pathname,
  sectionItems,
  unreadSmsCount,
}: {
  item: ApNavLink;
  pathname: string;
  sectionItems: ApNavLink[];
  unreadSmsCount: number;
}) {
  const active = apNavItemIsActive(pathname, item, sectionItems);
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <span className={cn(apContextNavClass(false), "cursor-not-allowed opacity-50")} title="Coming soon">
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{item.title}</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={apContextNavClass(active)}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {item.stub ? (
        <Badge variant="outline" className="h-4 px-1 text-[9px]">
          Soon
        </Badge>
      ) : null}
      {item.href === "/messages" && unreadSmsCount > 0 ? (
        <Badge className="h-4 bg-destructive px-1.5 text-[9px] text-white">
          {unreadSmsCount > 9 ? "9+" : unreadSmsCount}
        </Badge>
      ) : null}
    </Link>
  );
}

export function ApContextPanel({
  unreadSmsCount = 0,
  allowedNavHrefs,
}: {
  unreadSmsCount?: number;
  allowedNavHrefs?: string[];
}) {
  const pathname = usePathname();
  const caps = useShopCapabilities();
  const planFlags = {
    growth: caps.growth,
    maintenancePrograms: caps.maintenancePrograms,
    sms: caps.sms,
  };
  const section = apSectionForPath(pathname);
  const showOps = apShowOperationsPanel(pathname);
  const isSettings =
    pathname.startsWith("/settings") ||
    pathname === "/employees" ||
    pathname.startsWith("/support");

  const sectionItems = filterItems(section.items, allowedNavHrefs, planFlags);

  return (
    <aside className="ap-context-panel hidden shrink-0 flex-col md:flex">
      <div className="ap-context-panel-header shrink-0 px-3 pb-2.5 pt-3">
        <p className="ap-context-section-label">
          {isSettings ? "Configuration" : section.label}
        </p>
        {section.description && !isSettings ? (
          <p className="mt-1 text-[11px] leading-snug ap-text-muted">
            {section.description}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {isSettings ? (
          <nav className="space-y-4" aria-label="Shop configuration">
            {apSettingsGroupsForBuild().map((group) => {
              const items = filterItems(group.items, allowedNavHrefs, planFlags);
              if (items.length === 0) return null;
              return (
                <div key={group.id}>
                  <p className="ap-settings-group-label mb-1.5 px-2">{group.label}</p>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active = apSettingsNavActive(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={apContextNavClass(active)}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div>
              <p className="ap-settings-group-label mb-1.5 px-2">People & help</p>
              <Link
                href="/employees"
                className={apContextNavClass(pathname.startsWith("/employees"))}
              >
                <IdCard className="size-4 shrink-0" aria-hidden />
                Team
              </Link>
              <Link
                href="/support"
                className={apContextNavClass(pathname.startsWith("/support"))}
              >
                <LifeBuoy className="size-4 shrink-0" aria-hidden />
                Help & Support
              </Link>
            </div>
          </nav>
        ) : showOps ? (
          <nav className="space-y-0.5" aria-label="Operations">
            {filterItems(AP_OPERATIONS_NAV_ITEMS, allowedNavHrefs, planFlags).map((item) => (
              <ContextNavLink
                key={item.href}
                item={item}
                pathname={pathname}
                sectionItems={AP_OPERATIONS_NAV_ITEMS}
                unreadSmsCount={unreadSmsCount}
              />
            ))}
          </nav>
        ) : (
          <nav className="space-y-0.5" aria-label={section.label}>
            {sectionItems.map((item) => (
              <ContextNavLink
                key={`${item.href}-${item.title}`}
                item={item}
                pathname={pathname}
                sectionItems={sectionItems}
                unreadSmsCount={unreadSmsCount}
              />
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
}
