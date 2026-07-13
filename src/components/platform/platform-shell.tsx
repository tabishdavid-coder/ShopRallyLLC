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
      <SidebarProvider defaultOpen className="h-svh min-h-0 overflow-hidden">
        <PlatformSidebar shops={shops} activeShopId={activeShopId} />
        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20">
          <Suspense fallback={null}>
            <PlatformReviewTourChrome>
              <PlatformTopBar shops={shops} activeShopId={activeShopId} />
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
                  <KeyedChildren>{children}</KeyedChildren>
                </div>
              </div>
            </PlatformReviewTourChrome>
          </Suspense>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
