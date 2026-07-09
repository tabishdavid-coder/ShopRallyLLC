"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type KeyboardEvent } from "react";
import {
  Building2,
  ChevronDown,
  LifeBuoy,
  Plus,
  Search,
} from "lucide-react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import { ClerkOrgSwitcher } from "@/components/crm/clerk-org-switcher";
import { CrmUserMenu } from "@/components/crm/crm-user-menu";
import { ShopSwitcherCompact } from "@/components/rp2/shop-switcher-compact";
import { useRoIntakeOptional } from "@/components/repair-order/ro-intake-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  CRM_HOME_HREF,
  CRM_HEADER_SECTIONS,
  crmPageTitle,
  crmSectionForPath,
  crmSectionIsActive,
} from "@/lib/crm-nav";
import { crmHeaderSectionTabClass } from "@/lib/crm-nav-active";
import { fallbackGlobalSearchHref } from "@/lib/global-search";
import type { Shop } from "@/lib/shop";
import { resolveGlobalSearchTarget } from "@/server/actions/global-search";
import type { AppNotification } from "@/server/notifications";
import { cn } from "@/lib/utils";

export function CrmHeader({
  shops,
  activeShopId,
  notifications,
  unreadCount = 0,
  unreadSmsCount = 0,
  isPlatformAdmin = false,
  showClerkOrgSwitcher = false,
  userDisplayName = "Staff",
  userInitials = "ST",
  allowedNavHrefs,
  allowedSectionIds,
}: {
  shops: Shop[];
  activeShopId: string;
  notifications: AppNotification[];
  unreadCount?: number;
  unreadSmsCount?: number;
  isPlatformAdmin?: boolean;
  showClerkOrgSwitcher?: boolean;
  userDisplayName?: string;
  userInitials?: string;
  allowedNavHrefs?: string[];
  allowedSectionIds?: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchPending, startSearch] = useTransition();
  const pageTitle = crmPageTitle(pathname);
  const activeSection = crmSectionForPath(pathname);
  const { openIntake, config: intakeConfig } = useRoIntakeOptional();

  const allowedHrefSet = allowedNavHrefs ? new Set(allowedNavHrefs) : null;
  const allowedSectionSet = allowedSectionIds ? new Set(allowedSectionIds) : null;

  function sectionVisible(sectionId: string): boolean {
    if (!allowedSectionSet) return true;
    return allowedSectionSet.has(sectionId);
  }

  function itemHrefAllowed(href: string): boolean {
    if (!allowedHrefSet) return true;
    return allowedHrefSet.has(href);
  }

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
    <header className="crm-header-chrome sticky top-0 z-30 shrink-0 border-b">
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        <ShopRallyLogo
          href={CRM_HOME_HREF}
          size="sm"
          variant="onDark"
          className="mr-1 shrink-0"
        />

        <nav className="hidden items-center gap-1 lg:flex">
          {CRM_HEADER_SECTIONS.filter((section) => sectionVisible(section.id)).map((section) => {
            const Icon = section.icon;
            const active = crmSectionIsActive(pathname, section);
            const href =
              section.href ??
              section.items.find((i) => itemHrefAllowed(i.href))?.href ??
              section.items.find((i) => i.href === CRM_HOME_HREF)?.href ??
              section.items[0]?.href ??
              CRM_HOME_HREF;

            if (!sectionVisible(section.id)) return null;

            return (
              <Button
                key={section.id}
                asChild
                variant="ghost"
                size="sm"
                className={cn(crmHeaderSectionTabClass(active), "h-8 min-h-8 shadow-none")}
                aria-current={active ? "page" : undefined}
              >
                <Link href={href} className="inline-flex items-center gap-1.5 text-inherit">
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span>{section.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 border-white/30 bg-white/12 text-white hover:bg-white/18 hover:text-white lg:hidden"
            >
              {activeSection.label}
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {CRM_HEADER_SECTIONS.filter((section) => sectionVisible(section.id)).map((section) => {
              const active = crmSectionIsActive(pathname, section);
              const href =
                section.href ??
                section.items.find((i) => itemHrefAllowed(i.href))?.href ??
                section.items[0]?.href ??
                CRM_HOME_HREF;
              if (!sectionVisible(section.id)) return null;
              return (
                <DropdownMenuItem key={section.id} asChild className={active ? "bg-brand-light/30 font-semibold text-brand-navy" : undefined}>
                  <Link href={href}>{section.label}</Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {isPlatformAdmin ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden gap-1 text-white hover:bg-white/10 hover:text-white md:inline-flex"
            >
              <Link href="/platform">
                <Building2 className="size-4" />
                Master CRM
              </Link>
            </Button>
          ) : null}
          <div className="max-w-[11rem] shrink-0 sm:max-w-none">
            {showClerkOrgSwitcher ? (
              <ClerkOrgSwitcher className="flex" />
            ) : (
              <ShopSwitcherCompact
                shops={shops}
                activeShopId={activeShopId}
                triggerClassName="border-white/30 bg-white/12 text-white hover:bg-white/18 hover:text-white"
              />
            )}
          </div>
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            triggerClassName="text-white hover:bg-white/10 hover:text-white"
          />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden text-white hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <Link href="/support">
              <LifeBuoy className="size-4" />
            </Link>
          </Button>
          {intakeConfig ? (
            <Button
              type="button"
              size="sm"
              className="gap-1 bg-brand-light text-brand-navy hover:bg-brand-light/90"
              onClick={() => openIntake()}
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New RO</span>
            </Button>
          ) : (
            <Button asChild size="sm" className="gap-1 bg-brand-light text-brand-navy hover:bg-brand-light/90">
              <Link href="/repair-orders/new">
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">New RO</span>
              </Link>
            </Button>
          )}
          <CrmUserMenu displayName={userDisplayName} initials={userInitials} />
        </div>
      </div>

      <div className="crm-header-sub flex items-center gap-3 border-t px-3 py-2 md:px-4">
        <h1 className="shrink-0 text-sm font-semibold text-white/95">{pageTitle}</h1>
        <div className="relative min-w-0 max-w-md flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-white/50" />
          <Input
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={submitSearch}
            placeholder="Search name, RO#, plate, or VIN…"
            className="h-9 border-white/25 bg-white/12 pl-8 text-sm text-white placeholder:text-white/50 focus-visible:ring-brand-light"
            aria-label="Global search"
            disabled={searchPending}
          />
        </div>
      </div>
    </header>
  );
}
