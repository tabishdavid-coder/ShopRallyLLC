"use client";

import { Suspense } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";
import { PlatformTopBar } from "@/components/platform/platform-top-bar";
import { PlatformReviewTourChrome } from "@/components/platform/platform-review-tour-chrome";
import { KeyedChildren } from "@/lib/keyed-children";
import type { Shop } from "@/lib/shop";

/** Master CRM shell — platform owner manages ShopRally (not shop operations). */
export function PlatformShell({
  shops,
  activeShopId,
  children,
}: {
  shops: Shop[];
  activeShopId: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen>
        <PlatformSidebar shops={shops} activeShopId={activeShopId} />
        <SidebarInset className="min-h-svh bg-muted/20">
          <Suspense fallback={null}>
            <PlatformReviewTourChrome>
              <PlatformTopBar shops={shops} activeShopId={activeShopId} />
              <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
                <KeyedChildren>{children}</KeyedChildren>
              </div>
            </PlatformReviewTourChrome>
          </Suspense>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
