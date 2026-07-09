"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PreviewCommandHeader } from "@/components/ui-preview/preview-command-header";
import { PreviewSidebar } from "@/components/ui-preview/preview-sidebar";
import { PreviewTopBar } from "@/components/ui-preview/preview-top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DEFAULT_SHELL_LAYOUT,
  PREVIEW_SHELL_LAYOUT_KEY,
  type PreviewShellLayoutId,
} from "@/lib/preview-top-nav-config";
import type { Shop } from "@/lib/shop";
import type { AppNotification } from "@/server/notifications";

function useShellLayout(): PreviewShellLayoutId {
  const searchParams = useSearchParams();
  const param = searchParams.get("shell") as PreviewShellLayoutId | null;
  const [stored, setStored] = useState<PreviewShellLayoutId | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(PREVIEW_SHELL_LAYOUT_KEY) as PreviewShellLayoutId | null;
      if (v === "top-nav" || v === "left-sidebar") setStored(v);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (param === "top-nav" || param === "left-sidebar") {
      try {
        localStorage.setItem(PREVIEW_SHELL_LAYOUT_KEY, param);
      } catch {
        /* ignore */
      }
      setStored(param);
    }
  }, [param]);

  if (param === "top-nav" || param === "left-sidebar") return param;
  if (stored) return stored;
  return DEFAULT_SHELL_LAYOUT;
}

function PreviewAppShellInner({
  shops,
  activeShopId,
  notifications,
  unreadCount,
  unreadSmsCount,
  children,
}: {
  shops: Shop[];
  activeShopId: string;
  notifications: AppNotification[];
  unreadCount: number;
  unreadSmsCount: number;
  children: React.ReactNode;
}) {
  const layout = useShellLayout();

  const footer = (
    <footer className="border-t border-brand-light/30 bg-card/50 px-4 py-2 text-center text-[11px] text-muted-foreground">
      ShopRally preview ·{" "}
      {layout === "top-nav" ? "top command bar" : "left sidebar"} ·{" "}
      <span className="font-mono text-brand-navy">/preview</span>
      {" · "}
      <Link href="/preview/nav-concepts" className="text-brand-navy hover:underline">
        switch layout
      </Link>
    </footer>
  );

  if (layout === "left-sidebar") {
    return (
      <SidebarProvider defaultOpen>
        <Suspense fallback={null}>
          <PreviewSidebar
            shops={shops}
            activeShopId={activeShopId}
            unreadSmsCount={unreadSmsCount}
          />
        </Suspense>
        <SidebarInset className="bg-[oklch(0.985_0.008_247)]">
          <PreviewTopBar
            notifications={notifications}
            unreadCount={unreadCount}
            unreadSmsCount={unreadSmsCount}
          />
          <main className="flex min-h-0 flex-1 flex-col p-4 md:p-6">{children}</main>
          {footer}
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-[oklch(0.985_0.008_247)]">
      <PreviewCommandHeader
        shops={shops}
        activeShopId={activeShopId}
        notifications={notifications}
        unreadCount={unreadCount}
        unreadSmsCount={unreadSmsCount}
      />
      <main className="flex min-h-0 flex-1 flex-col p-4 md:p-6">{children}</main>
      {footer}
    </div>
  );
}

type PreviewAppShellProps = {
  shops: Shop[];
  activeShopId: string;
  notifications?: AppNotification[];
  unreadCount?: number;
  unreadSmsCount?: number;
  children: React.ReactNode;
};

/** Preview shell — default top command bar; optional left sidebar via nav-concepts. */
export function PreviewAppShell(props: PreviewAppShellProps) {
  const {
    shops,
    activeShopId,
    notifications = [],
    unreadCount = 0,
    unreadSmsCount = 0,
    children,
  } = props;

  return (
    <div className="preview-shell min-h-svh">
      <TooltipProvider delayDuration={0}>
        <Suspense fallback={null}>
          <PreviewAppShellInner
            shops={shops}
            activeShopId={activeShopId}
            notifications={notifications}
            unreadCount={unreadCount}
            unreadSmsCount={unreadSmsCount}
          >
            {children}
          </PreviewAppShellInner>
        </Suspense>
      </TooltipProvider>
    </div>
  );
}
