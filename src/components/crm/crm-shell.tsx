"use client";

import { Suspense } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { KeyedChildren } from "@/lib/keyed-children";
import { CrmHeader } from "@/components/crm/crm-header";
import { CrmReviewTourChrome } from "@/components/crm/crm-review-tour-chrome";
import {
  CrmMobileSectionNav,
  CrmSecondaryNav,
  CrmSectionSubnav,
} from "@/components/crm/crm-secondary-nav";
import { CreateRoFab } from "@/components/crm/create-ro-fab";
import { RoIntakeProvider } from "@/components/repair-order/ro-intake-context";
import { SupportWidget } from "@/components/support/support-widget";
import type { RoIntakeConfig } from "@/lib/ro-intake-types";
import type { Shop } from "@/lib/shop";
import {
  ShopCapabilitiesProvider,
  type ShopCapabilities,
} from "@/lib/shop-capabilities";
import type { AppNotification } from "@/server/notifications";
import { cn } from "@/lib/utils";

type CrmShellProps = {
  shops: Shop[];
  activeShopId: string;
  notifications: AppNotification[];
  unreadCount?: number;
  unreadSmsCount?: number;
  pathname: string;
  isPlatformAdmin?: boolean;
  showClerkOrgSwitcher?: boolean;
  userDisplayName?: string;
  userInitials?: string;
  banner?: React.ReactNode;
  bannerChrome?: "platform" | "default" | "alert";
  /** When set, nav items not in this list are hidden (server-computed). */
  allowedNavHrefs?: string[];
  allowedSectionIds?: string[];
  intakeConfig?: RoIntakeConfig | null;
  capabilities?: ShopCapabilities;
  children: React.ReactNode;
};

/** ShopRally CRM shell — section-based header + dashboard sidebar. */
export function CrmShell({
  shops,
  activeShopId,
  notifications,
  unreadCount = 0,
  unreadSmsCount = 0,
  pathname,
  isPlatformAdmin = false,
  showClerkOrgSwitcher = false,
  userDisplayName = "Staff",
  userInitials = "ST",
  banner,
  bannerChrome = "default",
  allowedNavHrefs,
  allowedSectionIds,
  intakeConfig = null,
  capabilities = { sms: false, stripePayments: false },
  children,
}: CrmShellProps) {
  const fullBleed =
    pathname === "/workflow" ||
    pathname.startsWith("/design-review/estimate-building") ||
    /\/repair-orders\/[^/]+\/estimate(?:\/|$)/.test(pathname);
  const fitViewport = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const jobBoardViewport = pathname === "/job-board" || pathname === "/tech-board";
  /** RO workspace focus — hide dashboard sidebar (not /repair-orders/new). */
  const roFocusMode = /^\/repair-orders\/(?!new(?:\/|$))[^/]+/.test(pathname);

  const newRoPage = pathname === "/repair-orders/new";

  return (
    <ShopCapabilitiesProvider value={capabilities}>
    <RoIntakeProvider config={intakeConfig}>
    <TooltipProvider delayDuration={0}>
      <Suspense fallback={null}>
      <CrmReviewTourChrome>
      <div className="crm-shell flex min-h-0 flex-1 flex-col overflow-hidden">
        <CrmHeader
          shops={shops}
          activeShopId={activeShopId}
          notifications={notifications}
          unreadCount={unreadCount}
          unreadSmsCount={unreadSmsCount}
          isPlatformAdmin={isPlatformAdmin}
          showClerkOrgSwitcher={showClerkOrgSwitcher}
          userDisplayName={userDisplayName}
          userInitials={userInitials}
          allowedNavHrefs={allowedNavHrefs}
          allowedSectionIds={allowedSectionIds}
        />
        {!roFocusMode ? (
          <CrmMobileSectionNav
            unreadSmsCount={unreadSmsCount}
            allowedNavHrefs={allowedNavHrefs}
          />
        ) : null}
        <div className="crm-body-row flex min-h-0 flex-1 items-stretch">
          {!roFocusMode ? (
            <CrmSecondaryNav
              unreadSmsCount={unreadSmsCount}
              allowedNavHrefs={allowedNavHrefs}
              plannedChangeId={newRoPage ? "INTAKE-04" : undefined}
            />
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {banner ? (
              <div
                className={cn(
                  "shrink-0 border-b px-3 py-2.5 md:px-4",
                  bannerChrome === "platform" && "border-brand-orange/20 p-0",
                  bannerChrome === "default" && "border-border bg-muted/35",
                  bannerChrome === "alert" && "border-destructive/30 bg-destructive/5",
                )}
              >
                {banner}
              </div>
            ) : null}
            {!roFocusMode ? (
              <CrmSectionSubnav
                allowedNavHrefs={allowedNavHrefs}
                allowedSectionIds={allowedSectionIds}
              />
            ) : null}
            <main
              className={cn(
                "flex min-h-0 flex-1 flex-col",
                fullBleed || roFocusMode || newRoPage
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
        <CreateRoFab />
        <SupportWidget />
      </div>
      </CrmReviewTourChrome>
      </Suspense>
    </TooltipProvider>
    </RoIntakeProvider>
    </ShopCapabilitiesProvider>
  );
}
