"use client";

import Link from "next/link";
import { MessageSquare, Search, LifeBuoy } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { navTitle, platformNavTitle } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/server/notifications";

function usePageTitle() {
  const pathname = usePathname();
  const platformTitle = platformNavTitle(pathname);
  if (platformTitle) return platformTitle;
  return navTitle(pathname) ?? "ShopRally";
}

export function TopBar({
  notifications,
  unreadCount = 0,
  unreadSmsCount = 0,
}: {
  notifications: AppNotification[];
  unreadCount?: number;
  unreadSmsCount?: number;
}) {
  const title = usePageTitle();
  const pathname = usePathname();
  const router = useRouter();
  const [globalQuery, setGlobalQuery] = useState("");
  const onMessages = pathname.startsWith("/messages");
  const onSupport = pathname.startsWith("/support");

  function submitSearch(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = globalQuery.trim();
    if (!q) return;
    if (pathname === "/job-board") {
      router.push(`/job-board?q=${encodeURIComponent(q)}`);
      return;
    }
    router.push(`/customers?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-sm font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Button
          asChild
          variant={onSupport ? "secondary" : "ghost"}
          size="sm"
          className={cn("gap-1.5", onSupport && "font-medium")}
        >
          <Link href="/support">
            <LifeBuoy className="size-4" />
            <span className="hidden sm:inline">Support</span>
          </Link>
        </Button>
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        <Button
          asChild
          variant={onMessages ? "secondary" : "ghost"}
          size="sm"
          className={cn("relative gap-1.5", onMessages && "font-medium")}
        >
          <Link href="/messages">
            <MessageSquare className="size-4" />
            <span className="hidden sm:inline">Message</span>
            {unreadSmsCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand-red text-[10px] font-bold text-white">
                {unreadSmsCount > 9 ? "9+" : unreadSmsCount}
              </span>
            ) : null}
          </Link>
        </Button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={submitSearch}
            placeholder="Search customers, vehicles, ROs…"
            className="w-64 pl-8"
            aria-label="Global search"
          />
        </div>
      </div>
    </header>
  );
}
