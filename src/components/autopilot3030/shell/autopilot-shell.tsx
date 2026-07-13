"use client";

import "@/app/globals.autopilot3030.css";

import { ApCommandRail } from "@/components/autopilot3030/shell/command-rail";
import { ApContextPanel } from "@/components/autopilot3030/shell/context-panel";
import { ApMobileNav } from "@/components/autopilot3030/shell/mobile-nav";
import { ApModuleSubnav } from "@/components/autopilot3030/shell/module-subnav";
import { ApSidebar } from "@/components/autopilot3030/shell/ap-sidebar";
import { ApTopBar } from "@/components/autopilot3030/shell/ap-top-bar";
import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";
import { RoIntakeProvider } from "@/components/repair-order/ro-intake-context";
import { SupportWidget } from "@/components/support/support-widget";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeyedChildren } from "@/lib/keyed-children";
import type { RoIntakeConfig } from "@/lib/ro-intake-types";
import type { Shop } from "@/lib/shop";
import {
  ShopCapabilitiesProvider,
  type ShopCapabilities,
} from "@/lib/shop-capabilities";
import type { AppNotification } from "@/server/notifications";
import { cn } from "@/lib/utils";

type AutopilotShellProps = {
  shops: Shop[];
  activeShopId: string;
  notifications: AppNotification[];
  unreadCount?: number;
  unreadSmsCount?: number;
  pathname: string;
  isPlatformAdmin?: boolean;
  userDisplayName?: string;
  userInitials?: string;
  banner?: React.ReactNode;
  bannerChrome?: "platform" | "default" | "alert";
  allowedNavHrefs?: string[];
  allowedSectionIds?: string[];
  intakeConfig?: RoIntakeConfig | null;
  capabilities?: ShopCapabilities;
  children: React.ReactNode;
};

/** Project 3030 — dark command rail + light context panel + content toolbar.
 *  IA: section labels and nav items live in the light context panel; top bar is search + shop actions only.
 *  Accent uses ShopRally azure (#00A9FF) for focus/active nav; orange (#F4581C) for CTAs. */
export function AutopilotShell({
  shops,
  activeShopId,
  notifications,
  unreadCount = 0,
  unreadSmsCount = 0,
  pathname,
  isPlatformAdmin = false,
  userDisplayName = "Staff",
  userInitials = "ST",
  banner,
  bannerChrome = "default",
  allowedNavHrefs,
  allowedSectionIds,
  intakeConfig = null,
  capabilities = {
    sms: false,
    stripePayments: false,
    motorLabor: false,
    partsTech: false,
    marketingCampaigns: false,
    vehicleSpecs: false,
    autodevDecoding: false,
  },
  children,
}: AutopilotShellProps) {
  const fullBleed = pathname === "/workflow";
  const jobBoardViewport = pathname === "/job-board" || pathname === "/tech-board";
  const fitViewport = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const persistentSidebar = isAutopilot3030Shell();
  const roDetailFocus = /^\/repair-orders\/(?!new(?:\/|$))[^/]+/.test(pathname);
  const ticketFocus = !persistentSidebar && roDetailFocus;

  return (
    <ShopCapabilitiesProvider value={capabilities}>
    <RoIntakeProvider config={intakeConfig}>
      <TooltipProvider delayDuration={0}>
        <div className="ap-shell flex h-svh flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {persistentSidebar ? (
              <ApSidebar
                shops={shops}
                activeShopId={activeShopId}
                unreadSmsCount={unreadSmsCount}
                allowedNavHrefs={allowedNavHrefs}
              />
            ) : !ticketFocus ? (
              <div className="ap-chrome-zone hidden shrink-0 md:flex">
                <ApCommandRail allowedSectionIds={allowedSectionIds} />
                <ApContextPanel
                  unreadSmsCount={unreadSmsCount}
                  allowedNavHrefs={allowedNavHrefs}
                />
              </div>
            ) : null}

            <div className="ap-main-column flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <ApTopBar
                shops={shops}
                activeShopId={activeShopId}
                notifications={notifications}
                unreadCount={unreadCount}
                isPlatformAdmin={isPlatformAdmin}
                userDisplayName={userDisplayName}
                userInitials={userInitials}
              />

              {banner ? (
                <div
                  className={cn(
                    "shrink-0 border-b px-3 py-2.5 md:px-4",
                    bannerChrome === "platform" && "ap-banner-platform",
                    bannerChrome === "default" && "ap-border-color bg-muted/35",
                    bannerChrome === "alert" && "border-destructive/30 bg-destructive/5",
                  )}
                >
                  {banner}
                </div>
              ) : null}

              <ApModuleSubnav />

              <main
                className={cn(
                  "flex min-h-0 flex-1 flex-col",
                  fullBleed || roDetailFocus
                    ? "overflow-hidden p-0"
                    : jobBoardViewport
                      ? "overflow-hidden p-3 md:p-4"
                      : fitViewport
                        ? "overflow-auto p-3 md:p-4"
                        : "overflow-auto p-4 md:p-6",
                )}
              >
                <KeyedChildren>{children}</KeyedChildren>
              </main>
            </div>
          </div>

          {persistentSidebar || !ticketFocus ? (
            <ApMobileNav allowedSectionIds={allowedSectionIds} />
          ) : null}
          <SupportWidget />
        </div>
      </TooltipProvider>
    </RoIntakeProvider>
    </ShopCapabilitiesProvider>
  );
}
