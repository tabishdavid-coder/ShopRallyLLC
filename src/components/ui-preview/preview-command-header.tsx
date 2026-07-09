"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import {
  ChevronDown,
  LifeBuoy,
  Plus,
  Search,
} from "lucide-react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { ShopSwitcherCompact } from "@/components/rp2/shop-switcher-compact";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Input } from "@/components/ui/input";
import {
  PREVIEW_TOP_NAV,
  PREVIEW_WORK_TABS,
  type TopNavEntry,
} from "@/lib/preview-top-nav-config";
import { previewNavHref, previewNavIsActive, previewNavTitle } from "@/lib/preview-nav";
import type { NavItem } from "@/lib/nav";
import type { Shop } from "@/lib/shop";
import type { AppNotification } from "@/server/notifications";
import { cn } from "@/lib/utils";

function navEntryActive(pathname: string, entry: TopNavEntry): boolean {
  if (entry.kind === "link") {
    if (entry.match?.some((m) => pathname === m || pathname.startsWith(`${m}/`))) {
      return true;
    }
    return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
  }
  return entry.items.some((item) => previewNavIsActive(pathname, item));
}

function TopNavMenuButton({
  entry,
  pathname,
  unreadSmsCount,
}: {
  entry: Extract<TopNavEntry, { kind: "menu" }>;
  pathname: string;
  unreadSmsCount: number;
}) {
  const active = navEntryActive(pathname, entry);
  const Icon = entry.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1 text-brand-navy/80 hover:bg-brand-light/20 hover:text-brand-navy",
            active && "bg-brand-light/25 font-semibold text-brand-navy",
          )}
        >
          <Icon className="size-4" />
          <span>{entry.label}</span>
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {entry.description ? (
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {entry.description}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {entry.items.map((item) => (
          <TopNavDropdownItem
            key={`${item.href}-${item.title}`}
            item={item}
            pathname={pathname}
            unreadSmsCount={unreadSmsCount}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopNavDropdownItem({
  item,
  pathname,
  unreadSmsCount,
}: {
  item: NavItem;
  pathname: string;
  unreadSmsCount: number;
}) {
  const active = previewNavIsActive(pathname, item);
  const href = previewNavHref(item);
  const Icon = item.icon;

  return (
    <DropdownMenuItem asChild className={cn(active && "bg-brand-light/20 font-medium")}>
      <Link href={href} className="flex cursor-pointer items-center gap-2">
        <Icon className="size-4 text-brand-navy/70" />
        <span className="flex-1">{item.title}</span>
        {item.stub ? (
          <Badge variant="outline" className="h-4 px-1 text-[9px]">
            Soon
          </Badge>
        ) : null}
        {item.href === "/messages" && unreadSmsCount > 0 ? (
          <Badge className="h-4 bg-brand-red px-1 text-[9px] text-white">
            {unreadSmsCount > 9 ? "9+" : unreadSmsCount}
          </Badge>
        ) : null}
      </Link>
    </DropdownMenuItem>
  );
}

function WorkContextTabs({ pathname }: { pathname: string }) {
  const show = PREVIEW_WORK_TABS.some((tab) =>
    tab.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)),
  ) || pathname === "/preview";

  if (!show) return null;

  return (
    <div className="flex items-center gap-1 border-b border-brand-light/40 bg-card/80 px-4 py-1.5">
      {PREVIEW_WORK_TABS.map((tab) => {
        const active = tab.match.some(
          (m) => pathname === m || pathname.startsWith(`${m}/`),
        );
        return (
          <Link
            key={tab.href}
            href={tab.href === "/preview" ? "/preview" : tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-brand-navy font-medium text-white"
                : "text-brand-navy/70 hover:bg-brand-light/20 hover:text-brand-navy",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Full-width top navigation — primary modules horizontal, no left sidebar.
 * Pattern: HubSpot header + Stripe contextual tabs.
 */
export function PreviewCommandHeader({
  shops,
  activeShopId,
  notifications,
  unreadCount = 0,
  unreadSmsCount = 0,
}: {
  shops: Shop[];
  activeShopId: string;
  notifications: AppNotification[];
  unreadCount?: number;
  unreadSmsCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [globalQuery, setGlobalQuery] = useState("");
  const pageTitle = previewNavTitle(pathname);

  function submitSearch(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = globalQuery.trim();
    if (!q) return;
    router.push(`/customers?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-brand-light/40 bg-card shadow-sm">
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        <Link href="/preview" className="mr-1 flex shrink-0 items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand-navy text-sm font-black">
            <span className="text-white">R</span>
            <span className="text-brand-light">P</span>
          </div>
          <span className="hidden font-bold tracking-tight text-brand-navy sm:inline">
            Kar<span className="text-brand-light">vio</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {PREVIEW_TOP_NAV.map((entry) => {
            if (entry.kind === "menu") {
              return (
                <TopNavMenuButton
                  key={entry.label}
                  entry={entry}
                  pathname={pathname}
                  unreadSmsCount={unreadSmsCount}
                />
              );
            }
            const active = navEntryActive(pathname, entry);
            const Icon = entry.icon;
            return (
              <Button
                key={entry.label}
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "relative gap-1.5 text-brand-navy/80 hover:bg-brand-light/20",
                  active && "bg-brand-light/25 font-semibold text-brand-navy",
                )}
              >
                <Link href={entry.href}>
                  <Icon className="size-4" />
                  {entry.label}
                  {entry.href === "/messages" && unreadSmsCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-brand-red text-[9px] font-bold text-white">
                      {unreadSmsCount > 9 ? "9+" : unreadSmsCount}
                    </span>
                  ) : null}
                </Link>
              </Button>
            );
          })}
        </nav>

        {/* Mobile / tablet: condensed module picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 border-brand-light/50 text-brand-navy lg:hidden"
            >
              Menu
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[70vh] w-64 overflow-y-auto">
            {PREVIEW_TOP_NAV.map((entry) => {
              if (entry.kind === "link") {
                return (
                  <DropdownMenuItem key={entry.label} asChild>
                    <Link href={entry.href}>{entry.label}</Link>
                  </DropdownMenuItem>
                );
              }
              return (
                <div key={entry.label}>
                  <DropdownMenuLabel>{entry.label}</DropdownMenuLabel>
                  {entry.items.map((item) => (
                    <TopNavDropdownItem
                      key={item.title + item.href}
                      item={item}
                      pathname={pathname}
                      unreadSmsCount={unreadSmsCount}
                    />
                  ))}
                  <DropdownMenuSeparator />
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="hidden md:block">
            <ShopSwitcherCompact shops={shops} activeShopId={activeShopId} />
          </div>
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/support">
              <LifeBuoy className="size-4" />
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-1 bg-brand-navy hover:bg-brand-navy/90">
            <Link href="/repair-orders/new">
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New RO</span>
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full p-0">
                <Avatar className="size-8 border border-brand-light/50">
                  <AvatarFallback className="bg-brand-navy text-xs text-white">
                    DT
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>David Tabish · Owner</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Shop settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/preview/nav-concepts">Change menu layout</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-brand-light/25 bg-[oklch(0.985_0.008_247)] px-3 py-2 md:px-4">
        <h1 className="shrink-0 text-sm font-semibold text-brand-navy">{pageTitle}</h1>
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={submitSearch}
            placeholder="Search customers, vehicles, ROs…"
            className="h-9 border-brand-light/40 bg-card pl-8 text-sm"
            aria-label="Global search"
          />
        </div>
      </div>

      <WorkContextTabs pathname={pathname} />
    </header>
  );
}
